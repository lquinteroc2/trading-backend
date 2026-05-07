from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.mt5.client import Mt5Client
from app.mt5.exceptions import Mt5NotConnectedError, Mt5UnavailableError
from app.schemas.symbol import SymbolsResponse

router = APIRouter(prefix="/mt5", tags=["mt5"])


@router.get("/symbols", response_model=SymbolsResponse)
def symbols(settings: Settings = Depends(get_settings)) -> dict:
    try:
        return Mt5Client(settings).symbols()
    except Mt5UnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Mt5NotConnectedError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
