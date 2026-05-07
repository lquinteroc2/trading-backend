import pandas as pd

from app.analysis.confidence import calculate_confidence
from app.analysis.market_regime import detect_market_regime
from app.analysis.multi_timeframe import analyze_multi_timeframe
from app.analysis.support_resistance import detect_support_resistance
from app.indicators.atr import calculate_atr
from app.indicators.ema import calculate_ema
from app.indicators.rsi import calculate_rsi
from app.config import settings
from app.schemas.technical_analysis import (
    MarketDirection,
    TechnicalAnalysisRequest,
    TechnicalAnalysisResponse,
    TechnicalIndicators,
)


class TechnicalAnalysisService:
    def analyze(self, request: TechnicalAnalysisRequest) -> TechnicalAnalysisResponse:
        primary_timeframe = request.resolved_primary_timeframe()
        frame = self._to_frame(request.primary_candles())
        frame = self._with_indicators(frame)

        latest = frame.iloc[-1]
        ema20, ema50, ema200, rsi14, atr14, latest_close = self._latest_values(frame)

        trend = self._classify_trend(ema20, ema50, ema200)
        technical_bias = self._classify_bias(trend, rsi14)
        support_resistance = detect_support_resistance(
            frame,
            settings.technical_sr_lookback,
            settings.technical_sr_tolerance_percent,
        )
        market_regime = detect_market_regime(
            frame,
            settings.technical_low_vol_atr_percent,
            settings.technical_high_vol_atr_percent,
        )
        bias_by_timeframe = self._bias_by_timeframe(request, primary_timeframe, technical_bias)
        multi_timeframe = analyze_multi_timeframe(primary_timeframe, bias_by_timeframe)
        reasoning = self._build_reasoning(
            trend=trend,
            technical_bias=technical_bias,
            rsi14=rsi14,
            market_regime=market_regime,
            multi_timeframe=multi_timeframe,
            support_resistance=support_resistance,
            latest_close=latest_close,
        )
        warnings = self._build_warnings(
            rsi14=rsi14,
            market_regime=market_regime,
            support_resistance=support_resistance,
            technical_bias=technical_bias,
            latest_close=latest_close,
        )
        confidence_score = calculate_confidence(
            trend,
            technical_bias,
            rsi14,
            market_regime,
            multi_timeframe,
            support_resistance,
            latest_close,
        )

        return TechnicalAnalysisResponse(
            symbol=request.symbol,
            timeframe=primary_timeframe,
            primaryTimeframe=primary_timeframe,
            candlesAnalyzed=len(request.primary_candles()),
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
            supportResistance=support_resistance,
            marketRegime=market_regime,
            multiTimeframe=multi_timeframe,
            reasoning=reasoning,
            warnings=warnings,
        )

    def _to_frame(self, candles) -> pd.DataFrame:
        rows = [candle.model_dump() for candle in candles]
        frame = pd.DataFrame(rows).sort_values("timestamp").reset_index(drop=True)
        return frame[["open", "high", "low", "close", "volume", "timestamp"]]

    def _with_indicators(self, frame: pd.DataFrame) -> pd.DataFrame:
        close = frame["close"]
        frame = frame.copy()
        frame["ema20"] = calculate_ema(close, 20)
        frame["ema50"] = calculate_ema(close, 50)
        frame["ema200"] = calculate_ema(close, 200)
        frame["rsi14"] = calculate_rsi(close, 14)
        frame["atr14"] = calculate_atr(frame["high"], frame["low"], close, 14)
        return frame

    def _latest_values(self, frame: pd.DataFrame) -> tuple[float, float, float, float, float, float]:
        latest = frame.iloc[-1]
        return (
            float(latest["ema20"]),
            float(latest["ema50"]),
            float(latest["ema200"]),
            float(latest["rsi14"]),
            float(latest["atr14"]),
            float(latest["close"]),
        )

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
        market_regime: dict[str, object],
        multi_timeframe: dict[str, object],
        support_resistance: dict[str, object],
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

        if market_regime.get("volatilityState") == "NORMAL":
            reasoning.append("El ATR esta dentro de un rango operativo normal")
        else:
            reasoning.append(str(market_regime.get("reason")))

        if multi_timeframe.get("alignment") == "ALIGNED":
            reasoning.append("Los timeframes superiores confirman el sesgo principal")
        elif multi_timeframe.get("alignment") == "CONFLICTED":
            reasoning.append("Los timeframes superiores contradicen el sesgo principal")
        else:
            reasoning.append("La confirmacion multi-timeframe es parcial")

        if technical_bias == MarketDirection.BULLISH and self._has_room_to_resistance(
            support_resistance,
            latest_close,
        ):
            reasoning.append("El precio tiene espacio antes de la resistencia mas cercana")
        if technical_bias == MarketDirection.BEARISH and self._has_room_to_support(
            support_resistance,
            latest_close,
        ):
            reasoning.append("El precio tiene espacio antes del soporte mas cercano")

        return reasoning

    def _build_warnings(
        self,
        rsi14: float,
        market_regime: dict[str, object],
        support_resistance: dict[str, object],
        technical_bias: MarketDirection,
        latest_close: float,
    ) -> list[str]:
        warnings: list[str] = []

        if rsi14 > 75:
            warnings.append("El RSI indica condiciones de sobrecompra")
        if rsi14 < 25:
            warnings.append("El RSI indica condiciones de sobreventa")
        if market_regime.get("isRanging") is True:
            warnings.append("El mercado esta en rango y puede producir rupturas falsas")
        if market_regime.get("volatilityState") == "LOW":
            warnings.append("El ATR es muy bajo en relacion con el precio")
        if market_regime.get("volatilityState") == "HIGH":
            warnings.append("El ATR es muy alto en relacion con el precio")
        if technical_bias == MarketDirection.BULLISH and not self._has_room_to_resistance(
            support_resistance,
            latest_close,
        ):
            warnings.append("La resistencia esta relativamente cerca")
        if technical_bias == MarketDirection.BEARISH and not self._has_room_to_support(
            support_resistance,
            latest_close,
        ):
            warnings.append("El soporte esta relativamente cerca")

        return warnings

    def _bias_by_timeframe(
        self,
        request: TechnicalAnalysisRequest,
        primary_timeframe: str,
        primary_bias: MarketDirection,
    ) -> dict[str, MarketDirection]:
        bias_by_timeframe = {primary_timeframe: primary_bias}
        if not settings.technical_enable_multi_timeframe or not request.timeframes:
            return bias_by_timeframe

        for timeframe, candles in request.timeframes.items():
            if timeframe == primary_timeframe or len(candles) < settings.min_candles:
                continue
            frame = self._with_indicators(self._to_frame(candles))
            ema20, ema50, ema200, rsi14, _, _ = self._latest_values(frame)
            bias_by_timeframe[timeframe] = self._classify_bias(
                self._classify_trend(ema20, ema50, ema200),
                rsi14,
            )
        return bias_by_timeframe

    def _has_room_to_resistance(self, support_resistance: dict[str, object], close: float) -> bool:
        nearest = support_resistance.get("nearestResistance")
        return not isinstance(nearest, (int, float)) or (nearest - close) / close > 0.003

    def _has_room_to_support(self, support_resistance: dict[str, object], close: float) -> bool:
        nearest = support_resistance.get("nearestSupport")
        return not isinstance(nearest, (int, float)) or (close - nearest) / close > 0.003
