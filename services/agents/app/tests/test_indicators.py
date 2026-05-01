import pandas as pd

from app.indicators.atr import calculate_atr
from app.indicators.ema import calculate_ema
from app.indicators.rsi import calculate_rsi


def test_ema_calculates_without_final_nan():
    close = pd.Series(range(1, 251), dtype=float)

    assert not pd.isna(calculate_ema(close, 20).iloc[-1])
    assert not pd.isna(calculate_ema(close, 50).iloc[-1])
    assert not pd.isna(calculate_ema(close, 200).iloc[-1])


def test_rsi_returns_value_between_zero_and_one_hundred():
    close = pd.Series([100 + ((index % 7) - 3) for index in range(250)], dtype=float)

    value = calculate_rsi(close, 14).iloc[-1]

    assert 0 <= value <= 100


def test_atr_returns_positive_value():
    close = pd.Series(range(100, 350), dtype=float)
    high = close + 2
    low = close - 2

    value = calculate_atr(high, low, close, 14).iloc[-1]

    assert value > 0
