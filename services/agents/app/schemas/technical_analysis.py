from enum import Enum

from pydantic import BaseModel, Field, model_validator

from app.config import settings
from app.schemas.candles import Candle


class MarketDirection(str, Enum):
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"


class TechnicalAnalysisRequest(BaseModel):
    symbol: str = Field(min_length=1)
    timeframe: str = Field(min_length=1)
    candles: list[Candle] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_minimum_history(self) -> "TechnicalAnalysisRequest":
        if len(self.candles) < settings.min_candles:
            raise ValueError(f"at least {settings.min_candles} candles are required")
        return self


class TechnicalIndicators(BaseModel):
    ema20: float
    ema50: float
    ema200: float
    rsi14: float
    atr14: float


class TechnicalAnalysisResponse(BaseModel):
    symbol: str
    timeframe: str
    candlesAnalyzed: int
    trend: MarketDirection
    technicalBias: MarketDirection
    confidenceScore: int
    indicators: TechnicalIndicators
    reasoning: list[str]
    warnings: list[str]
