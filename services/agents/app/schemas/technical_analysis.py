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
    timeframe: str | None = Field(default=None, min_length=1)
    primaryTimeframe: str | None = Field(default=None, min_length=1)
    candles: list[Candle] | None = None
    timeframes: dict[str, list[Candle]] | None = None

    @model_validator(mode="after")
    def validate_minimum_history(self) -> "TechnicalAnalysisRequest":
        primary = self.resolved_primary_timeframe()
        candles = self.primary_candles()
        if not primary:
            raise ValueError("timeframe or primaryTimeframe is required")
        if len(candles) < settings.min_candles:
            raise ValueError(f"at least {settings.min_candles} candles are required")
        return self

    def resolved_primary_timeframe(self) -> str:
        return self.primaryTimeframe or self.timeframe or ""

    def primary_candles(self) -> list[Candle]:
        primary = self.resolved_primary_timeframe()
        if self.timeframes and primary in self.timeframes:
            return self.timeframes[primary]
        return self.candles or []


class TechnicalIndicators(BaseModel):
    ema20: float
    ema50: float
    ema200: float
    rsi14: float
    atr14: float


class SupportResistanceLevel(BaseModel):
    price: float
    touches: int
    strength: str


class SupportResistance(BaseModel):
    supports: list[SupportResistanceLevel]
    resistances: list[SupportResistanceLevel]
    nearestSupport: float | None = None
    nearestResistance: float | None = None


class MarketRegime(BaseModel):
    regime: str
    isRanging: bool
    volatilityState: str
    atrPercent: float
    reason: str


class MultiTimeframe(BaseModel):
    primary: str
    confirmationTimeframes: list[str]
    alignment: str
    biasByTimeframe: dict[str, str]


class TechnicalAnalysisResponse(BaseModel):
    symbol: str
    timeframe: str
    primaryTimeframe: str
    candlesAnalyzed: int
    trend: MarketDirection
    technicalBias: MarketDirection
    confidenceScore: int
    indicators: TechnicalIndicators
    supportResistance: SupportResistance
    marketRegime: MarketRegime
    multiTimeframe: MultiTimeframe
    reasoning: list[str]
    warnings: list[str]
