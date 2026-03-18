from ninja import Router, Schema, File
from ninja.files import UploadedFile
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.models import User
from .models import UserProfile, Pitch, PitchAttachment
from .tasks import verify_pitch_holdings
from ninja import Schema
import os
import uuid
from snaptrade_client import SnapTrade # type: ignore

router = Router()

snaptrade = SnapTrade(
    client_id=os.getenv('SNAPTRADE_CLIENT_ID', 'placeholder_client_id'),
    consumer_key=os.getenv('SNAPTRADE_CONSUMER_KEY', 'placeholder_consumer_key')
)

class LoginSchema(Schema):
    username: str
    password: str

class AuthResponse(Schema):
    success: bool
    user_id: int | None = None
    username: str | None = None
    snaptrade_connected: bool = False

@router.post("/login", response=AuthResponse)
def login(request, payload: LoginSchema):
    user = authenticate(request, username=payload.username, password=payload.password)
    if user is not None:
        django_login(request, user)
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return {"success": True, "user_id": user.id, "username": user.username, "snaptrade_connected": bool(profile.snaptrade_secret)}
    return {"success": False}

@router.post("/logout")
def logout(request):
    django_logout(request)
    return {"success": True}

class CreateUserSchema(Schema):
    username: str
    password: str
    email: str

@router.post("/signup", response=AuthResponse)
def signup(request, payload: CreateUserSchema):
    if User.objects.filter(username=payload.username).exists():
        return {"success": False}
    user = User.objects.create_user(username=payload.username, email=payload.email, password=payload.password)
    django_login(request, user)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return {"success": True, "user_id": user.id, "username": user.username, "snaptrade_connected": False}

@router.post("/snaptrade/connect")
def snaptrade_connect(request):
    """
    Generates a SnapTrade Connection Portal URL for the logged-in user.
    """
    if not request.user.is_authenticated:
        return {"error": "Not authenticated"}
    
    profile = UserProfile.objects.get(user=request.user)
    
    # Register user with SnapTrade if not already done
    if not profile.snaptrade_secret:
        user_id = str(profile.user.username) + "-" + str(uuid.uuid4())[:8]
        try:
            response = snaptrade.authentication.register_snap_trade_user(
                user_id=user_id
            )
            # Response in Python SDK usually uses dot notation or dict depending on versions.
            try:
                profile.snaptrade_user_id = response.body['userId']
                profile.snaptrade_secret = response.body['userSecret']
            except TypeError:
                profile.snaptrade_user_id = response.user_id
                profile.snaptrade_secret = response.user_secret
            profile.save()
        except Exception as e:
            return {"error": str(e)}

    # Generate redirect URL
    try:
        redirect_res = snaptrade.authentication.login_snap_trade_user(
            user_id=str(profile.snaptrade_user_id),
            user_secret=profile.snaptrade_secret,
            connection_type="trade", 
            connection_portal_version="v4"
        )
        try:
            return {"redirect_url": redirect_res.body['redirectURI']}
        except TypeError:
            return {"redirect_url": redirect_res.redirect_uri}
    except Exception as e:
        return {"error": str(e)}

class PitchCreateSchema(Schema):
    ticker: str
    target_price: float
    content_body: str

@router.post("/pitches")
def create_pitch(request, payload: PitchCreateSchema, deck: UploadedFile = File(None)):
    if not request.user.is_authenticated:
        return {"error": "Not authenticated"}

    profile = UserProfile.objects.get(user=request.user)

    # Create the unverified Pitch
    pitch = Pitch.objects.create(
        author=profile,
        ticker=payload.ticker.upper(),
        target_price=payload.target_price,
        content_body=payload.content_body,
        status='ACTIVE',
        is_verified=False
    )

    # Handle file upload if present
    if deck:
        from django.core.files.storage import default_storage
        file_path = default_storage.save(f"pitches/{pitch.id}/{deck.name}", deck)
        file_url = default_storage.url(file_path)
        
        PitchAttachment.objects.create(
            pitch=pitch,
            file_url=file_url,
            file_type=deck.content_type
        )

    # Trigger Async Celery Task for Verification
    verify_pitch_holdings.delay(pitch.id)

    return {"success": True, "pitch_id": pitch.id}

class PitchResponseSchema(Schema):
    id: int
    ticker: str
    author_username: str
    target_price: float
    entry_price: float | None
    current_alpha: float
    status: str
    content_body: str
    deck_url: str | None

@router.get("/pitches", response=list[PitchResponseSchema])
def get_pitches(request, search: str = None):
    pitches = Pitch.objects.filter(status='ACTIVE', is_verified=True).order_by('-created_at')
    
    if search:
        pitches = pitches.filter(ticker__icontains=search) | pitches.filter(author__user__username__icontains=search)
        
    response_data = []
    for p in pitches:
        attachment = p.attachments.first()
        deck_url = attachment.file_url if attachment else None
        
        response_data.append({
            "id": p.id,
            "ticker": p.ticker,
            "author_username": p.author.user.username,
            "target_price": float(p.target_price),
            "entry_price": float(p.entry_price) if p.entry_price else None,
            "current_alpha": float(p.current_alpha),
            "status": p.status,
            "content_body": p.content_body,
            "deck_url": deck_url
        })
        
    return response_data

@router.get("/trade/impact/{pitch_id}")
def get_pre_trade_impact(request, pitch_id: int):
    if not request.user.is_authenticated:
        return {"error": "Not authenticated"}

    try:
        profile = UserProfile.objects.get(user=request.user)
        if not profile.snaptrade_secret or not profile.snaptrade_user_id:
             return {"error": "SnapTrade account not connected"}

        pitch = Pitch.objects.get(id=pitch_id)

        import datetime
        from pytz import timezone
        import pytz

        eastern = timezone('US/Eastern')
        now = datetime.datetime.now(eastern)
        is_market_open = True
        if now.weekday() >= 5: # Saturday or Sunday
            is_market_open = False
        elif now.time() < datetime.time(9, 30) or now.time() > datetime.time(16, 0):
            is_market_open = False

        # 1. Get Accounts
        accounts_res = snaptrade.account_information.list_user_accounts(
            user_id=str(profile.snaptrade_user_id),
            user_secret=profile.snaptrade_secret
        )
        accounts = accounts_res.body if hasattr(accounts_res, 'body') else accounts_res
        if not accounts:
             return {"error": "No brokerage accounts found"}
        
        # Use first account directly for 1-Click simplicity
        account = accounts[0]
        account_id = account.get('id') if isinstance(account, dict) else account.id

        # 2. Search Symbol within Account
        search_res = snaptrade.reference_data.symbol_search_user_account(
            user_id=str(profile.snaptrade_user_id),
            user_secret=profile.snaptrade_secret,
            account_id=account_id,
            query=pitch.ticker
        )
        search_data = search_res.body if hasattr(search_res, 'body') else search_res
        if not search_data:
             return {"error": f"Symbol {pitch.ticker} not tradable on this brokerage"}
             
        symbol_obj = search_data[0]
        symbol_id = symbol_obj.get('id') if isinstance(symbol_obj, dict) else symbol_obj.id

        # 3. Get Order Impact
        from snaptrade_client import ManualTradeForm # type: ignore
        order_form = ManualTradeForm(
             account_id=account_id,
             action="BUY",
             order_type="Market",
             time_in_force="FOK", # Fill Or Kill
             universal_symbol_id=symbol_id,
             units=1 # Default 1 share for impact calculation
        )

        impact_res = snaptrade.trading.get_order_impact(
            user_id=str(profile.snaptrade_user_id),
            user_secret=profile.snaptrade_secret,
            manual_trade_form=order_form
        )
        
        impact = impact_res.body if hasattr(impact_res, 'body') else impact_res
        return {
            "success": True, 
            "impact": impact, 
            "account": {"id": account_id},
            "is_market_open": is_market_open
        }

    except Pitch.DoesNotExist:
        return {"error": "Pitch not found"}
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}


class ExecuteTradeSchema(Schema):
    account_id: str
    units: float = 1.0

@router.post("/trade/execute/{pitch_id}")
def execute_trade(request, pitch_id: int, payload: ExecuteTradeSchema):
    if not request.user.is_authenticated:
        return {"error": "Not authenticated"}

    try:
        profile = UserProfile.objects.get(user=request.user)
        if not profile.snaptrade_secret or not profile.snaptrade_user_id:
             return {"error": "SnapTrade account not connected"}

        pitch = Pitch.objects.get(id=pitch_id)

        search_res = snaptrade.reference_data.symbol_search_user_account(
            user_id=str(profile.snaptrade_user_id),
            user_secret=profile.snaptrade_secret,
            account_id=payload.account_id,
            query=pitch.ticker
        )
        search_data = search_res.body if hasattr(search_res, 'body') else search_res
        if not search_data:
             return {"error": f"Symbol {pitch.ticker} not tradable on this brokerage"}
             
        symbol_obj = search_data[0]
        symbol_id = symbol_obj.get('id') if isinstance(symbol_obj, dict) else symbol_obj.id

        from snaptrade_client import ManualTradeForm # type: ignore
        order_form = ManualTradeForm(
             account_id=payload.account_id,
             action="BUY",
             order_type="Market",
             time_in_force="Day", # "Day" is standard for queued Alpaca/general Market orders
             universal_symbol_id=symbol_id,
             units=payload.units
        )

        place_res = snaptrade.trading.place_order(
             user_id=str(profile.snaptrade_user_id),
             user_secret=profile.snaptrade_secret,
             trade_id=str(uuid.uuid4()), # Need a unique trade ID for idempotent request (might not be strict on python sdk)
             manual_trade_form=order_form
        )

        place_data = place_res.body if hasattr(place_res, 'body') else place_res

        from .models import TradeEvent
        TradeEvent.objects.create(
            user=profile,
            pitch=pitch,
            snaptrade_order_id=str(place_data.get('order_id', place_data.get('id', 'unknown'))),
            shares_executed=payload.units,
            execution_price=0.0 # Will be populated by webhook later in prod
        )
        
        return {"success": True, "order": place_data}

    except Pitch.DoesNotExist:
        return {"error": "Pitch not found"}
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}



