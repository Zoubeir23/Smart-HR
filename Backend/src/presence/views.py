from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Presence, Personnel
from .serializers import PresenceSerializer

@api_view(['GET'])
def findAllPresence(request):
    """Récupère toutes les présences"""
    presences = Presence.objects.all().order_by('-date_jour')
    serializer = PresenceSerializer(presences, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def createPresence(request):
    """Crée une nouvelle entrée de présence"""
    data = request.data
    personnel = Personnel.objects.get(pk=data['personnel'])
    
    presence = Presence.objects.create(
        personnel=personnel,
        date_jour=data['date_jour'],
        heure_arrivee=data.get('heure_arrivee'),
        heure_depart=data.get('heure_depart'),
        statut=data['statut'],
        commentaire=data.get('commentaire', '')
    )
    serializer = PresenceSerializer(presence, many=False)
    return Response(serializer.data)

@api_view(['PUT'])
def updatePresence(request):
    """Met à jour une présence existante"""
    data = request.data
    presence = Presence.objects.get(pk=data["id"])
    
    presence.date_jour = data["date_jour"]
    presence.heure_arrivee = data.get("heure_arrivee")
    presence.heure_depart = data.get("heure_depart")
    presence.statut = data["statut"]
    presence.commentaire = data.get("commentaire", '')
    presence.save()
    
    serializer = PresenceSerializer(presence, many=False)
    return Response(serializer.data)

@api_view(['DELETE'])
def deletePresence(request, id):
    """Supprime une présence"""
    presence = Presence.objects.get(pk=id)
    presence.delete()
    return Response({"message": "Présence supprimée avec succès"})
