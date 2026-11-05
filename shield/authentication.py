"""
Custom API-key authentication via the X-API-Key header.
"""
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import APIKey


class APIKeyUser:
    """Lightweight user-like object. DRF needs request.user to be truthy."""

    def __init__(self, api_key):
        self.api_key = api_key
        self.app_id = api_key.app_id
        self.is_authenticated = True

    def __str__(self):
        return f"APIKeyUser({self.app_id})"


class APIKeyAuthentication(BaseAuthentication):
    """Authenticate requests using the X-API-Key header."""

    HEADER = "HTTP_X_API_KEY"

    def authenticate(self, request):
        # 1. Header: X-API-Key
        key = request.META.get(self.HEADER)

        # 2. Query param fallback: ?api_key=... or ?key=... (convenient for browser tabs)
        if not key:
            key = request.GET.get("api_key") or request.GET.get("key")

        # 3. Dev fallback for GET requests when testing in browser
        if not key and request.method == "GET":
            from django.conf import settings
            dev_key = getattr(settings, "TRUSTSHIELD_DEFAULT_API_KEY", "ts-dev-key-123")
            api_key = APIKey.objects.filter(key=dev_key, is_active=True).first()
            if api_key:
                return (APIKeyUser(api_key), dev_key)

        if not key:
            return None

        try:
            api_key = APIKey.objects.get(key=key, is_active=True)
        except APIKey.DoesNotExist:
            raise AuthenticationFailed("Invalid or inactive API key.")

        return (APIKeyUser(api_key), key)

