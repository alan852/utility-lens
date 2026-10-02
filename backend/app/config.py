from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    app_name: str = "UtilityLens API"
    environment: str = "development"
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./utilities.db")
    node: str = os.getenv("NODE", os.getenv("node", os.getenv("NODE_ENV", "development")))
    
    # UK Gas Calorific Defaults (Configurable)
    default_gas_volume_correction: float = 1.02264
    default_gas_calorific_value: float = 40.0
    default_gas_conversion_factor: float = 3.6
    
    # Currency
    default_currency_symbol: str = "£"

    @property
    def is_production(self) -> bool:
        node_val = (self.node or "").strip().lower()
        env_val = (self.environment or "").strip().lower()
        return node_val == "production" or env_val == "production"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
