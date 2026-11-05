from rest_framework import serializers
from .models import Event

class EventSerializer(serializers.ModelSerializer):
    time = serializers.DateTimeField(source='created_at', read_only=True, format="%Y-%m-%d %H:%M:%S")

    class Meta:
        model = Event
        fields = [
            'id',
            'app_id',
            'attack',
            'verdict',
            'severity',
            'evidence',
            'shield',
            'created_at',
            'time',
        ]
        read_only_fields = ['id', 'created_at', 'time']

    def validate_verdict(self, value):
        valid = ['blocked', 'leaked', 'passed']
        if value not in valid:
            raise serializers.ValidationError(f"verdict must be one of {valid}")
        return value

    def validate_severity(self, value):
        valid = ['critical', 'high', 'low']
        if value not in valid:
            raise serializers.ValidationError(f"severity must be one of {valid}")
        return value

    def validate_shield(self, value):
        valid = ['ON', 'OFF']
        if value not in valid:
            raise serializers.ValidationError(f"shield must be 'ON' or 'OFF'")
        return value
