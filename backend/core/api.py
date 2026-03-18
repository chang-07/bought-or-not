from ninja import Router
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.models import User
from .models import UserProfile
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
