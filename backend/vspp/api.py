from ninja import NinjaAPI

api = NinjaAPI(title="VSPP API", version="1.0.0")

api.add_router("", "core.api.router")

@api.get("/ping")
def ping(request):
    return {"status": "ok"}
