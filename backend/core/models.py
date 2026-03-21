from django.db import models
from django.contrib.auth.models import User
import uuid

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    snaptrade_user_id = models.UUIDField(null=True, blank=True)
    snaptrade_secret = models.CharField(max_length=255, null=True, blank=True)
    total_alpha = models.DecimalField(max_digits=10, decimal_places=4, default=0.0)
    win_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)

    def __str__(self):
        return f"{self.user.username}'s Profile"

class Pitch(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('CLOSED', 'Closed'),
        ('TARGET_HIT', 'Target Hit'),
    ]

    author = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='pitches')
    ticker = models.CharField(max_length=10)
    entry_price = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    target_price = models.DecimalField(max_digits=10, decimal_places=4)
    spy_entry_price = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    current_alpha = models.DecimalField(max_digits=10, decimal_places=4, default=0.0)
    is_verified = models.BooleanField(default=False)
    content_body = models.TextField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.ticker} by {self.author.user.username}"

class PitchAttachment(models.Model):
    pitch = models.ForeignKey(Pitch, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='pitch_decks/', null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True, default='')
    file_size_bytes = models.BigIntegerField(null=True, blank=True)
    file_type = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def resolved_url(self):
        if self.file and hasattr(self.file, 'url'):
            return self.file.url
        return None

    def __str__(self):
        return f"Attachment for {self.pitch.ticker}"

class TradeEvent(models.Model):
    reader = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='trades_executed')
    pitch = models.ForeignKey(Pitch, on_delete=models.SET_NULL, null=True, related_name='triggered_trades')
    order_id = models.CharField(max_length=255, unique=True)
    revenue_generated = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    executed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Trade by {self.reader.user.username} for {self.pitch.ticker if self.pitch else 'Unknown'}"

class HiddenPitch(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='hidden_pitches')
    pitch = models.ForeignKey(Pitch, on_delete=models.CASCADE, related_name='hidden_by')
    hidden_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'pitch')

    def __str__(self):
        return f"{self.user.user.username} hid {self.pitch.ticker}"

class PortfolioSnapshot(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='portfolio_snapshots')
    total_value = models.DecimalField(max_digits=15, decimal_places=2)
    date = models.DateField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'date')

    def __str__(self):
        return f"{self.user.user.username} snapshot on {self.date}"
