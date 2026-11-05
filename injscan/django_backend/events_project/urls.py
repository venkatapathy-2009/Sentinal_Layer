from django.urls import path, include, re_path
from django.http import HttpResponse, JsonResponse
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DASHBOARD_INDEX = BASE_DIR.parent / 'dashboard' / 'index.html'

def root_dashboard_view(request):
    if DASHBOARD_INDEX.exists():
        with open(DASHBOARD_INDEX, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')
    return JsonResponse({
        "status": "online",
        "service": "InjScan Django Telemetry API",
        "endpoints": {
            "post_event": "POST /v1/events",
            "get_events": "GET /v1/events"
        }
    })

urlpatterns = [
    path('', root_dashboard_view, name='root-dashboard'),
    path('dashboard/', root_dashboard_view, name='dashboard-view'),
    path('', include('events.urls')),
]
