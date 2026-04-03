from django.contrib import admin
from .models import UserProfile, Pitch, PitchAttachment, TradeEvent


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "snaptrade_user_id")


@admin.register(Pitch)
class PitchAdmin(admin.ModelAdmin):
    list_display = ("ticker", "author", "status", "is_verified", "created_at")
    list_filter = ("status", "is_verified")
    search_fields = ("ticker", "author__user__username")


@admin.register(PitchAttachment)
class PitchAttachmentAdmin(admin.ModelAdmin):
    list_display = ("pitch", "file_type", "created_at")


@admin.register(TradeEvent)
class TradeEventAdmin(admin.ModelAdmin):
    list_display = ("reader", "pitch", "order_id", "revenue_generated", "executed_at")
