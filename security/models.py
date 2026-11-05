"""
security/models.py
==================
Future home for Member 3's detection engine data:
  - DetectionRule: editable rules/patterns stored in DB (policy engine)
  - ScanLog: log of every check_text() call with inputs + outputs (audit trail)

TODAY: empty stubs so migrations work cleanly.
TOMORROW: Member 3 adds model fields as needed.
"""
from django.db import models


class DetectionRule(models.Model):
    """
    A named, database-editable detection rule.
    Member 3 / policy engine: rules can be edited from Django admin
    without redeploying code.
    """
    name = models.CharField(max_length=255, unique=True)
    pattern = models.TextField(help_text="Regex or keyword pattern")
    risk_score = models.IntegerField(
        default=40,
        help_text="Risk points added when this rule matches (0-100)"
    )
    reason = models.CharField(
        max_length=255,
        help_text="Human-readable explanation shown in API reasons[]"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Detection Rule"
        verbose_name_plural = "Detection Rules"
        ordering = ["-risk_score"]

    def __str__(self):
        return f"[{self.risk_score}] {self.name}"


class ScanLog(models.Model):
    """
    Audit trail of every call to check_text() / POST /v1/check.
    Useful for Member 4 (attacker) to review which payloads got through.
    """
    app_id = models.CharField(max_length=128, db_index=True)
    user_message = models.TextField()
    context = models.TextField(blank=True, default="")
    risk_score = models.IntegerField()
    reasons = models.JSONField(default=list)
    allowed = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Scan Log"
        verbose_name_plural = "Scan Logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[risk={self.risk_score}] {self.app_id} @ {self.created_at:%Y-%m-%d %H:%M}"
