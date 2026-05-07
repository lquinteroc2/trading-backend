def classify_volatility(
    atr: float,
    close: float,
    low_threshold: float,
    high_threshold: float,
) -> tuple[str, float]:
    atr_percent = atr / close if close > 0 else 0
    if atr_percent < low_threshold:
        return "LOW", atr_percent
    if atr_percent > high_threshold:
        return "HIGH", atr_percent
    return "NORMAL", atr_percent
