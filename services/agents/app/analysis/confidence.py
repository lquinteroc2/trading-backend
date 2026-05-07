from app.schemas.technical_analysis import MarketDirection


def calculate_confidence(
    trend: MarketDirection,
    technical_bias: MarketDirection,
    rsi14: float,
    market_regime: dict[str, object],
    multi_timeframe: dict[str, object],
    support_resistance: dict[str, object],
    close: float,
) -> int:
    score = 30

    if trend in {MarketDirection.BULLISH, MarketDirection.BEARISH}:
        score += 20
    if technical_bias == MarketDirection.BULLISH and 45 <= rsi14 <= 70:
        score += 15
    if technical_bias == MarketDirection.BEARISH and 30 <= rsi14 <= 55:
        score += 15
    if multi_timeframe.get("alignment") == "ALIGNED":
        score += 15
    if technical_bias == MarketDirection.BULLISH and _has_room_to_resistance(support_resistance, close):
        score += 10
    if technical_bias == MarketDirection.BEARISH and _has_room_to_support(support_resistance, close):
        score += 10
    if market_regime.get("volatilityState") == "NORMAL":
        score += 10
    if market_regime.get("isRanging") is True:
        score -= 20
    if multi_timeframe.get("alignment") == "CONFLICTED":
        score -= 15
    if market_regime.get("volatilityState") in {"LOW", "HIGH"}:
        score -= 10

    return max(0, min(100, score))


def _has_room_to_resistance(support_resistance: dict[str, object], close: float) -> bool:
    nearest = support_resistance.get("nearestResistance")
    return not isinstance(nearest, (int, float)) or (nearest - close) / close > 0.003


def _has_room_to_support(support_resistance: dict[str, object], close: float) -> bool:
    nearest = support_resistance.get("nearestSupport")
    return not isinstance(nearest, (int, float)) or (close - nearest) / close > 0.003
