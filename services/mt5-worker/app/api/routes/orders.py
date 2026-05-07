from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.mt5.exceptions import Mt5NotConnectedError, Mt5UnavailableError
from app.mt5.client import Mt5Client
from app.schemas.order import DryRunOrderResponse, OrderRequest

router = APIRouter(prefix="/mt5/orders", tags=["mt5-orders"])


@router.post("/dry-run", response_model=DryRunOrderResponse)
def dry_run_order(request: OrderRequest, settings: Settings = Depends(get_settings)) -> dict:
    return Mt5Client(settings).dry_run_order(request)


@router.post("/place")
def place_order(request: OrderRequest, settings: Settings = Depends(get_settings)) -> dict:
    try:
        return Mt5Client(settings).place_order(request)
    except Mt5UnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Mt5NotConnectedError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
