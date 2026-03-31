import os
import sys

# Add backend to sys path so we can import things
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from snaptrade_client import SnapTrade
    snaptrade = SnapTrade(
        client_id="123",
        consumer_key="123"
    )
    print("Type of snaptrade:", type(snaptrade))
    print("Attributes:", dir(snaptrade))
    if hasattr(snaptrade, 'authentication'):
        print("Authentication type:", type(snaptrade.authentication))
    else:
        print("NO authentication attribute on SnapTrade instance")
except Exception as e:
    print("Exception during init:", str(e))
