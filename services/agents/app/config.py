from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = "technical-agent-worker"
    min_candles: int = 200
    technical_sr_lookback: int = 100
    technical_sr_tolerance_percent: float = 0.002
    technical_low_vol_atr_percent: float = 0.003
    technical_high_vol_atr_percent: float = 0.03
    technical_enable_multi_timeframe: bool = True


settings = Settings()
