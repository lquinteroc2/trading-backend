from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app


def override_settings() -> Settings:
    return Settings(enable_live_trading=False, mt5_dry_run=True)


app.dependency_overrides[get_settings] = override_settings
client = TestClient(app)


def test_health_responds():
    assert client.get("/health").json() == {"status": "ok", "service": "mt5-worker"}


def test_dry_run_validates_payload():
    response = client.post(
        "/mt5/orders/dry-run",
        json={
            "symbol": "XAUUSD",
            "direction": "BUY",
            "volume": 0.01,
            "entryPrice": 2320.35,
            "stopLoss": 2315,
            "takeProfit": 2330,
        },
    )

    assert response.status_code == 200
    assert response.json()["dryRun"] is True
    assert response.json()["wouldExecute"] is True


def test_place_order_blocks_when_live_disabled():
    response = client.post(
        "/mt5/orders/place",
        json={
            "symbol": "XAUUSD",
            "direction": "BUY",
            "volume": 0.01,
            "entryPrice": 2320.35,
            "stopLoss": 2315,
            "takeProfit": 2330,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"blocked": True, "reason": "Live trading is disabled"}
