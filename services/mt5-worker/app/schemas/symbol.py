from typing import List, Optional

from pydantic import BaseModel


class SymbolInfo(BaseModel):
    symbol: str
    description: Optional[str] = None
    visible: bool
    tradeMode: str


class SymbolsResponse(BaseModel):
    symbols: List[SymbolInfo]
