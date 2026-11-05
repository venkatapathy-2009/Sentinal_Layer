from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Event
from .serializers import EventSerializer

EXPECTED_API_KEY = "ts-dev-key-123"

def is_authorized(request):
    key = request.headers.get("X-API-Key") or request.headers.get("x-api-key") or request.META.get("HTTP_X_API_KEY")
    return key == EXPECTED_API_KEY

class EventListCreateAPIView(APIView):
    """
    Contract Endpoints:
    POST /v1/events -> Saves event, returns 201 on success
    GET /v1/events  -> Returns JSON array of all saved events, newest first
    """

    def get(self, request, *args, **kwargs):
        if not is_authorized(request):
            return Response(
                {"error": "Unauthorized: Missing or invalid X-API-Key header"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        events = Event.objects.all().order_by('-created_at')
        serializer = EventSerializer(events, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        if not is_authorized(request):
            return Response(
                {"error": "Unauthorized: Missing or invalid X-API-Key header"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = EventSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
