from django.contrib import admin
from .models import APIKey, SecurityEvent


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ("app_id", "key", "owner_name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("app_id", "owner_name")


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    list_display = ("id", "app_id", "verdict", "severity", "shield_active", "created_at")
    list_filter = ("severity", "verdict", "shield_active")
    search_fields = ("app_id", "attack")
    readonly_fields = ("id", "created_at")
