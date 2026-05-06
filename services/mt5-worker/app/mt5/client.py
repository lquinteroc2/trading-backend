from typing import Any, Dict

from app.config import Settings
from app.mt5.exceptions import Mt5NotConnectedError, Mt5UnavailableError
from app.mt5.mapper import map_account_info, map_symbol_info, map_tick
from app.schemas.order import OrderRequest


class Mt5Client:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._mt5 = None

    def _load_mt5(self) -> Any:
        try:
            import MetaTrader5 as mt5  # type: ignore

            return mt5
        except Exception as exc:  # pragma: no cover - depends on local terminal/runtime
            raise Mt5UnavailableError(f"MetaTrader5 package is unavailable: {exc}") from exc

    def connect(self) -> bool:
        kwargs: Dict[str, Any] = {}
        if self.settings.mt5_terminal_path:
            kwargs["path"] = self.settings.mt5_terminal_path
        if self.settings.mt5_login:
            kwargs["login"] = self.settings.mt5_login
        if self.settings.mt5_password:
            kwargs["password"] = self.settings.mt5_password
        if self.settings.mt5_server:
            kwargs["server"] = self.settings.mt5_server
        return bool(self._mt5.initialize(**kwargs))

    def shutdown(self) -> None:
        self._mt5.shutdown()

    def account_info(self) -> Dict[str, Any]:
        self._ensure_connected()
        account = self._mt5.account_info()
        if account is None:
            raise Mt5NotConnectedError("MT5 account is not connected")
        return map_account_info(account)

    def symbols(self) -> Dict[str, Any]:
        self._ensure_connected()
        symbols = self._mt5.symbols_get() or []
        return {"symbols": [map_symbol_info(symbol) for symbol in symbols]}

    def price(self, symbol: str) -> Dict[str, Any]:
        self._ensure_connected()
        self._mt5.symbol_select(symbol, True)
        tick = self._mt5.symbol_info_tick(symbol)
        if tick is None:
            raise Mt5NotConnectedError(f"No tick available for {symbol}")
        return map_tick(symbol, tick)

    def dry_run_order(self, request: OrderRequest) -> Dict[str, Any]:
        return {
            "dryRun": True,
            "wouldExecute": True,
            "reason": "Dry-run validated successfully",
            "request": request.model_dump(),
        }

    def place_order(self, request: OrderRequest) -> Dict[str, Any]:
        if not self.settings.enable_live_trading or self.settings.mt5_dry_run:
            return {"blocked": True, "reason": "Live trading is disabled"}
        return {
            "blocked": True,
            "reason": "Live trading is not implemented in Sprint 13",
            "request": request.model_dump(),
        }

    def _ensure_connected(self) -> None:
        if self._mt5 is None:
            self._mt5 = self._load_mt5()
        if not self.connect():
            raise Mt5NotConnectedError("Could not initialize MT5 terminal/session")
