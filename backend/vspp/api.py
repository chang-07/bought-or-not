from ninja import NinjaAPI

api = NinjaAPI(title="VSPP API", version="1.0.0")

@api.get("/ping")
def ping(request):
    return {"status": "ok"}
