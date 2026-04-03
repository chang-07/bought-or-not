import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from snaptrade_client import SnapTrade

client_id = os.getenv('SNAPTRADE_CLIENT_ID', '')
consumer_key = os.getenv('SNAPTRADE_CONSUMER_KEY', '')

if not client_id or not consumer_key:
    print("Error: SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY env vars are required.")
    sys.exit(1)

print("Using client_id:", client_id)
snaptrade = SnapTrade(
    client_id=client_id,
    consumer_key=consumer_key
)

try:
    # SDK v11: response.body is a list of user ID strings
    response = snaptrade.authentication.list_snap_trade_users()
    users = response.body
    print("Users found:", len(users) if users else 0)
    for user_id in users:
        print("Deleting:", user_id)
        snaptrade.authentication.delete_snap_trade_user(user_id=user_id)
    print("Cleaned up successfully.")
except Exception as e:
    import traceback
    traceback.print_exc()
