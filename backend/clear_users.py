import os
import sys

# Ensure Django settings module is loaded if needed, but not necessary for standalone python script
# Add current dir
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
    response = snaptrade.authentication.list_snap_trade_users()
    # SDK response might have body or be a list
    users = response.body if hasattr(response, 'body') else response
    print("RAW USERS:", users)
    if isinstance(users, dict) and 'items' in users:
        users = users['items']
    print("Users found:", len(users) if users else 0)
    for u in users:
        uid = u if isinstance(u, str) else None
        if not uid:
            uid = u.get('userId') if isinstance(u, dict) else getattr(u, 'user_id', None)
        if hasattr(u, 'id') and not uid:
            uid = getattr(u, 'id')
        print("Deleting:", uid)
        if uid:
            snaptrade.authentication.delete_snap_trade_user(user_id=uid)
    print("Cleaned up successfully.")
except Exception as e:
    import traceback
    traceback.print_exc()
