import base64
import os

import requests
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from utilisateur.permissions import IsRH

from .models import Formation, Meeting, ZoomToken
from .serializers import FormationSerializer, MeetingSerializer


# ---------------------------------------------------------------------------
# DRF ViewSets
# ---------------------------------------------------------------------------

class FormationViewSet(ModelViewSet):
    queryset = Formation.objects.prefetch_related('meetings').all()
    serializer_class = FormationSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsRH()]
        return [IsAuthenticated()]


class MeetingViewSet(ModelViewSet):
    queryset = Meeting.objects.select_related('formation').all()
    serializer_class = MeetingSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsRH()]
        return [IsAuthenticated()]


# ---------------------------------------------------------------------------
# Zoom integration (function-based views)
# ---------------------------------------------------------------------------

@csrf_exempt
def zoom_auth(request):
    """Redirect user to Zoom OAuth2 authorization page."""
    client_id = settings.ZOOM_CLIENT_ID
    redirect_uri = settings.ZOOM_REDIRECT_URI
    zoom_oauth_url = (
        f"https://zoom.us/oauth/authorize"
        f"?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}"
    )
    return redirect(zoom_oauth_url)


@csrf_exempt
def zoom_callback(request):
    """Handle Zoom OAuth2 callback and store tokens."""
    code = request.GET.get('code')
    if not code:
        return JsonResponse({'error': 'Code manquant'}, status=400)

    try:
        url = 'https://zoom.us/oauth/token'
        auth_str = f"{settings.ZOOM_CLIENT_ID}:{settings.ZOOM_CLIENT_SECRET}"
        headers = {
            'Authorization': f'Basic {base64.b64encode(auth_str.encode()).decode()}',
            'Content-Type': 'application/x-www-form-urlencoded',
        }
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': settings.ZOOM_REDIRECT_URI,
        }

        response = requests.post(url, headers=headers, data=data)
        if response.status_code != 200:
            return JsonResponse({'error': "Echec d'obtention du token"}, status=400)

        token_data = response.json()

        ZoomToken.objects.create(
            access_token=token_data['access_token'],
            refresh_token=token_data['refresh_token'],
            expires_in=token_data['expires_in'],
            token_type=token_data['token_type'],
            scope=token_data['scope'],
        )

        return JsonResponse({'success': True})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def create_meeting(request):
    """Create a Zoom meeting using the latest stored token."""
    zoom_token = ZoomToken.objects.last()
    access_token = zoom_token.access_token if zoom_token else None

    if not access_token:
        access_token = os.environ.get('ZOOM_ACCESS_TOKEN')

    if not access_token:
        return JsonResponse({'error': 'Token manquant'}, status=401)

    url = 'https://api.zoom.us/v2/users/me/meetings'
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
    }
    data = {
        'topic': 'Réunion Smart-HR',
        'type': 2,
        'start_time': '2025-04-01T10:00:00',
        'duration': 60,
        'timezone': 'Europe/Paris',
        'settings': {
            'host_video': True,
            'participant_video': True,
            'join_before_host': True,
            'waiting_room': False,
        },
    }

    response = requests.post(url, headers=headers, json=data)

    if response.status_code != 201:
        return JsonResponse({'error': 'Echec de création de réunion'}, status=400)

    meeting_info = response.json()
    return JsonResponse({
        'id': meeting_info['id'],
        'join_url': meeting_info['join_url'],
        'start_url': meeting_info['start_url'],
    })
