from pydantic import BaseModel


class PriceResponse(BaseModel):
    symbol: str
    bid: float
    ask: float
    spread: float
    time: str
