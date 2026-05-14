from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.routes.account import router as account_router
from app.api.routes.health import router as health_router
from app.api.routes.orders import router as orders_router
from app.api.routes.prices import router as prices_router
from app.api.routes.symbols import router as symbols_router
from app.config import get_settings

app = FastAPI(title="INVERSIONES MT5 Worker", version="0.1.0")


@app.middleware("http")
async def require_api_key(request: Request, call_next):
    settings = get_settings()
    if settings.mt5_worker_api_key and request.url.path != "/health":
        api_key = request.headers.get("x-api-key")
        if api_key != settings.mt5_worker_api_key:
            return JSONResponse(status_code=401, content={"detail": "Invalid MT5 worker API key"})

    return await call_next(request)


app.include_router(health_router)
app.include_router(account_router)
app.include_router(symbols_router)
app.include_router(prices_router)
app.include_router(orders_router)
