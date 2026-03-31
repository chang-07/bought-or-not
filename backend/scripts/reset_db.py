import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vspp.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import UserProfile, Pitch
from snaptrade_client import SnapTrade

print("Starting FINAL database wipe...")

# 1. Clear SnapTrade Users (Personal Key Slot)
client_id = os.getenv('SNAPTRADE_CLIENT_ID')
consumer_key = os.getenv('SNAPTRADE_CONSUMER_KEY')

if client_id and consumer_key:
    try:
        snaptrade = SnapTrade(client_id=client_id, consumer_key=consumer_key)
        users_res = snaptrade.authentication.list_snap_trade_users()
        users_list = getattr(users_res, 'body', users_res)
        if not isinstance(users_list, list): users_list = [users_list] if users_list else []
        
        for old_uid in users_list:
            uid_str = old_uid.get('userId') if isinstance(old_uid, dict) else str(old_uid)
            if uid_str:
                print(f"Deleting SnapTrade user: {uid_str}")
                snaptrade.authentication.delete_snap_trade_user(user_id=uid_str)
    except Exception as e:
        print(f"SnapTrade cleanup failed: {e}")

# 2. Clear Django DB (cascade deletes profiles/pitches)
deleted_count, _ = User.objects.all().delete()

print(f"Successfully deleted {deleted_count} Django user-related objects.")
print("Final Database Reset Complete.")
