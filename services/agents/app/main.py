from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.api.routes.technical_analysis import router as technical_analysis_router

app = FastAPI(title="INVERSIONES Technical Agent Worker", version="0.1.0")

app.include_router(health_router)
app.include_router(technical_analysis_router)
