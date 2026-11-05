from django.db import models

class Event(models.Model):
    VERDICT_CHOICES = [
        ('blocked', 'Blocked'),
        ('leaked', 'Leaked'),
        ('passed', 'Passed'),
    ]

    SEVERITY_CHOICES = [
        ('critical', 'Critical'),
        ('high', 'High'),
        ('low', 'Low'),
    ]

    SHIELD_CHOICES = [
        ('ON', 'ON'),
        ('OFF', 'OFF'),
    ]

    app_id = models.CharField(max_length=255)
    attack = models.TextField()
    verdict = models.CharField(max_length=50, choices=VERDICT_CHOICES)
    severity = models.CharField(max_length=50, choices=SEVERITY_CHOICES)
    evidence = models.TextField(blank=True, default='')
    shield = models.CharField(max_length=10, choices=SHIELD_CHOICES, default='ON')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.verdict.upper()}] {self.app_id} - {self.severity} ({self.created_at})"
