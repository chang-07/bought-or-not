import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vspp.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import UserProfile, Pitch

print("Starting one-off database wipe...")

# Delete all Users (this will cascade to UserProfile and Pitch due to ForeignKey rules)
deleted_count, _ = User.objects.all().delete()

print(f"Successfully deleted {deleted_count} user-related objects.")
print("Database is now clean.")
