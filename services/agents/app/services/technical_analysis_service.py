import pandas as pd

from app.indicators.atr import calculate_atr
from app.indicators.ema import calculate_ema
from app.indicators.rsi import calculate_rsi
from app.schemas.technical_analysis import (
    MarketDirection,
    TechnicalAnalysisRequest,
    TechnicalAnalysisResponse,
    TechnicalIndicators,
)


class TechnicalAnalysisService:
    def analyze(self, request: TechnicalAnalysisRequest) -> TechnicalAnalysisResponse:
        frame = self._to_frame(request)
        close = frame["close"]

        frame["ema20"] = calculate_ema(close, 20)
        frame["ema50"] = calculate_ema(close, 50)
        frame["ema200"] = calculate_ema(close, 200)
        frame["rsi14"] = calculate_rsi(close, 14)
        frame["atr14"] = calculate_atr(frame["high"], frame["low"], close, 14)

        latest = frame.iloc[-1]
        ema20 = float(latest["ema20"])
        ema50 = float(latest["ema50"])
        ema200 = float(latest["ema200"])
        rsi14 = float(latest["rsi14"])
        atr14 = float(latest["atr14"])
        latest_close = float(latest["close"])

        trend = self._classify_trend(ema20, ema50, ema200)
        technical_bias = self._classify_bias(trend, rsi14)
        reasoning = self._build_reasoning(trend, technical_bias, rsi14, atr14, latest_close)
        warnings = self._build_warnings(rsi14, atr14, latest_close)
        confidence_score = self._confidence_score(
            trend=trend,
            technical_bias=technical_bias,
            rsi14=rsi14,
            atr14=atr14,
            latest_close=latest_close,
            ema20=ema20,
            ema50=ema50,
            ema200=ema200,
        )

        return TechnicalAnalysisResponse(
            symbol=request.symbol,
            timeframe=request.timeframe,
            candlesAnalyzed=len(request.candles),
            trend=trend,
            technicalBias=technical_bias,
            confidenceScore=confidence_score,
            indicators=TechnicalIndicators(
                ema20=round(ema20, 8),
                ema50=round(ema50, 8),
                ema200=round(ema200, 8),
                rsi14=round(rsi14, 2),
                atr14=round(atr14, 8),
            ),
            reasoning=reasoning,
            warnings=warnings,
        )

    def _to_frame(self, request: TechnicalAnalysisRequest) -> pd.DataFrame:
        rows = [candle.model_dump() for candle in request.candles]
        frame = pd.DataFrame(rows).sort_values("timestamp").reset_index(drop=True)
        return frame[["open", "high", "low", "close", "volume", "timestamp"]]

    def _classify_trend(self, ema20: float, ema50: float, ema200: float) -> MarketDirection:
        if ema20 > ema50 > ema200:
            return MarketDirection.BULLISH
        if ema20 < ema50 < ema200:
            return MarketDirection.BEARISH
        return MarketDirection.NEUTRAL

    def _classify_bias(self, trend: MarketDirection, rsi14: float) -> MarketDirection:
        if trend == MarketDirection.BULLISH and 45 <= rsi14 <= 70:
            return MarketDirection.BULLISH
        if trend == MarketDirection.BEARISH and 30 <= rsi14 <= 55:
            return MarketDirection.BEARISH
        if trend != MarketDirection.NEUTRAL:
            return trend
        return MarketDirection.NEUTRAL

    def _build_reasoning(
        self,
        trend: MarketDirection,
        technical_bias: MarketDirection,
        rsi14: float,
        atr14: float,
        latest_close: float,
    ) -> list[str]:
        reasoning: list[str] = []
        if trend == MarketDirection.BULLISH:
            reasoning.append("EMA20 esta por encima de EMA50 y EMA50 esta por encima de EMA200")
        elif trend == MarketDirection.BEARISH:
            reasoning.append("EMA20 esta por debajo de EMA50 y EMA50 esta por debajo de EMA200")
        else:
            reasoning.append("Las medias moviles no estan claramente alineadas")

        if technical_bias == MarketDirection.BULLISH and 45 <= rsi14 <= 70:
            reasoning.append("El RSI se mantiene en un rango alcista saludable")
        elif technical_bias == MarketDirection.BEARISH and 30 <= rsi14 <= 55:
            reasoning.append("El RSI confirma momentum direccional bajista")
        else:
            reasoning.append("El RSI no confirma momentum direccional")

        atr_ratio = atr14 / latest_close if latest_close > 0 else 0
        if 0.001 <= atr_ratio <= 0.08:
            reasoning.append("El ATR indica volatilidad medible")
        else:
            reasoning.append("El ATR esta fuera del rango de volatilidad preferido")

        return reasoning

    def _build_warnings(self, rsi14: float, atr14: float, latest_close: float) -> list[str]:
        warnings: list[str] = []
        atr_ratio = atr14 / latest_close if latest_close > 0 else 0

        if rsi14 > 75:
            warnings.append("El RSI indica condiciones de sobrecompra")
        if rsi14 < 25:
            warnings.append("El RSI indica condiciones de sobreventa")
        if atr_ratio < 0.001:
            warnings.append("El ATR es muy bajo en relacion con el precio")
        if atr_ratio > 0.08:
            warnings.append("El ATR es muy alto en relacion con el precio")

        return warnings

    def _confidence_score(
        self,
        trend: MarketDirection,
        technical_bias: MarketDirection,
        rsi14: float,
        atr14: float,
        latest_close: float,
        ema20: float,
        ema50: float,
        ema200: float,
    ) -> int:
        score = 40
        atr_ratio = atr14 / latest_close if latest_close > 0 else 0

        if trend in {MarketDirection.BULLISH, MarketDirection.BEARISH}:
            score += 25
        if technical_bias == MarketDirection.BULLISH and 45 <= rsi14 <= 70:
            score += 15
        if technical_bias == MarketDirection.BEARISH and 30 <= rsi14 <= 55:
            score += 15
        if 0.001 <= atr_ratio <= 0.08:
            score += 10
        if trend == MarketDirection.BULLISH and latest_close >= max(ema20, ema50, ema200):
            score += 10
        if trend == MarketDirection.BEARISH and latest_close <= min(ema20, ema50, ema200):
            score += 10

        return max(0, min(100, score))
