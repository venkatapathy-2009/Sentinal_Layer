from django.contrib import admin
from .models import DetectionRule, ScanLog


@admin.register(DetectionRule)
class DetectionRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "risk_score", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "pattern", "reason")
    list_editable = ("is_active", "risk_score")


@admin.register(ScanLog)
class ScanLogAdmin(admin.ModelAdmin):
    list_display = ("app_id", "risk_score", "allowed", "created_at")
    list_filter = ("allowed",)
    search_fields = ("app_id", "user_message")
    readonly_fields = ("created_at",)
