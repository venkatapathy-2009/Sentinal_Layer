"""
Management command to create (or show) the dev API key.

Usage:
    python manage.py create_dev_apikey
    python manage.py create_dev_apikey --app-id my-bank-bot
"""
from django.conf import settings
from django.core.management.base import BaseCommand

from shield.models import APIKey


class Command(BaseCommand):
    help = "Create a development API key for testing the TrustShield API."

    def add_arguments(self, parser):
        parser.add_argument(
            "--app-id",
            default="demo-bank-bot",
            help="App ID to associate with the key (default: demo-bank-bot)",
        )

    def handle(self, *args, **options):
        app_id = options["app_id"]
        dev_key = getattr(settings, "TRUSTSHIELD_DEFAULT_API_KEY", "ts-dev-key-123")

        obj, created = APIKey.objects.get_or_create(
            app_id=app_id,
            defaults={"key": dev_key, "owner_name": "Dev Team"},
        )
        if created:
            self.stdout.write(self.style.SUCCESS(
                f"✅ Created API key for '{app_id}': {obj.key}"
            ))
        else:
            self.stdout.write(self.style.WARNING(
                f"ℹ️  API key for '{app_id}' already exists: {obj.key}"
            ))

