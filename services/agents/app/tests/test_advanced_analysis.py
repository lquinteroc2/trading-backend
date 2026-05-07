import pandas as pd

from app.analysis.confidence import calculate_confidence
from app.analysis.market_regime import detect_market_regime
from app.analysis.multi_timeframe import analyze_multi_timeframe
from app.analysis.support_resistance import detect_support_resistance
from app.analysis.volatility_filter import classify_volatility
from app.indicators.atr import calculate_atr
from app.indicators.ema import calculate_ema
from app.indicators.rsi import calculate_rsi
from app.schemas.technical_analysis import MarketDirection


def frame_from_closes(closes: list[float]) -> pd.DataFrame:
    frame = pd.DataFrame(
        {
            "open": closes,
            "high": [close + 2 for close in closes],
            "low": [close - 2 for close in closes],
            "close": closes,
            "volume": [100] * len(closes),
            "timestamp": pd.date_range("2024-01-01", periods=len(closes), freq="15min"),
        }
    )
    frame["ema20"] = calculate_ema(frame["close"], 20)
    frame["ema50"] = calculate_ema(frame["close"], 50)
    frame["ema200"] = calculate_ema(frame["close"], 200)
    frame["rsi14"] = calculate_rsi(frame["close"], 14)
    frame["atr14"] = calculate_atr(frame["high"], frame["low"], frame["close"], 14)
    return frame


def test_detects_supports_and_resistances():
    closes = [100 + (index % 20) for index in range(240)]
    frame = frame_from_closes(closes)

    result = detect_support_resistance(frame, lookback=120, tolerance_percent=0.01)

    assert result["supports"]
    assert result["resistances"]
    assert result["supports"][0]["touches"] >= 2


def test_market_regime_trending_and_ranging():
    trending = detect_market_regime(frame_from_closes([100 + index for index in range(240)]), 0.0001, 0.5)
    ranging = detect_market_regime(
        frame_from_closes([100 + ((index % 6) - 3) * 0.1 for index in range(240)]),
        0.0001,
        0.5,
    )

    assert trending["regime"] == "TRENDING"
    assert ranging["isRanging"] is True


def test_volatility_states():
    assert classify_volatility(1, 1000, 0.003, 0.03)[0] == "LOW"
    assert classify_volatility(10, 1000, 0.003, 0.03)[0] == "NORMAL"
    assert classify_volatility(50, 1000, 0.003, 0.03)[0] == "HIGH"


def test_multi_timeframe_alignment_and_conflict():
    aligned = analyze_multi_timeframe(
        "M15",
        {"M15": MarketDirection.BULLISH, "H1": MarketDirection.BULLISH},
    )
    conflicted = analyze_multi_timeframe(
        "M15",
        {"M15": MarketDirection.BULLISH, "H1": MarketDirection.BEARISH},
    )

    assert aligned["alignment"] == "ALIGNED"
    assert conflicted["alignment"] == "CONFLICTED"


def test_confidence_changes_with_regime_and_confirmation():
    base_sr = {"nearestSupport": 95, "nearestResistance": 120}
    ranging_score = calculate_confidence(
        MarketDirection.BULLISH,
        MarketDirection.BULLISH,
        58,
        {"isRanging": True, "volatilityState": "NORMAL"},
        {"alignment": "PARTIAL"},
        base_sr,
        100,
    )
    aligned_score = calculate_confidence(
        MarketDirection.BULLISH,
        MarketDirection.BULLISH,
        58,
        {"isRanging": False, "volatilityState": "NORMAL"},
        {"alignment": "ALIGNED"},
        base_sr,
        100,
    )

    assert ranging_score < aligned_score
