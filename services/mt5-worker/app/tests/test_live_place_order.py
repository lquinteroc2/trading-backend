from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.mt5.client import Mt5Client
from app.mt5.exceptions import Mt5NotConnectedError
from app.schemas.order import OrderRequest


def order_request() -> OrderRequest:
    return OrderRequest(
        symbol="XAUUSD",
        direction="BUY",
        volume=0.01,
        entryPrice=2320.35,
        stopLoss=2315,
        takeProfit=2330,
        comment="INVERSIONES_LIVE_LIMITED",
    )


def test_place_order_blocks_when_live_disabled():
    client = Mt5Client(Settings(enable_live_trading=False, mt5_dry_run=False))

    assert client.place_order(order_request()) == {
        "blocked": True,
        "reason": "Live trading is disabled",
    }


def test_place_order_blocks_when_dry_run_active():
    client = Mt5Client(Settings(enable_live_trading=True, mt5_dry_run=True))

    assert client.place_order(order_request()) == {
        "blocked": True,
        "reason": "Live trading is disabled",
    }


def test_place_order_validates_invalid_payload():
    with pytest.raises(ValidationError):
        OrderRequest(
            symbol="XAUUSD",
            direction="BUY",
            volume=0,
            entryPrice=2320.35,
        )


def test_place_order_normalizes_mt5_response():
    class FakeMt5:
        ORDER_TYPE_BUY = 0
        ORDER_TYPE_SELL = 1
        TRADE_ACTION_DEAL = 1
        ORDER_TIME_GTC = 0
        ORDER_FILLING_IOC = 1
        TRADE_RETCODE_DONE = 10009

        def initialize(self, **kwargs):
            return True

        def symbol_select(self, symbol, visible):
            return True

        def symbol_info_tick(self, symbol):
            return SimpleNamespace(bid=2320.15, ask=2320.4)

        def order_send(self, payload):
            return SimpleNamespace(retcode=10009, order=123456, price=2320.4)

    client = Mt5Client(Settings(enable_live_trading=True, mt5_dry_run=False))
    client._mt5 = FakeMt5()

    response = client.place_order(order_request())

    assert response["executed"] is True
    assert response["brokerOrderId"] == "123456"
    assert response["symbol"] == "XAUUSD"
    assert response["executedPrice"] == 2320.4


def test_place_order_handles_broker_error():
    class FakeMt5:
        ORDER_TYPE_BUY = 0
        ORDER_TYPE_SELL = 1
        TRADE_ACTION_DEAL = 1
        ORDER_TIME_GTC = 0
        ORDER_FILLING_IOC = 1
        TRADE_RETCODE_DONE = 10009

        def initialize(self, **kwargs):
            return True

        def symbol_select(self, symbol, visible):
            return True

        def symbol_info_tick(self, symbol):
            return SimpleNamespace(bid=2320.15, ask=2320.4)

        def order_send(self, payload):
            return SimpleNamespace(retcode=10030, comment="invalid stops")

    client = Mt5Client(Settings(enable_live_trading=True, mt5_dry_run=False))
    client._mt5 = FakeMt5()

    with pytest.raises(Mt5NotConnectedError):
        client.place_order(order_request())
