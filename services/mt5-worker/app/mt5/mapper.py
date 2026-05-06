from datetime import datetime, timezone
from typing import Any, Dict


TRADE_MODE_MAP = {
    0: "DISABLED",
    1: "LONG_ONLY",
    2: "SHORT_ONLY",
    3: "CLOSE_ONLY",
    4: "FULL",
}


def _read(source: Any, name: str, default: Any = None) -> Any:
    if isinstance(source, dict):
        return source.get(name, default)
    return getattr(source, name, default)


def map_account_info(account: Any) -> Dict[str, Any]:
    return {
        "connected": True,
        "login": _read(account, "login"),
        "server": _read(account, "server"),
        "balance": float(_read(account, "balance", 0) or 0),
        "equity": float(_read(account, "equity", 0) or 0),
        "margin": float(_read(account, "margin", 0) or 0),
        "freeMargin": float(_read(account, "margin_free", 0) or 0),
        "currency": _read(account, "currency"),
    }


def map_symbol_info(symbol: Any) -> Dict[str, Any]:
    trade_mode = _read(symbol, "trade_mode", 0)
    return {
        "symbol": _read(symbol, "name"),
        "description": _read(symbol, "description"),
        "visible": bool(_read(symbol, "visible", False)),
        "tradeMode": TRADE_MODE_MAP.get(trade_mode, str(trade_mode)),
    }


def map_tick(symbol: str, tick: Any) -> Dict[str, Any]:
    bid = float(_read(tick, "bid", 0) or 0)
    ask = float(_read(tick, "ask", 0) or 0)
    timestamp = _read(tick, "time", None)
    if timestamp:
        time_value = datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()
    else:
        time_value = datetime.now(tz=timezone.utc).isoformat()
    return {
        "symbol": symbol,
        "bid": bid,
        "ask": ask,
        "spread": round(ask - bid, 10),
        "time": time_value,
    }
