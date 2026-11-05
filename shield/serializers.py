"""
DRF serializers for the TrustShield API contract.
"""
from rest_framework import serializers
from .models import SecurityEvent


class CheckRequestSerializer(serializers.Serializer):
    """Validates incoming body for POST /v1/check."""
    app_id = serializers.CharField(max_length=128)
    user_message = serializers.CharField()
    context = serializers.CharField(required=False, default="", allow_blank=True)
    shield_active = serializers.BooleanField(required=False, default=True)


class CheckResponseSerializer(serializers.Serializer):
    """Shape of the /v1/check response."""
    allowed = serializers.BooleanField()
    risk = serializers.IntegerField(min_value=0, max_value=100)
    reasons = serializers.ListField(child=serializers.CharField())


class EventCreateSerializer(serializers.ModelSerializer):
    """Validates incoming body for POST /v1/events."""

    class Meta:
        model = SecurityEvent
        fields = ["app_id", "attack", "verdict", "severity", "evidence", "shield_active"]


class EventReadSerializer(serializers.ModelSerializer):
    """Read-only representation returned by GET /v1/events."""

    class Meta:
        model = SecurityEvent
        fields = [
            "id", "app_id", "attack", "verdict",
            "severity", "evidence", "shield_active", "created_at",
        ]
        read_only_fields = fields

