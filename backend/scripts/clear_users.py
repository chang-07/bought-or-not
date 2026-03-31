import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from snaptrade_client import SnapTrade

client_id = os.getenv('SNAPTRADE_CLIENT_ID', 'PERS-S97OUB5333YF4CY9UY1Q')
consumer_key = os.getenv('SNAPTRADE_CONSUMER_KEY', 's5uWDyXQ8yUIkKiHowV5aXZjj4txpqEtnqCxjozWqfeKii2h8h')

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
