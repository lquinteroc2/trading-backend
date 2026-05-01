import pytest
from pydantic import ValidationError

from app.schemas.technical_analysis import MarketDirection, TechnicalAnalysisRequest
from app.services.technical_analysis_service import TechnicalAnalysisService


def make_candles(closes: list[float]) -> list[dict[str, object]]:
    candles = []
    for index, close in enumerate(closes):
        candles.append(
            {
                "timestamp": f"2024-01-01T00:{index % 60:02d}:00.000Z",
                "open": close,
                "high": close + 2,
                "low": close - 2,
                "close": close,
                "volume": 100 + index,
            }
        )
    return candles


def analyze(closes: list[float]):
    request = TechnicalAnalysisRequest(
        symbol="BTCUSDT",
        timeframe="M15",
        candles=make_candles(closes),
    )
    return TechnicalAnalysisService().analyze(request)


def test_detects_bullish_trend():
    result = analyze([100 + index for index in range(240)])

    assert result.trend == MarketDirection.BULLISH
    assert result.technicalBias == MarketDirection.BULLISH


def test_detects_bearish_trend():
    result = analyze([400 - index for index in range(240)])

    assert result.trend == MarketDirection.BEARISH
    assert result.technicalBias == MarketDirection.BEARISH


def test_detects_neutral_when_emas_are_not_aligned():
    closes = [400 - index for index in range(180)] + [220 + index * 3 for index in range(60)]

    result = analyze(closes)

    assert result.trend == MarketDirection.NEUTRAL
    assert result.technicalBias == MarketDirection.NEUTRAL


def test_fails_with_less_than_two_hundred_candles():
    with pytest.raises(ValidationError):
        TechnicalAnalysisRequest(
            symbol="BTCUSDT",
            timeframe="M15",
            candles=make_candles([100 + index for index in range(199)]),
        )
