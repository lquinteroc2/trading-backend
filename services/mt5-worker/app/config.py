from functools import lru_cache
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    enable_live_trading: bool = False
    mt5_login: Optional[int] = None
    mt5_password: Optional[str] = None
    mt5_server: Optional[str] = None
    mt5_terminal_path: Optional[str] = None
    mt5_dry_run: bool = True
    mt5_request_timeout_ms: int = 10000

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("mt5_login", "mt5_password", "mt5_server", "mt5_terminal_path", mode="before")
    @classmethod
    def blank_to_none(cls, value):
        if value == "":
            return None
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
