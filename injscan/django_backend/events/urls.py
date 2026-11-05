from django.urls import path, re_path
from .views import EventListCreateAPIView

urlpatterns = [
    re_path(r'^v1/events/?$', EventListCreateAPIView.as_view(), name='events-list-create'),
]
