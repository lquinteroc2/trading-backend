from fastapi import FastAPI

from app.api.routes.account import router as account_router
from app.api.routes.health import router as health_router
from app.api.routes.orders import router as orders_router
from app.api.routes.prices import router as prices_router
from app.api.routes.symbols import router as symbols_router

app = FastAPI(title="INVERSIONES MT5 Worker", version="0.1.0")

app.include_router(health_router)
app.include_router(account_router)
app.include_router(symbols_router)
app.include_router(prices_router)
app.include_router(orders_router)
