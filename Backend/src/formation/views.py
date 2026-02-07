from django.shortcuts import render

# Create your views here.

from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import Meeting, Formation, ZoomToken
from .serializers import FormationSerializer
from .serializers import MeetingSerializer
import requests
from django.conf import settings
from django.http import JsonResponse
# views.py
from django.conf import settings
from django.shortcuts import redirect
import base64
from django.views.decorators.csrf import csrf_exempt
import time

token=""

# Liste de toutes les formations
@api_view(['GET'])
def findAllFormations(request):
    formations = Formation.objects.all()
    serializer = FormationSerializer(formations, many=True)
    return Response(serializer.data)

# Créer une nouvelle formation
@api_view(['POST'])
def createFormation(request):
    data = request.data
    formation = Formation.objects.create(
        title=data['title'],
        description=data['description'],
        start_date=data['start_date'],
        end_date=data['end_date'],
        instructor=data['instructor']
    )
    serializer = FormationSerializer(formation, many=False)
    return Response(serializer.data)

# Mettre à jour une formation existante
@api_view(['PUT'])
def updateFormation(request):
    data = request.data
    formation = Formation.objects.get(pk=data['id'])
    formation.title = data['title']
    formation.description = data['description']
    formation.start_date = data['start_date']
    formation.end_date = data['end_date']
    formation.instructor = data['instructor']
    formation.save()
    serializer = FormationSerializer(formation, many=False)
    return Response(serializer.data)

# Supprimer une formation
@api_view(['DELETE'])
def deleteFormation(request, id):
    formation = Formation.objects.get(pk=id)
    formation.delete()
    return Response({'message': 'Formation deleted successfully'})


# Liste de toutes les réunions
@api_view(['GET'])
def findAllMeetings(request):
    meetings = Meeting.objects.all()
    serializer = MeetingSerializer(meetings, many=True)
    return Response(serializer.data)

# Créer une nouvelle réunion
@api_view(['POST'])
def createMeeting(request):
    data = request.data
    formation = Formation.objects.get(pk=data['formation'])
    meeting = Meeting.objects.create(
        title=data['title'],
        start_time=data['start_time'],
        end_time=data['end_time'],
        meeting_link=data['meeting_link'],
        formation=formation
    )
    serializer = MeetingSerializer(meeting, many=False)
    return Response(serializer.data)

# Mettre à jour une réunion existante
@api_view(['PUT'])
def updateMeeting(request):
    data = request.data
    meeting = Meeting.objects.get(pk=data['id'])
    meeting.title = data['title']
    meeting.start_time = data['start_time']
    meeting.end_time = data['end_time']
    meeting.meeting_link = data['meeting_link']
    meeting.status = data['status']
    meeting.formation = Formation.objects.get(pk=data['formation'])
    meeting.save()
    serializer = MeetingSerializer(meeting, many=False)
    return Response(serializer.data)

# Mettre à jour l'état d'une réunion (par exemple, "completed")
@api_view(['PUT'])
def updateMeetingStatus(request):
    data = request.data
    meeting = Meeting.objects.get(pk=data['id'])
    meeting.status = data['status']
    meeting.save()
    serializer = MeetingSerializer(meeting, many=False)
    return Response(serializer.data)

# Supprimer une réunion
@api_view(['DELETE'])
def deleteMeeting(request, id):
    meeting = Meeting.objects.get(pk=id)
    meeting.delete()
    return Response({'message': 'Meeting deleted successfully'})



# views.py
@csrf_exempt
def zoom_auth(request):
    client_id = settings.ZOOM_CLIENT_ID
    redirect_uri = settings.ZOOM_REDIRECT_URI
    zoom_oauth_url = f"https://zoom.us/oauth/authorize?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}"
    
    return redirect(zoom_oauth_url)

# Callback après authentification Zoom
@csrf_exempt
def zoom_callback(request):
    code = request.GET.get('code')
    request.session.modified = True
    if not code:
        print("Code manquant dans la requête de callback")
        return JsonResponse({'error': 'Code manquant'}, status=400)
    
    # Déboguer la requête de token
    try:
        # Échanger le code contre un token
        url = 'https://zoom.us/oauth/token'
        auth_str = f"{settings.ZOOM_CLIENT_ID}:{settings.ZOOM_CLIENT_SECRET}"
        headers = {
            'Authorization': f'Basic {base64.b64encode(auth_str.encode()).decode()}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': settings.ZOOM_REDIRECT_URI
        }
        
        print(f"Envoi de la requête à {url} avec les données: {data}")
        response = requests.post(url, headers=headers, data=data)
        print(f"Réponse reçue: statut {response.status_code}")
        
        if response.status_code != 200:
            print(f"Échec de l'obtention du token. Réponse: {response.text}")
            return JsonResponse({'error': 'Échec d\'obtention du token'}, status=400)
        
        token_data = response.json()
        
        # Stocker les tokens dans la session
        request.session.modified = True
        request.session['zoom_access_token'] = token_data['access_token']
        print(f"Token stocké en session: {token_data['access_token'][:10]}...")
        ZoomToken.objects.create(
            access_token=token_data['access_token'],
            refresh_token=token_data['refresh_token'],
            expires_in=token_data['expires_in'],
            token_type=token_data['token_type'],
            scope=token_data['scope']
        )
        token = token_data['access_token']
        print(f"Token stocké en session: {token_data['access_token'][:10]}...")
        
        # Vérifier que le token est bien dans la session
        if 'zoom_access_token' in request.session:
            print("Token correctement stocké en session")
        else:
            print("Échec du stockage du token en session")
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        print(f"Exception lors de l'authentification: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

# views.py
import os
@csrf_exempt
def create_meeting(request):
    # Récupérer le token depuis la session ou une alternative
    access_token = ZoomToken.objects.last().access_token
    print(f"Token récupéré depuis la session: {access_token}")
    
    # Si pas de token en session, essayer d'autres sources
    if not access_token:
        # Essayer d'utiliser un token stocké dans une variable d'environnement
        access_token = os.environ.get('ZOOM_ACCESS_TOKEN')
        
        if not access_token:
            return JsonResponse({'error': 'Token manquant'}, status=401)
    
    # Créer la réunion
    url = 'https://api.zoom.us/v2/users/me/meetings'
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'topic': 'Réunion Django-Zoom',
        'type': 2,  # Réunion planifiée
        'start_time': '2025-04-01T10:00:00',
        'duration': 60,  # minutes
        'timezone': 'Europe/Paris',
        'settings': {
            'host_video': True,
            'participant_video': True,
            'join_before_host': True,
            'waiting_room': False
        }
    }
    
    response = requests.post(url, headers=headers, json=data)
    return JsonResponse({"response": response.json()})
    if response.status_code != 201:
        return JsonResponse({'error': 'Échec de création de réunion'}, status=400)
    
    meeting_info = response.json()
    return JsonResponse({
        'id': meeting_info['id'],
        'join_url': meeting_info['join_url'],
        'start_url': meeting_info['start_url']
    })