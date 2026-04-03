"""Shared third-party API clients. Import from here instead of instantiating in each module."""
import os

try:
    from snaptrade_client import SnapTrade  # type: ignore
except ImportError:
    SnapTrade = type('SnapTrade', (object,), {'__new__': lambda cls, **k: None})

import finnhub  # type: ignore

snaptrade = SnapTrade(
    client_id=os.getenv('SNAPTRADE_CLIENT_ID', ''),
    consumer_key=os.getenv('SNAPTRADE_CONSUMER_KEY', '')
)

finnhub_client = finnhub.Client(api_key=os.getenv('FINNHUB_API_KEY', ''))
