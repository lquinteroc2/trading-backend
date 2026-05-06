from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.mt5.client import Mt5Client
from app.schemas.order import BlockedOrderResponse, DryRunOrderResponse, OrderRequest

router = APIRouter(prefix="/mt5/orders", tags=["mt5-orders"])


@router.post("/dry-run", response_model=DryRunOrderResponse)
def dry_run_order(request: OrderRequest, settings: Settings = Depends(get_settings)) -> dict:
    return Mt5Client(settings).dry_run_order(request)


@router.post("/place", response_model=BlockedOrderResponse)
def place_order(request: OrderRequest, settings: Settings = Depends(get_settings)) -> dict:
    return Mt5Client(settings).place_order(request)
