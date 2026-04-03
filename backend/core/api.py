import decimal
import json
import frozendict
import uuid
import time
import datetime
import logging
import traceback as tb_module

from pytz import timezone
from ninja import Router, File
from ninja.files import UploadedFile
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.http import HttpResponseRedirect
from django.views.decorators.clickjacking import xframe_options_exempt

from .models import (
    UserProfile,
    Pitch,
    PitchAttachment,
    HiddenPitch,
    TradeEvent,
    PortfolioSnapshot,
)
from .clients import snaptrade
from .tasks import verify_pitch_holdings
from .schemas import (
    LoginSchema,
    CreateUserSchema,
    AuthResponse,
    PitchCreateSchema,
    PitchResponseSchema,
    ExecuteTradeSchema,
    SellTradeSchema,
)

try:
    from snaptrade_client.schemas import NoneClass, BoolClass, Unset  # type: ignore
except ImportError:
    NoneClass = BoolClass = Unset = type("Missing", (), {})

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rate limiting (simple in-memory, per-IP)
# ---------------------------------------------------------------------------

_rate_limits: dict[str, list[float]] = {}
_RATE_LIMIT_WINDOW = 60  # seconds
_RATE_LIMIT_MAX = 5  # attempts per window


def _check_rate_limit(ip: str) -> bool:
    """Return True if the request is allowed, False if rate-limited."""
    import time as _time

    now = _time.time()
    window_start = now - _RATE_LIMIT_WINDOW
    attempts = _rate_limits.get(ip, [])
    attempts = [t for t in attempts if t > window_start]
    if len(attempts) >= _RATE_LIMIT_MAX:
        _rate_limits[ip] = attempts
        return False
    attempts.append(now)
    _rate_limits[ip] = attempts
    return True


def _get_client_ip(request) -> str:
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def sdk_to_python(obj):
    """
    Recursively convert SnapTrade SDK response objects into plain JSON-serializable
    Python types.
    """
    if obj is None:
        return None
    if isinstance(obj, Unset):
        return None
    if isinstance(obj, NoneClass):
        return None
    if isinstance(obj, BoolClass):
        return bool(obj)
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
    if isinstance(obj, bool):
        return bool(obj)
    if isinstance(obj, str):
        return str(obj)
    if isinstance(obj, int):
        return int(obj)
    if isinstance(obj, float):
        return float(obj)
    return str(obj)


def _f(val, fallback=0.0):
    """Safe float coercion for Django DecimalField values."""
    if val is None:
        return fallback
    return float(val)


def _api_error(message: str, status_code: int = 400):
    """Return a safe error dict without exposing internals."""
    return {"error": message}


router = Router()


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


@router.post("/login", response=AuthResponse, auth=None)
def login(request, payload: LoginSchema):
    ip = _get_client_ip(request)
    if not _check_rate_limit(ip):
        return _api_error(
            "Too many login attempts. Please try again later.", status_code=429
        )

    user = authenticate(request, username=payload.username, password=payload.password)
    if user is not None:
        profile, _ = UserProfile.objects.get_or_create(user=user)
        token = profile.auth_token or profile.rotate_token()
        return {
            "success": True,
            "user_id": int(user.id),
            "username": str(user.username),
            "snaptrade_connected": bool(profile.snaptrade_secret),
            "token": token,
        }
    return _api_error("Invalid credentials")


@router.post("/logout")
def logout(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.auth_token = None
    profile.save(update_fields=["auth_token"])
    return {"success": True}


@router.post("/signup", response=AuthResponse, auth=None)
def signup(request, payload: CreateUserSchema):
    ip = _get_client_ip(request)
    if not _check_rate_limit(ip):
        return _api_error(
            "Too many signup attempts. Please try again later.", status_code=429
        )

    if User.objects.filter(username=payload.username).exists():
        return _api_error("Username already exists")
    user = User.objects.create_user(
        username=payload.username,
        email=payload.email,
        password=payload.password,
    )
    profile, _ = UserProfile.objects.get_or_create(user=user)
    token = profile.rotate_token()
    return {
        "success": True,
        "user_id": int(user.id),
        "username": str(user.username),
        "snaptrade_connected": False,
        "token": token,
    }


# ---------------------------------------------------------------------------
# SnapTrade connection
# ---------------------------------------------------------------------------


@router.post("/snaptrade/connect")
def snaptrade_connect(request):
    """Generates a SnapTrade Connection Portal URL for the logged-in user."""

    profile = UserProfile.objects.get(user=request.user)

    if not profile.snaptrade_secret:
        user_id = str(uuid.uuid4())
        try:
            response = snaptrade.authentication.register_snap_trade_user(
                user_id=user_id
            )
            profile.snaptrade_user_id = response.body["userId"]
            profile.snaptrade_secret = response.body["userSecret"]
            profile.save()
        except Exception as e:
            err_str = str(e)
            if (
                "Personal keys can only register one user" in err_str
                or "1012" in err_str
            ):
                try:
                    users_res = snaptrade.authentication.list_snap_trade_users()
                    users_list = getattr(users_res, "body", users_res)
                    if not isinstance(users_list, list):
                        users_list = [users_list] if users_list else []

                    for old_uid in users_list:
                        uid_str = (
                            old_uid.get("userId")
                            if isinstance(old_uid, dict)
                            else str(old_uid)
                        )
                        if uid_str:
                            snaptrade.authentication.delete_snap_trade_user(
                                user_id=uid_str
                            )

                    time.sleep(1.5)

                    retry_res = snaptrade.authentication.register_snap_trade_user(
                        user_id=user_id
                    )
                    retry_body = getattr(retry_res, "body", retry_res)
                    profile.snaptrade_user_id = retry_body["userId"]
                    profile.snaptrade_secret = retry_body["userSecret"]
                    profile.save()
                except Exception as inner_e:
                    logger.exception("Failed to reset personal key space")
                    return _api_error(
                        "Failed to reset personal key space. Please try again later."
                    )
            else:
                logger.exception("SnapTrade registration error")
                return _api_error(err_str)

    try:
        redirect_res = snaptrade.authentication.login_snap_trade_user(
            user_id=str(profile.snaptrade_user_id),
            user_secret=profile.snaptrade_secret,
            connection_type="trade",
            connection_portal_version="v4",
        )
        return {"redirect_url": str(redirect_res.body["redirectURI"])}
    except Exception as e:
        logger.exception("SnapTrade login error")
        return _api_error(str(e))


# ---------------------------------------------------------------------------
# Stocks
# ---------------------------------------------------------------------------


@router.get("/stocks/search", auth=None)
def search_stocks(request, q: str = ""):
    query = (q or "").strip()
    if len(query) < 1:
        return {"success": True, "results": []}

    try:
        symbols_raw = (
            sdk_to_python(snaptrade.reference_data.get_symbols(substring=query).body)
            or []
        )

        results = []
        for s in symbols_raw[:20]:
            ticker = str(s.get("symbol") or "")
            description = str(s.get("description") or "")
            symbol_id = str(s.get("id") or "")
            if not ticker:
                continue
            results.append(
                {
                    "id": symbol_id,
                    "ticker": ticker,
                    "name": description,
                    "label": f"{ticker} — {description}" if description else ticker,
                }
            )

        return {"success": True, "results": results}
    except Exception as e:
        logger.exception("Stock search error")
        return {"success": False, "error": str(e), "results": []}


# ---------------------------------------------------------------------------
# Pitches
# ---------------------------------------------------------------------------


@router.post("/pitches")
def create_pitch(request, payload: PitchCreateSchema, deck: UploadedFile = File(None)):
    MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
    if deck and deck.size > MAX_UPLOAD_BYTES:
        return _api_error(
            f"File too large. Maximum size is 10 MB, got {deck.size / (1024 * 1024):.1f} MB."
        )

    profile = UserProfile.objects.get(user=request.user)

    pitch = Pitch.objects.create(
        author=profile,
        ticker=payload.ticker.upper(),
        target_price=payload.target_price,
        content_body=payload.content_body,
        status="ACTIVE",
        is_verified=False,
    )

    if deck:
        PitchAttachment.objects.create(
            pitch=pitch,
            file=deck,
            file_name=str(getattr(deck, "name", "") or ""),
            file_size_bytes=int(getattr(deck, "size", 0) or 0),
            file_type=str(
                getattr(deck, "content_type", "") or "application/octet-stream"
            ),
        )

    try:
        verify_pitch_holdings.delay(pitch.id)
    except Exception as e:
        logger.warning("Celery task dispatch failed, running synchronously: %s", e)
        try:
            verify_pitch_holdings(pitch.id)
        except Exception as sync_e:
            logger.error("Sync verification failed: %s", sync_e)

    return {"success": True, "pitch_id": int(pitch.id)}


def _pitch_to_dict(p, request_user) -> dict:
    """Convert a Pitch instance to a response dict. Uses prefetched attachments."""
    attachment = next(iter(p.attachments.all()), None) if p.attachments else None
    return {
        "id": int(p.id),
        "ticker": str(p.ticker),
        "author_username": str(p.author.user.username),
        "target_price": _f(p.target_price),
        "entry_price": _f(p.entry_price) if p.entry_price else None,
        "status": str(p.status),
        "is_verified": bool(p.is_verified),
        "is_mine": bool(
            request_user.is_authenticated and p.author.user_id == request_user.id
        ),
        "content_body": str(p.content_body),
        "deck_url": f"/api/pitches/{int(p.id)}/deck"
        if attachment and attachment.file
        else None,
    }


@router.get("/pitches", response=list[PitchResponseSchema], auth=None)
def get_pitches(request, search: str = None):
    pitches = (
        Pitch.objects.select_related("author__user")
        .prefetch_related("attachments")
        .filter(status="ACTIVE")
        .order_by("-created_at")
    )

    if request.user.is_authenticated:
        try:
            profile = UserProfile.objects.get(user=request.user)
            pitches = pitches.exclude(hidden_by__user=profile)
        except UserProfile.DoesNotExist:
            pass

    if search:
        pitches = (
            (
                pitches.filter(ticker__icontains=search)
                | pitches.filter(author__user__username__icontains=search)
            )
            .distinct()
            .order_by("-created_at")
        )

    return [_pitch_to_dict(p, request.user) for p in pitches]


@router.post("/pitches/{pitch_id}/hide")
def hide_pitch(request, pitch_id: int):
    try:
        profile = UserProfile.objects.get(user=request.user)
        pitch = Pitch.objects.get(id=pitch_id)
        HiddenPitch.objects.get_or_create(user=profile, pitch=pitch)
        return {"success": True}
    except Pitch.DoesNotExist:
        return _api_error("Pitch not found")
    except UserProfile.DoesNotExist:
        return _api_error("User profile not found")
    except Exception as e:
        logger.exception("Hide pitch error")
        return _api_error(str(e))


@router.post("/pitches/restore_all")
def restore_all_pitches(request):
    try:
        profile = UserProfile.objects.get(user=request.user)
        HiddenPitch.objects.filter(user=profile).delete()
        return {"success": True}
    except UserProfile.DoesNotExist:
        return _api_error("User profile not found")
    except Exception as e:
        logger.exception("Restore pitches error")
        return _api_error(str(e))


@router.get("/pitches/{pitch_id}/deck", auth=None)
@xframe_options_exempt
def get_pitch_deck(request, pitch_id: int):
    try:
        pitch = Pitch.objects.get(id=pitch_id)
        attachment = pitch.attachments.first()

        if attachment and attachment.file:
            return HttpResponseRedirect(attachment.file.url)

        return _api_error("File not accessible")
    except Pitch.DoesNotExist:
        return _api_error("Pitch not found")


# ---------------------------------------------------------------------------
# Trading — impact check
# ---------------------------------------------------------------------------


@router.get("/trade/impact/{pitch_id}")
def get_pre_trade_impact(request, pitch_id: int):
    try:
        profile = UserProfile.objects.get(user=request.user)
        if not profile.snaptrade_secret or not profile.snaptrade_user_id:
            return _api_error("SnapTrade account not connected")

        pitch = Pitch.objects.get(id=pitch_id)

        eastern = timezone("US/Eastern")
        now = datetime.datetime.now(eastern)
        is_market_open = True
        if now.weekday() >= 5:
            is_market_open = False
        elif now.time() < datetime.time(9, 30) or now.time() > datetime.time(16, 0):
            is_market_open = False

        accounts_raw = sdk_to_python(
            snaptrade.account_information.list_user_accounts(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret,
            ).body
        )
        if not accounts_raw:
            return _api_error("No brokerage accounts found")

        account_id = str(accounts_raw[0]["id"])

        symbols_raw = sdk_to_python(
            snaptrade.reference_data.symbol_search_user_account(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret,
                account_id=account_id,
                substring=pitch.ticker,
            ).body
        )
        if not symbols_raw:
            return _api_error(f"Symbol {pitch.ticker} not tradable on this brokerage")

        symbol_id = str(symbols_raw[0]["id"])

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

        trade = impact_raw.get("trade") or {}
        trade_impacts = impact_raw.get("trade_impacts") or []
        first_impact = trade_impacts[0] if trade_impacts else {}

        estimated_price_raw = trade.get("price") or first_impact.get("remaining_cash")
        estimated_commissions_raw = first_impact.get("estimated_commission") or 0.0

        response = {
            "success": True,
            "impact": {
                "estimated_execution_price": float(estimated_price_raw)
                if estimated_price_raw is not None
                else None,
                "estimated_commissions": float(estimated_commissions_raw),
                "trade_id": str(trade.get("id") or ""),
            },
            "account": {"id": account_id},
            "is_market_open": bool(is_market_open),
        }

        try:
            json.dumps(response)
        except TypeError as je:
            return _api_error(f"Serialization bug — please report: {je}")

        return response

    except Pitch.DoesNotExist:
        return _api_error("Pitch not found")
    except UserProfile.DoesNotExist:
        return _api_error("User profile not found")
    except Exception as e:
        logger.exception("Trade impact error")
        return _api_error("An error occurred while calculating trade impact.")


# ---------------------------------------------------------------------------
# Trading — execute buy
# ---------------------------------------------------------------------------


@router.post("/trade/execute/{pitch_id}")
def execute_trade(request, pitch_id: int, payload: ExecuteTradeSchema):
    try:
        profile = UserProfile.objects.get(user=request.user)
        if not profile.snaptrade_secret or not profile.snaptrade_user_id:
            return _api_error("SnapTrade account not connected")

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
            return _api_error(f"Symbol {pitch.ticker} not tradable on this brokerage")

        symbol_id = str(symbols_raw[0]["id"])

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

        order_id = str(
            place_raw.get("brokerage_order_id") or place_raw.get("id") or "unknown"
        )

        TradeEvent.objects.create(
            reader=profile,
            pitch=pitch,
            order_id=order_id,
            revenue_generated=0.0,
        )

        return {"success": True, "order_id": order_id}

    except Pitch.DoesNotExist:
        return _api_error("Pitch not found")
    except UserProfile.DoesNotExist:
        return _api_error("User profile not found")
    except Exception as e:
        logger.exception("Trade execution error")
        return _api_error("An error occurred while executing the trade.")


# ---------------------------------------------------------------------------
# Trading — execute sell
# ---------------------------------------------------------------------------


@router.post("/trade/sell")
def sell_trade(request, payload: SellTradeSchema):
    try:
        profile = UserProfile.objects.get(user=request.user)
        if not profile.snaptrade_secret or not profile.snaptrade_user_id:
            return _api_error("SnapTrade account not connected")

        symbols_raw = sdk_to_python(
            snaptrade.reference_data.symbol_search_user_account(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret,
                account_id=str(payload.account_id),
                substring=payload.symbol,
            ).body
        )
        if not symbols_raw:
            return _api_error(f"Symbol {payload.symbol} not tradable on this brokerage")

        symbol_id = str(symbols_raw[0]["id"])

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

        order_id = str(
            place_raw.get("brokerage_order_id") or place_raw.get("id") or "unknown"
        )
        return {"success": True, "order_id": order_id}

    except UserProfile.DoesNotExist:
        return _api_error("User profile not found")
    except Exception as e:
        logger.exception("Sell trade error")
        return _api_error("An error occurred while executing the sell order.")


# ---------------------------------------------------------------------------
# Author profile
# ---------------------------------------------------------------------------


@router.get("/author/{username}", auth=None)
def get_author_profile(request, username: str):
    try:
        user = User.objects.get(username=username)
        pitches = (
            Pitch.objects.select_related("author__user")
            .prefetch_related("attachments")
            .filter(author__user=user)
            .order_by("-created_at")
        )
        total_pitches = int(pitches.count())

        return {
            "author": {
                "username": str(user.username),
                "total_pitches": total_pitches,
            },
            "pitches": [
                {
                    "id": int(p.id),
                    "ticker": str(p.ticker),
                    "target_price": _f(p.target_price),
                    "entry_price": _f(p.entry_price) if p.entry_price else None,
                    "status": str(p.status),
                    "created_at": p.created_at.isoformat(),
                }
                for p in pitches
            ],
        }
    except User.DoesNotExist:
        return _api_error("Author not found")


# ---------------------------------------------------------------------------
# My pitches + analytics (authenticated)
# ---------------------------------------------------------------------------


@router.get("/my/pitches")
def get_my_pitches_analytics(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    pitches = (
        Pitch.objects.select_related("author__user")
        .prefetch_related("attachments")
        .filter(author=profile)
        .order_by("-created_at")
    )

    total_pitches = int(pitches.count())
    active_pitches = int(pitches.filter(status="ACTIVE").count())
    verified_pitches = int(pitches.filter(is_verified=True).count())
    closed_pitches = int(pitches.exclude(status="ACTIVE").count())

    return {
        "author": {
            "username": str(request.user.username),
            "total_pitches": total_pitches,
            "active_pitches": active_pitches,
            "verified_pitches": verified_pitches,
            "closed_pitches": closed_pitches,
        },
        "pitches": [
            {
                "id": int(p.id),
                "ticker": str(p.ticker),
                "target_price": _f(p.target_price),
                "entry_price": _f(p.entry_price) if p.entry_price else None,
                "status": str(p.status),
                "is_verified": bool(p.is_verified),
                "content_body": str(p.content_body),
                "created_at": p.created_at.isoformat(),
                "deck_url": f"/api/pitches/{int(p.id)}/deck"
                if p.attachments.first() and p.attachments.first().file
                else None,
            }
            for p in pitches
        ],
    }


# ---------------------------------------------------------------------------
# Portfolio
# ---------------------------------------------------------------------------


@router.get("/portfolio")
def get_portfolio(request):
    profile = UserProfile.objects.get(user=request.user)
    if not profile.snaptrade_secret or not profile.snaptrade_user_id:
        return _api_error("SnapTrade account not connected")

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
            acc_id = str(account["id"])
            acc_name = str(account.get("name") or "")

            holdings_raw = sdk_to_python(
                snaptrade.account_information.get_user_holdings(
                    user_id=str(profile.snaptrade_user_id),
                    user_secret=profile.snaptrade_secret,
                    account_id=acc_id,
                ).body
            )

            raw_positions = (
                holdings_raw.get("positions")
                or (holdings_raw.get("account") or {}).get("positions")
                or (holdings_raw.get("holdings") or {}).get("positions")
                or []
            )

            positions = []
            for pos in raw_positions:
                pos_symbol = pos.get("symbol") or {}
                ticker = (
                    ((pos_symbol.get("symbol") or {}).get("symbol"))
                    or pos_symbol.get("ticker")
                    or pos.get("ticker")
                    or ""
                )

                positions.append(
                    {
                        "ticker": str(ticker or ""),
                        "units": float(pos.get("units") or 0),
                        "price": float(pos.get("price") or 0),
                        "average_purchase_price": float(
                            pos.get("average_purchase_price")
                            or pos.get("average_price")
                            or 0
                        ),
                        "open_pnl": float(
                            pos.get("open_pnl") or pos.get("unrealized_pnl") or 0
                        ),
                    }
                )

            balances = []
            for bal in holdings_raw.get("balances") or []:
                currency = bal.get("currency") or {}
                balances.append(
                    {
                        "currency": str(currency.get("code") or ""),
                        "cash": float(bal.get("cash") or 0),
                    }
                )

            portfolio.append(
                {
                    "account_id": acc_id,
                    "account_name": acc_name,
                    "positions": positions,
                    "balances": balances,
                    "debug": {
                        "raw_positions_count": int(len(raw_positions)),
                        "parsed_positions_count": int(len(positions)),
                    },
                }
            )

        return {"success": True, "portfolio": portfolio}

    except Exception as e:
        logger.exception("Portfolio fetch error")
        return _api_error("An error occurred while fetching your portfolio.")


# ---------------------------------------------------------------------------
# Portfolio history (for charts)
# ---------------------------------------------------------------------------


@router.get("/portfolio/history")
def get_portfolio_history(request):
    """Fetch portfolio activities and return-rate history from SnapTrade."""

    profile = UserProfile.objects.get(user=request.user)
    if not profile.snaptrade_secret or not profile.snaptrade_user_id:
        return _api_error("SnapTrade account not connected")

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
            acc_id = str(account["id"])

            try:
                rates_raw = sdk_to_python(
                    snaptrade.account_information.get_user_account_return_rates(
                        user_id=user_id,
                        user_secret=user_secret,
                        account_id=acc_id,
                    ).body
                )
                if rates_raw and isinstance(rates_raw, dict):
                    data_points = (
                        rates_raw.get("data")
                        or rates_raw.get("timeWeightedReturn")
                        or []
                    )
                    if isinstance(data_points, list):
                        for dp in data_points:
                            all_return_rates.append(
                                {
                                    "date": str(
                                        dp.get("date") or dp.get("period_start") or ""
                                    ),
                                    "return_pct": float(
                                        dp.get("return")
                                        or dp.get("return_pct")
                                        or dp.get("value")
                                        or 0
                                    ),
                                    "account_id": acc_id,
                                }
                            )
                    elif isinstance(data_points, dict):
                        all_return_rates.append(
                            {
                                "date": str(data_points.get("date") or ""),
                                "return_pct": float(data_points.get("return") or 0),
                                "account_id": acc_id,
                            }
                        )
            except Exception as e:
                logger.warning("Return rates unavailable for %s: %s", acc_id, e)

            try:
                activities_raw = sdk_to_python(
                    snaptrade.transactions_and_reporting.get_activities(
                        user_id=user_id,
                        user_secret=user_secret,
                        account_id=acc_id,
                    ).body
                )
                if activities_raw and isinstance(activities_raw, list):
                    for act in activities_raw[:50]:
                        all_activities.append(
                            {
                                "date": str(
                                    act.get("trade_date")
                                    or act.get("settlement_date")
                                    or ""
                                ),
                                "type": str(act.get("type") or ""),
                                "description": str(act.get("description") or ""),
                                "symbol": str(
                                    (act.get("symbol") or {}).get("symbol")
                                    or act.get("ticker")
                                    or ""
                                ),
                                "amount": float(act.get("amount") or 0),
                                "units": float(
                                    act.get("units") or act.get("quantity") or 0
                                ),
                                "price": float(act.get("price") or 0),
                                "account_id": acc_id,
                            }
                        )
            except Exception as e:
                logger.warning("Activities unavailable for %s: %s", acc_id, e)

        snapshots = PortfolioSnapshot.objects.filter(user=profile).order_by("date")
        snapshot_data = [
            {"date": s.date.isoformat(), "value": _f(s.total_value)} for s in snapshots
        ]

        return {
            "success": True,
            "return_rates": all_return_rates,
            "activities": all_activities,
            "snapshots": snapshot_data,
        }

    except Exception as e:
        logger.exception("Portfolio history error")
        return _api_error("An error occurred while fetching portfolio history.")
