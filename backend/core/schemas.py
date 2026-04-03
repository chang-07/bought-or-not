"""
Ninja Schema definitions for all API endpoints.
"""

from ninja import Schema


class LoginSchema(Schema):
    username: str
    password: str


class CreateUserSchema(Schema):
    username: str
    password: str
    email: str


class AuthResponse(Schema):
    success: bool
    user_id: int | None = None
    username: str | None = None
    snaptrade_connected: bool = False
    token: str | None = None


class PitchCreateSchema(Schema):
    ticker: str
    target_price: float
    content_body: str


class PitchResponseSchema(Schema):
    id: int
    ticker: str
    author_username: str
    target_price: float
    entry_price: float | None
    status: str
    is_verified: bool
    is_mine: bool
    content_body: str
    deck_url: str | None


class ExecuteTradeSchema(Schema):
    account_id: str
    units: float = 1.0


class SellTradeSchema(Schema):
    account_id: str
    symbol: str
    units: float
