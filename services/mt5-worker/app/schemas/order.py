from typing import Optional

from pydantic import BaseModel, Field


class OrderRequest(BaseModel):
    symbol: str
    direction: str = Field(pattern="^(BUY|SELL)$")
    volume: float = Field(gt=0)
    entryPrice: float = Field(gt=0)
    stopLoss: Optional[float] = Field(default=None, gt=0)
    takeProfit: Optional[float] = Field(default=None, gt=0)
    comment: Optional[str] = "INVERSIONES_DRY_RUN"


class DryRunOrderResponse(BaseModel):
    dryRun: bool
    wouldExecute: bool
    reason: str
    request: OrderRequest


class BlockedOrderResponse(BaseModel):
    blocked: bool
    reason: str
