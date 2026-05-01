from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = "technical-agent-worker"
    min_candles: int = 200


settings = Settings()
