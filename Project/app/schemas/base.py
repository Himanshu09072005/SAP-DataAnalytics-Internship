
from decimal import Decimal
from typing import Any

from bson.decimal128 import Decimal128
from pydantic import BaseModel, EmailStr, model_validator


def _normalize_mongo_values(value: Any) -> Any:
    """Convert BSON-specific values to types supported by Pydantic."""
    if isinstance(value, Decimal128):
        return value.to_decimal()

    if isinstance(value, dict):
        return {
            key: _normalize_mongo_values(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [_normalize_mongo_values(item) for item in value]

    if isinstance(value, tuple):
        return tuple(_normalize_mongo_values(item) for item in value)

    return value


class MongoBaseModel(BaseModel):
    """Pydantic base model that accepts MongoDB BSON Decimal128 values."""

    @model_validator(mode="before")
    @classmethod
    def normalize_bson_values(cls, value: Any) -> Any:
        return _normalize_mongo_values(value)
