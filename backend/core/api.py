import decimal
import json
import frozendict
from ninja import Router, Schema, File
from ninja.files import UploadedFile
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.models import User
from .models import UserProfile, Pitch, PitchAttachment
from .tasks import verify_pitch_holdings, update_alpha_scores
import os
import uuid
try:
    from snaptrade_client import SnapTrade  # type: ignore
    from snaptrade_client.schemas import NoneClass, BoolClass, Unset  # type: ignore
except ImportError:
    SnapTrade = type('SnapTrade', (object,), {'__new__': lambda cls, **k: None})
    NoneClass = BoolClass = Unset = type('Missing', (), {})


def sdk_to_python(obj):
    """
    Recursively convert SnapTrade SDK response objects into plain JSON-serializable
    Python types.

    The SDK builds dynamic classes at runtime that actually subclass the real
    Python primitives (frozendict.frozendict, decimal.Decimal, tuple, str).
    NoneClass and BoolClass are NOT subclasses of those primitives so they must
    be checked first.  Unset sentinel values are dropped from dicts/lists.
    """
    if obj is None:
        return None
    if isinstance(obj, Unset):
        return None
    if isinstance(obj, NoneClass):
        return None
    if isinstance(obj, BoolClass):
        return bool(obj)
    # Must check decimal.Decimal before int/float — SDK Decimal subclasses
    # satisfy isinstance(x, decimal.Decimal).
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    if isinstance(obj, (dict, frozendict.frozendict)):
        result = {}
        for k, v in obj.items():
            if isinstance(v, Unset):
                continue
            result[str(k)] = sdk_to_python(v)
        return result
    if isinstance(obj, (list, tuple)):
        return [sdk_to_python(v) for v in obj if not isinstance(v, Unset)]
    # Force plain primitive types — SDK str/int/float subclasses must not leak
    if isinstance(obj, bool):
        return bool(obj)
    if isinstance(obj, str):
        return str(obj)
    if isinstance(obj, int):
        return int(obj)
    if isinstance(obj, float):
        return float(obj)
    # Unknown scalar — coerce to string so the response never explodes
    return str(obj)


def _f(val, fallback=0.0):
    """Safe float coercion for Django DecimalField values."""
    if val is None:
        return fallback
    return float(val)


router = Router()

snaptrade = SnapTrade(
    client_id=os.getenv('SNAPTRADE_CLIENT_ID', 'placeholder_client_id'),
    consumer_key=os.getenv('SNAPTRADE_CONSUMER_KEY', 'placeholder_consumer_key')
)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

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
        return {
            "success": True,
            "user_id": int(user.id),
            "username": str(user.username),
            "snaptrade_connected": bool(profile.snaptrade_secret),
        }
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
    user = User.objects.create_user(
        username=payload.username,
        email=payload.email,
        password=payload.password,
    )
    django_login(request, user)
    UserProfile.objects.get_or_create(user=user)
    return {
        "success": True,
        "user_id": int(user.id),
        "username": str(user.username),
        "snaptrade_connected": False,
    }


# ---------------------------------------------------------------------------
# SnapTrade connection
# ---------------------------------------------------------------------------

@router.post("/snaptrade/connect")
def snaptrade_connect(request):
    """Generates a SnapTrade Connection Portal URL for the logged-in user."""
    if not request.user.is_authenticated:
        return {"error": "Not authenticated"}

    profile = UserProfile.objects.get(user=request.user)

    # Register user with SnapTrade if not already done
    if not profile.snaptrade_secret:
        user_id = str(uuid.uuid4())
        try:
            response = snaptrade.authentication.register_snap_trade_user(user_id=user_id)
            # SDK v11: response.body keys are camelCase
            profile.snaptrade_user_id = response.body['userId']
            profile.snaptrade_secret = response.body['userSecret']
            profile.save()
        except Exception as e:
            return {"error": str(e)}

    try:
        redirect_res = snaptrade.authentication.login_snap_trade_user(
            user_id=str(profile.snaptrade_user_id),
            user_secret=profile.snaptrade_secret,
            connection_type="trade",
            connection_portal_version="v4",
        )
        # SDK v11: redirectURI is camelCase
        return {"redirect_url": str(redirect_res.body['redirectURI'])}
    except Exception as e:
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# Stocks
# ---------------------------------------------------------------------------

@router.get("/stocks/search")
def search_stocks(request, q: str = ""):
    """
    Search stocks by ticker/name for typeahead in the pitch form.
    """
    query = (q or "").strip()
    if len(query) < 1:
        return {"success": True, "results": []}

    try:
        symbols_raw = sdk_to_python(
            snaptrade.reference_data.get_symbols(substring=query).body
        ) or []

        results = []
        for s in symbols_raw[:20]:
            ticker = str(s.get("symbol") or "")
            description = str(s.get("description") or "")
            symbol_id = str(s.get("id") or "")
            if not ticker:
                continue
            results.append({
                "id": symbol_id,
                "ticker": ticker,
                "name": description,
                "label": f"{ticker} — {description}" if description else ticker,
            })

        return {"success": True, "results": results}
    except Exception as e:
        return {"success": False, "error": str(e), "results": []}


# ---------------------------------------------------------------------------
# Pitches
# ---------------------------------------------------------------------------

class PitchCreateSchema(Schema):
    ticker: str
    target_price: float
    content_body: str


@router.post("/pitches")
def create_pitch(request, payload: PitchCreateSchema, deck: UploadedFile = File(None)):
    if not request.user.is_authenticated:
        return {"error": "Not authenticated"}

    profile = UserProfile.objects.get(user=request.user)

    pitch = Pitch.objects.create(
        author=profile,
        ticker=payload.ticker.upper(),
        target_price=payload.target_price,
        content_body=payload.content_body,
        status='ACTIVE',
        is_verified=False,
    )

    if deck:
        attachment = PitchAttachment.objects.create(
            pitch=pitch,
            file=deck,
            file_name=str(getattr(deck, "name", "") or ""),
            file_size_bytes=int(getattr(deck, "size", 0) or 0),
            file_type=str(getattr(deck, "content_type", "") or "application/octet-stream"),
        )

    verify_pitch_holdings.delay(pitch.id)
    return {"success": True, "pitch_id": int(pitch.id)}


class PitchResponseSchema(Schema):
    id: int
    ticker: str
    author_username: str
    target_price: float
    entry_price: float | None
    current_alpha: float
    status: str
    is_verified: bool
    is_mine: bool
    content_body: str
    deck_url: str | None


@router.get("/pitches", response=list[PitchResponseSchema])
def get_pitches(request, search: str = None):
    # Public feed: all ACTIVE pitches (verified and pending), newest first.
    pitches = Pitch.objects.select_related('author__user').prefetch_related('pitchattachment_set').filter(status='ACTIVE').order_by('-created_at')

    if request.user.is_authenticated:
        try:
            profile = UserProfile.objects.get(user=request.user)
            pitches = pitches.exclude(hidden_by__user=profile)
        except UserProfile.DoesNotExist:
            pass


    if search:
        pitches = pitches.filter(
            ticker__icontains=search
        ) | pitches.filter(
            author__user__username__icontains=search
        )
        pitches = pitches.order_by('-created_at')

    response_data = []
    for p in pitches:
        attachment = p.attachments.first()
        response_data.append({
            "id": int(p.id),
            "ticker": str(p.ticker),
            "author_username": str(p.author.user.username),
            "target_price": _f(p.target_price),
            "entry_price": _f(p.entry_price) if p.entry_price else None,
            "current_alpha": _f(p.current_alpha),
            "status": str(p.status),
            "is_verified": bool(p.is_verified),
            "is_mine": bool(
                request.user.is_authenticated and p.author.user_id == request.user.id
            ),
            "content_body": str(p.content_body),
            "deck_url": f"/api/pitches/{int(p.id)}/deck" if attachment and attachment.file_blob else None,
        })

    return response_data

@router.post("/pitches/{pitch_id}/hide")
def hide_pitch(request, pitch_id: int):
    if not request.user.is_authenticated:
        return {"error": "Not authenticated"}
    try:
        profile = UserProfile.objects.get(user=request.user)
        pitch = Pitch.objects.get(id=pitch_id)
        from .models import HiddenPitch
        HiddenPitch.objects.get_or_create(user=profile, pitch=pitch)
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

@router.post("/pitches/restore_all")
def restore_all_pitches(request):
    if not request.user.is_authenticated:
        return {"error": "Not authenticated"}
    try:
        profile = UserProfile.objects.get(user=request.user)
        from .models import HiddenPitch
        HiddenPitch.objects.filter(user=profile).delete()
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# Trading — impact check
# ---------------------------------------------------------------------------

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

        eastern = timezone('US/Eastern')
        now = datetime.datetime.now(eastern)
        is_market_open = True
        if now.weekday() >= 5:
            is_market_open = False
        elif now.time() < datetime.time(9, 30) or now.time() > datetime.time(16, 0):
            is_market_open = False

        # 1. Accounts — convert entire body to plain Python immediately
        accounts_raw = sdk_to_python(
            snaptrade.account_information.list_user_accounts(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret,
            ).body
        )
        if not accounts_raw:
            return {"error": "No brokerage accounts found"}

        account_id = str(accounts_raw[0]['id'])

        # 2. Symbol search — convert entire body immediately
        symbols_raw = sdk_to_python(
            snaptrade.reference_data.symbol_search_user_account(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret,
                account_id=account_id,
                substring=pitch.ticker,
            ).body
        )
        if not symbols_raw:
            return {"error": f"Symbol {pitch.ticker} not tradable on this brokerage"}

        symbol_id = str(symbols_raw[0]['id'])

        # 3. Order impact — convert entire body immediately
        impact_raw = sdk_to_python(
            snaptrade.trading.get_order_impact(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret,
                account_id=account_id,
                action="BUY",
                order_type="Market",
                time_in_force="Day",
                universal_symbol_id=symbol_id,
                units=1.0,
            ).body
        )

        trade = impact_raw.get('trade') or {}
        trade_impacts = impact_raw.get('trade_impacts') or []
        first_impact = trade_impacts[0] if trade_impacts else {}

        # price field on the trade object is the limit/stop price — for a market
        # order use remaining_cash diff; fall back gracefully to None
        estimated_price_raw = trade.get('price') or first_impact.get('remaining_cash')
        estimated_commissions_raw = first_impact.get('estimated_commission') or 0.0

        # Validate the assembled response is serializable before returning
        response = {
            "success": True,
            "impact": {
                "estimated_execution_price": float(estimated_price_raw) if estimated_price_raw is not None else None,
                "estimated_commissions": float(estimated_commissions_raw),
                "trade_id": str(trade.get('id') or ''),
            },
            "account": {"id": account_id},
            "is_market_open": bool(is_market_open),
        }

        # Hard-validate before handing back to Ninja so errors are informative
        try:
            json.dumps(response)
        except TypeError as je:
            return {"error": f"Serialization bug — please report: {je}"}

        return response

    except Pitch.DoesNotExist:
        return {"error": "Pitch not found"}
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}


# ---------------------------------------------------------------------------
# Trading — execute buy
# ---------------------------------------------------------------------------

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

        symbols_raw = sdk_to_python(
            snaptrade.reference_data.symbol_search_user_account(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret,
                account_id=str(payload.account_id),
                substring=pitch.ticker,
            ).body
        )
        if not symbols_raw:
            return {"error": f"Symbol {pitch.ticker} not tradable on this brokerage"}

        symbol_id = str(symbols_raw[0]['id'])

        place_raw = sdk_to_python(
            snaptrade.trading.place_force_order(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret,
                account_id=str(payload.account_id),
                action="BUY",
                order_type="Market",
                time_in_force="Day",
                universal_symbol_id=symbol_id,
                units=float(payload.units),
            ).body
        )

        order_id = str(place_raw.get('brokerage_order_id') or place_raw.get('id') or 'unknown')

        # TradeEvent model fields: reader, pitch, order_id, revenue_generated
        from .models import TradeEvent
        TradeEvent.objects.create(
            reader=profile,
            pitch=pitch,
            order_id=order_id,
            revenue_generated=0.0,
        )

        return {"success": True, "order_id": order_id}

    except Pitch.DoesNotExist:
        return {"error": "Pitch not found"}
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}


# ---------------------------------------------------------------------------
# Author profile
# ---------------------------------------------------------------------------

@router.get("/author/{username}")
def get_author_profile(request, username: str):
    from django.db.models import Avg

    try:
        user = User.objects.get(username=username)
        # author is a FK to UserProfile; filter via author__user
        pitches = Pitch.objects.select_related('author__user').prefetch_related('pitchattachment_set').filter(author__user=user).order_by('-created_at')

        total_pitches = int(pitches.count())
        win_count = int(pitches.filter(current_alpha__gt=0).count())
        win_rate = (win_count / total_pitches * 100) if total_pitches > 0 else 0.0
        avg_alpha = _f(pitches.aggregate(avg=Avg('current_alpha'))['avg'])

        return {
            "author": {
                "username": str(user.username),
                "win_rate": float(win_rate),
                "avg_alpha": float(avg_alpha),
                "total_pitches": total_pitches,
            },
            "pitches": [
                {
                    "id": int(p.id),
                    "ticker": str(p.ticker),
                    "target_price": _f(p.target_price),
                    "entry_price": _f(p.entry_price) if p.entry_price else None,
                    "current_alpha": _f(p.current_alpha),
                    "status": str(p.status),
                    "created_at": p.created_at.isoformat(),
                }
                for p in pitches
            ],
        }
    except User.DoesNotExist:
        return {"error": "Author not found"}


# ---------------------------------------------------------------------------
# My pitches + analytics (authenticated)
# ---------------------------------------------------------------------------

@router.get("/my/pitches")
def get_my_pitches_analytics(request):
    from django.db.models import Avg

    if not request.user.is_authenticated:
        return {"error": "Not authenticated"}

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    pitches = Pitch.objects.select_related('author__user').prefetch_related('pitchattachment_set').filter(author=profile).order_by('-created_at')

    total_pitches = int(pitches.count())
    active_pitches = int(pitches.filter(status='ACTIVE').count())
    verified_pitches = int(pitches.filter(is_verified=True).count())
    closed_pitches = int(pitches.exclude(status='ACTIVE').count())
    win_count = int(pitches.filter(current_alpha__gt=0).count())

    win_rate = (win_count / total_pitches * 100) if total_pitches > 0 else 0.0
    avg_alpha = _f(pitches.aggregate(avg=Avg('current_alpha'))['avg'])

    return {
        "author": {
            "username": str(request.user.username),
            "total_pitches": total_pitches,
            "active_pitches": active_pitches,
            "verified_pitches": verified_pitches,
            "closed_pitches": closed_pitches,
            "win_rate": float(win_rate),
            "avg_alpha": float(avg_alpha),
            "total_alpha": _f(profile.total_alpha),
        },
        "pitches": [
            {
                "id": int(p.id),
                "ticker": str(p.ticker),
                "target_price": _f(p.target_price),
                "entry_price": _f(p.entry_price) if p.entry_price else None,
                "current_alpha": _f(p.current_alpha),
                "status": str(p.status),
                "is_verified": bool(p.is_verified),
                "content_body": str(p.content_body),
                "created_at": p.created_at.isoformat(),
                "deck_url": f"/api/pitches/{int(p.id)}/deck" if p.attachments.first() and p.attachments.first().file_blob else None,
            }
            for p in pitches
        ],
    }


@router.get("/pitches/{pitch_id}/deck")
def get_pitch_deck(request, pitch_id: int):
    try:
        pitch = Pitch.objects.get(id=pitch_id)
        attachment = pitch.attachments.first()
        if not attachment or not attachment.file_blob:
            return {"error": "Deck not found"}

        from django.http import HttpResponse

        raw_type = str(attachment.file_type or "").lower().strip()
        filename = str(attachment.file_name or f"pitch_{pitch_id}_deck")

        # Favor browser-previewable content types so embeds render inline.
        if "pdf" in raw_type or filename.lower().endswith(".pdf"):
            content_type = "application/pdf"
        elif "powerpoint" in raw_type or filename.lower().endswith(".pptx"):
            content_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        elif "presentation" in raw_type or filename.lower().endswith(".ppt"):
            content_type = "application/vnd.ms-powerpoint"
        else:
            content_type = "application/octet-stream"

        response = HttpResponse(bytes(attachment.file_blob), content_type=content_type)

        # Inline disposition prevents attachment-style auto-download in iframes.
        response["Content-Disposition"] = f'inline; filename="{filename}"'

        # Prevent MIME sniffing issues and allow same-origin iframe rendering.
        response["X-Content-Type-Options"] = "nosniff"
        response["Cross-Origin-Resource-Policy"] = "same-origin"

        return response
    except Pitch.DoesNotExist:
        return {"error": "Pitch not found"}


# ---------------------------------------------------------------------------
# Portfolio
# ---------------------------------------------------------------------------

@router.get("/portfolio")
def get_portfolio(request):
    if not request.user.is_authenticated:
        return {"error": "Not authenticated"}

    profile = UserProfile.objects.get(user=request.user)
    if not profile.snaptrade_secret or not profile.snaptrade_user_id:
        return {"error": "SnapTrade account not connected"}

    try:
        accounts_raw = sdk_to_python(
            snaptrade.account_information.list_user_accounts(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret,
            ).body
        )
        if not accounts_raw:
            return {"success": True, "portfolio": []}

        portfolio = []
        for account in accounts_raw:
            acc_id = str(account['id'])
            acc_name = str(account.get('name') or '')

            holdings_raw = sdk_to_python(
                snaptrade.account_information.get_user_holdings(
                    user_id=str(profile.snaptrade_user_id),
                    user_secret=profile.snaptrade_secret,
                    account_id=acc_id,
                ).body
            )

            # SnapTrade response shape can vary by brokerage/SDK version.
            # Support multiple known structures and expose parse debug counters.
            raw_positions = (
                holdings_raw.get('positions')
                or (holdings_raw.get('account') or {}).get('positions')
                or (holdings_raw.get('holdings') or {}).get('positions')
                or []
            )

            positions = []
            for pos in raw_positions:
                pos_symbol = pos.get('symbol') or {}

                # Try multiple symbol paths observed across responses.
                ticker = (
                    ((pos_symbol.get('symbol') or {}).get('symbol'))
                    or pos_symbol.get('ticker')
                    or pos.get('ticker')
                    or ''
                )

                positions.append({
                    "ticker": str(ticker or ''),
                    "units": float(pos.get('units') or 0),
                    "price": float(pos.get('price') or 0),
                    "average_purchase_price": float(pos.get('average_purchase_price') or pos.get('average_price') or 0),
                    "open_pnl": float(pos.get('open_pnl') or pos.get('unrealized_pnl') or 0),
                })

            balances = []
            for bal in (holdings_raw.get('balances') or []):
                currency = bal.get('currency') or {}
                balances.append({
                    "currency": str(currency.get('code') or ''),
                    "cash": float(bal.get('cash') or 0),
                })

            portfolio.append({
                "account_id": acc_id,
                "account_name": acc_name,
                "positions": positions,
                "balances": balances,
                "debug": {
                    "raw_positions_count": int(len(raw_positions)),
                    "parsed_positions_count": int(len(positions)),
                },
            })

        return {"success": True, "portfolio": portfolio}

    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}


# ---------------------------------------------------------------------------
# Trading — execute sell
# ---------------------------------------------------------------------------

class SellTradeSchema(Schema):
    account_id: str
    symbol: str
    units: float


@router.post("/trade/sell")
def sell_trade(request, payload: SellTradeSchema):
    if not request.user.is_authenticated:
        return {"error": "Not authenticated"}

    try:
        profile = UserProfile.objects.get(user=request.user)
        if not profile.snaptrade_secret or not profile.snaptrade_user_id:
            return {"error": "SnapTrade account not connected"}

        symbols_raw = sdk_to_python(
            snaptrade.reference_data.symbol_search_user_account(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret,
                account_id=str(payload.account_id),
                substring=payload.symbol,
            ).body
        )
        if not symbols_raw:
            return {"error": f"Symbol {payload.symbol} not tradable on this brokerage"}

        symbol_id = str(symbols_raw[0]['id'])

        place_raw = sdk_to_python(
            snaptrade.trading.place_force_order(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret,
                account_id=str(payload.account_id),
                action="SELL",
                order_type="Market",
                time_in_force="Day",
                universal_symbol_id=symbol_id,
                units=float(payload.units),
            ).body
        )

        order_id = str(place_raw.get('brokerage_order_id') or place_raw.get('id') or 'unknown')
        return {"success": True, "order_id": order_id}

    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}


# ---------------------------------------------------------------------------
# Alpha refresh (manual trigger)
# ---------------------------------------------------------------------------

@router.post("/alpha/refresh")
def refresh_alpha(request):
    """Run a synchronous Finnhub alpha update for all active verified pitches."""
    if not request.user.is_authenticated:
        return {"error": "Not authenticated"}

    try:
        update_alpha_scores.delay()
        return {"success": True, "message": "Alpha scores dispatched for background refresh via Finnhub"}
    except Exception as e:
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# Portfolio history (for charts)
# ---------------------------------------------------------------------------

@router.get("/portfolio/history")
def get_portfolio_history(request):
    """Fetch portfolio activities and return-rate history from SnapTrade."""
    if not request.user.is_authenticated:
        return {"error": "Not authenticated"}

    profile = UserProfile.objects.get(user=request.user)
    if not profile.snaptrade_secret or not profile.snaptrade_user_id:
        return {"error": "SnapTrade account not connected"}

    user_id = str(profile.snaptrade_user_id)
    user_secret = profile.snaptrade_secret

    try:
        accounts_raw = sdk_to_python(
            snaptrade.account_information.list_user_accounts(
                user_id=user_id,
                user_secret=user_secret,
            ).body
        )
        if not accounts_raw:
            return {"success": True, "return_rates": [], "activities": []}

        all_return_rates = []
        all_activities = []

        for account in accounts_raw:
            acc_id = str(account['id'])

            # --- Return rates (performance timeline) ---
            try:
                rates_raw = sdk_to_python(
                    snaptrade.account_information.get_user_account_return_rates(
                        user_id=user_id,
                        user_secret=user_secret,
                        account_id=acc_id,
                    ).body
                )
                if rates_raw and isinstance(rates_raw, dict):
                    # rates_raw has keys like 'data' containing time-series
                    data_points = rates_raw.get('data') or rates_raw.get('timeWeightedReturn') or []
                    if isinstance(data_points, list):
                        for dp in data_points:
                            all_return_rates.append({
                                "date": str(dp.get('date') or dp.get('period_start') or ''),
                                "return_pct": float(dp.get('return') or dp.get('return_pct') or dp.get('value') or 0),
                                "account_id": acc_id,
                            })
                    elif isinstance(data_points, dict):
                        # Single-value structure
                        all_return_rates.append({
                            "date": str(data_points.get('date') or ''),
                            "return_pct": float(data_points.get('return') or 0),
                            "account_id": acc_id,
                        })
            except Exception as e:
                print(f"Return rates unavailable for {acc_id}: {e}")

            # --- Activities (transaction history) ---
            try:
                activities_raw = sdk_to_python(
                    snaptrade.transactions_and_reporting.get_activities(
                        user_id=user_id,
                        user_secret=user_secret,
                        account_id=acc_id,
                    ).body
                )
                if activities_raw and isinstance(activities_raw, list):
                    for act in activities_raw[:50]:  # Limit to recent 50
                        all_activities.append({
                            "date": str(act.get('trade_date') or act.get('settlement_date') or ''),
                            "type": str(act.get('type') or ''),
                            "description": str(act.get('description') or ''),
                            "symbol": str((act.get('symbol') or {}).get('symbol') or act.get('ticker') or ''),
                            "amount": float(act.get('amount') or 0),
                            "units": float(act.get('units') or act.get('quantity') or 0),
                            "price": float(act.get('price') or 0),
                            "account_id": acc_id,
                        })
            except Exception as e:
                print(f"Activities unavailable for {acc_id}: {e}")

        from .models import PortfolioSnapshot
        snapshots = PortfolioSnapshot.objects.filter(user=profile).order_by('date')
        snapshot_data = [{"date": s.date.isoformat(), "value": _f(s.total_value)} for s in snapshots]

        return {
            "success": True,
            "return_rates": all_return_rates,
            "activities": all_activities,
            "snapshots": snapshot_data,
        }

    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}
