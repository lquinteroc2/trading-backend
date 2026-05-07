import pandas as pd


def detect_market_regime(
    frame: pd.DataFrame,
    low_vol_threshold: float,
    high_vol_threshold: float,
) -> dict[str, object]:
    latest = frame.iloc[-1]
    ema20 = float(latest["ema20"])
    ema50 = float(latest["ema50"])
    ema200 = float(latest["ema200"])
    close = float(latest["close"])
    atr = float(latest["atr14"])
    atr_percent = atr / close if close > 0 else 0

    volatility_state = "NORMAL"
    if atr_percent < low_vol_threshold:
        volatility_state = "LOW"
    elif atr_percent > high_vol_threshold:
        volatility_state = "HIGH"

    ema20_previous = float(frame["ema20"].iloc[-6]) if len(frame) >= 6 else ema20
    ema_distance = abs(ema20 - ema50) / close if close > 0 else 0
    bullish_aligned = ema20 > ema50 > ema200 and ema20 >= ema20_previous
    bearish_aligned = ema20 < ema50 < ema200 and ema20 <= ema20_previous
    is_ranging = ema_distance < 0.002 or not (bullish_aligned or bearish_aligned)

    if volatility_state == "HIGH":
        regime = "HIGH_VOLATILITY"
        reason = "ATR elevado frente al precio actual"
    elif volatility_state == "LOW":
        regime = "LOW_VOLATILITY"
        reason = "ATR bajo frente al precio actual"
    elif bullish_aligned or bearish_aligned:
        regime = "TRENDING"
        reason = "EMAs alineadas y pendiente coherente"
    else:
        regime = "RANGING"
        reason = "EMAs entrelazadas o distancia EMA20/EMA50 baja"

    return {
        "regime": regime,
        "isRanging": bool(is_ranging or regime == "RANGING"),
        "volatilityState": volatility_state,
        "atrPercent": round(atr_percent, 8),
        "reason": reason,
    }
