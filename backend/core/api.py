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

