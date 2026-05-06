from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.mt5.client import Mt5Client
from app.mt5.exceptions import Mt5NotConnectedError, Mt5UnavailableError
from app.schemas.account import AccountInfoResponse

router = APIRouter(prefix="/mt5", tags=["mt5"])


@router.get("/account", response_model=AccountInfoResponse)
def account(settings: Settings = Depends(get_settings)) -> dict:
    try:
        return Mt5Client(settings).account_info()
    except Mt5UnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Mt5NotConnectedError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
