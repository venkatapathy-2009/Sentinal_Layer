"""
URL routing for the TrustShield API — mounted at /v1/ in the root URLconf.
"""
from django.urls import path
from . import views

app_name = "shield"

urlpatterns = [
    path("check", views.check_message, name="check"),
    path("events", views.events, name="events"),
    path("login", views.login_developer, name="login"),
    path("garak-scan", views.garak_scan, name="garak_scan"),
    path("telegram-status", views.telegram_status, name="telegram_status"),
    path("telegram-setup", views.telegram_setup, name="telegram_setup"),
]

