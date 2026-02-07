from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.serializers import Serializer
from rest_framework.decorators import api_view

from personnel.models import Personnel, Service
from .serializers import TacheSerializer
from .models import Tache
from utilisateur.models import Utilisateur

# Create your views here.


@api_view(['GET'])
def findAllTache(request):
    tache = Tache.objects.all()
    serializer = TacheSerializer(tache, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def createTache(request):
    data = request.data
    personnel = Personnel.objects.get(pk=data['personnel'])
    service = Service.objects.get(pk=data['service'])
    utilisateur = Utilisateur.objects.get(pk=data['utilisateur'])
    tache = Tache.objects.create(nom=data['nom'], date_debut=data['date_debut'], date_fin=data['date_fin'],
                                 utilisateur=utilisateur, personnel=personnel, service=service, description=data["description"])
    serializer = TacheSerializer(tache, many=False)
    return Response(serializer.data)


@api_view(['PUT'])
def updateTache(request):
    data = request.data
    tache = Tache.objects.get(pk=data["id"])
    tache.date_debut = data["date_debut"]
    tache.date_fin = data["date_fin"]
    tache.nom = data["nom"]
    tache.description = data["description"]
    tache.personnel = Personnel.objects.get(pk=data['personnel'])
    tache.service = Service.objects.get(pk=data['service'])
    tache.save()
    serializer = TacheSerializer(tache, many=False)
    return Response(serializer.data)


@api_view(['PUT'])
def updateEtat(request):
    data = request.data
    tache = Tache.objects.get(pk=data["id"])
    tache.etat = data['etat']
    tache.save()
    serializer = TacheSerializer(tache, many=False)
    return Response(serializer.data)


@api_view(['DELETE'])
def deleteTache(request, id):
    tache = Tache.objects.get(pk=id)
    tache.delete()
    serializer = TacheSerializer(tache, many=False)
    return Response(serializer.data)
