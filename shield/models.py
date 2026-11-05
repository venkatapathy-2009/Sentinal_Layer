"""
TrustShield models — API keys and security events.
"""
import uuid
from django.db import models


class APIKey(models.Model):
    """
    API key for authenticating app owners against the Shield API.
    Each key is tied to an app_id so we can scope events per app.
    """
    key = models.CharField(max_length=64, unique=True, db_index=True)
    app_id = models.CharField(max_length=128, unique=True)
    owner_name = models.CharField(max_length=255, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "API Key"
        verbose_name_plural = "API Keys"

    def __str__(self):
        return f"{self.app_id} ({self.key[:8]}...)"

    @classmethod
    def generate(cls, app_id: str, owner_name: str = "") -> "APIKey":
        """Create a new API key for the given app."""
        key = uuid.uuid4().hex  # 32-char hex token
        return cls.objects.create(key=key, app_id=app_id, owner_name=owner_name)


class SecurityEvent(models.Model):
    """
    A logged security event — either from the attacker/scanner (POST)
    or from the shield check itself.
    """
    SEVERITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    app_id = models.CharField(max_length=128, db_index=True)
    attack = models.TextField(help_text="Description or payload of the attack")
    verdict = models.CharField(
        max_length=32,
        help_text="e.g. blocked, leaked, passed",
    )
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES, default="medium")
    evidence = models.TextField(blank=True, default="", help_text="Raw evidence / model output")
    shield_active = models.BooleanField(
        default=False,
        help_text="Was the shield ON when this event was recorded?",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Security Event"
        verbose_name_plural = "Security Events"

    def __str__(self):
        return f"[{self.severity}] {self.app_id} - {self.verdict}"
