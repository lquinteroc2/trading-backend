from app.schemas.technical_analysis import MarketDirection


def analyze_multi_timeframe(
    primary: str,
    bias_by_timeframe: dict[str, MarketDirection],
) -> dict[str, object]:
    primary_bias = bias_by_timeframe.get(primary, MarketDirection.NEUTRAL)
    confirmations = [timeframe for timeframe in bias_by_timeframe.keys() if timeframe != primary]
    directional_confirmations = [
        bias for timeframe, bias in bias_by_timeframe.items() if timeframe != primary and bias != MarketDirection.NEUTRAL
    ]

    if not directional_confirmations or primary_bias == MarketDirection.NEUTRAL:
        alignment = "PARTIAL"
    elif all(bias == primary_bias for bias in directional_confirmations):
        alignment = "ALIGNED"
    elif any(bias != primary_bias for bias in directional_confirmations):
        alignment = "CONFLICTED"
    else:
        alignment = "PARTIAL"

    return {
        "primary": primary,
        "confirmationTimeframes": confirmations,
        "alignment": alignment,
        "biasByTimeframe": {timeframe: bias.value for timeframe, bias in bias_by_timeframe.items()},
    }
