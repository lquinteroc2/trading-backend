from dataclasses import dataclass

import pandas as pd


@dataclass
class Level:
    price: float
    touches: int
    strength: str


def detect_support_resistance(
    frame: pd.DataFrame,
    lookback: int = 100,
    tolerance_percent: float = 0.002,
) -> dict[str, object]:
    window = frame.tail(lookback).reset_index(drop=True)
    if len(window) < 5:
        return {
            "supports": [],
            "resistances": [],
            "nearestSupport": None,
            "nearestResistance": None,
        }

    lows: list[float] = []
    highs: list[float] = []
    for index in range(2, len(window) - 2):
        low = float(window.loc[index, "low"])
        high = float(window.loc[index, "high"])
        if low <= min(float(window.loc[index - 1, "low"]), float(window.loc[index - 2, "low"])) and low <= min(
            float(window.loc[index + 1, "low"]),
            float(window.loc[index + 2, "low"]),
        ):
            lows.append(low)
        if high >= max(float(window.loc[index - 1, "high"]), float(window.loc[index - 2, "high"])) and high >= max(
            float(window.loc[index + 1, "high"]),
            float(window.loc[index + 2, "high"]),
        ):
            highs.append(high)

    latest_close = float(window.iloc[-1]["close"])
    supports = [level for level in _cluster_levels(lows, tolerance_percent) if level.price <= latest_close]
    resistances = [level for level in _cluster_levels(highs, tolerance_percent) if level.price >= latest_close]
    supports.sort(key=lambda level: (abs(latest_close - level.price), -level.touches))
    resistances.sort(key=lambda level: (abs(latest_close - level.price), -level.touches))

    return {
        "supports": [_level_to_dict(level) for level in supports[:5]],
        "resistances": [_level_to_dict(level) for level in resistances[:5]],
        "nearestSupport": round(supports[0].price, 8) if supports else None,
        "nearestResistance": round(resistances[0].price, 8) if resistances else None,
    }


def _cluster_levels(prices: list[float], tolerance_percent: float) -> list[Level]:
    clusters: list[list[float]] = []
    for price in sorted(prices):
        matched = False
        for cluster in clusters:
            average = sum(cluster) / len(cluster)
            tolerance = max(abs(average) * tolerance_percent, 1e-12)
            if abs(price - average) <= tolerance:
                cluster.append(price)
                matched = True
                break
        if not matched:
            clusters.append([price])

    return [
        Level(price=sum(cluster) / len(cluster), touches=len(cluster), strength=_strength(len(cluster)))
        for cluster in clusters
    ]


def _strength(touches: int) -> str:
    if touches >= 3:
        return "STRONG"
    if touches == 2:
        return "MEDIUM"
    return "WEAK"


def _level_to_dict(level: Level) -> dict[str, object]:
    return {
        "price": round(level.price, 8),
        "touches": level.touches,
        "strength": level.strength,
    }
