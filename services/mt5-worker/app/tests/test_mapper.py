from types import SimpleNamespace

from app.mt5.mapper import map_account_info, map_symbol_info, map_tick


def test_map_account_info():
    account = SimpleNamespace(
        login=123456,
        server="Broker-Demo",
        balance=10000,
        equity=10000,
        margin=0,
        margin_free=10000,
        currency="USD",
    )

    assert map_account_info(account) == {
        "connected": True,
        "login": 123456,
        "server": "Broker-Demo",
        "balance": 10000.0,
        "equity": 10000.0,
        "margin": 0.0,
        "freeMargin": 10000.0,
        "currency": "USD",
    }


def test_map_symbol_info():
    symbol = SimpleNamespace(
        name="XAUUSD",
        description="Gold vs US Dollar",
        visible=True,
        trade_mode=4,
    )

    assert map_symbol_info(symbol) == {
        "symbol": "XAUUSD",
        "description": "Gold vs US Dollar",
        "visible": True,
        "tradeMode": "FULL",
    }


def test_map_tick():
    tick = SimpleNamespace(bid=2320.12, ask=2320.35, time=1760000000)

    mapped = map_tick("XAUUSD", tick)

    assert mapped["symbol"] == "XAUUSD"
    assert mapped["bid"] == 2320.12
    assert mapped["ask"] == 2320.35
    assert mapped["spread"] == 0.23
    assert mapped["time"].startswith("2025-10-09")
