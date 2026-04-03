from ninja import NinjaAPI
from ninja.security import HttpBearer
from core.models import UserProfile


class TokenAuth(HttpBearer):
    """
    Bearer token authentication.
    Looks for 'Authorization: Bearer <token>' header, resolves the user
    from the UserProfile.auth_token field, and attaches it to the request.
    """
    def authenticate(self, request, token):
        try:
            profile = UserProfile.objects.select_related('user').get(auth_token=token)
            request.user = profile.user
            return profile
        except UserProfile.DoesNotExist:
            return None


api = NinjaAPI(
    title="Bought-or-Not API",
    version="1.0.0",
    auth=TokenAuth(),
)

api.add_router("", "core.api.router")

@api.get("/ping", auth=None)
def ping(request):
    return {"status": "ok"}
