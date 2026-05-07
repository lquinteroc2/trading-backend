from typing import Optional

from pydantic import BaseModel


class AccountInfoResponse(BaseModel):
    connected: bool
    login: Optional[int]
    server: Optional[str]
    balance: float
    equity: float
    margin: float
    freeMargin: float
    currency: Optional[str]
