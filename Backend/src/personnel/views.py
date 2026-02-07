from asyncio.windows_events import NULL
from django.shortcuts import render
from .models import Personnel, Fonction, Service
from .serializers import PersonnelSerializer, ServiceSerializer, FonctionSerializer
from utilisateur.models import Utilisateur
from rest_framework.response import Response
from rest_framework.serializers import Serializer
from rest_framework.decorators import api_view
# Create your views here.

#Gestion personnel
@api_view(['GET'])
def findAllPersonnel(request):
    personnel=Personnel.objects.all()
    serializer=PersonnelSerializer(personnel,many=True)
    return Response(serializer.data)

@api_view(['POST'])
def createPersonnel(request, id):
    print(id)
    data=request.data
    utilisateur=Utilisateur.objects.get(pk=id)
    fonction=Fonction.objects.get(pk=data['fonction'])
    service=None
    if(int(data['service'])>0):
        service=Service.objects.get(pk=data['service'])
    personnel=Personnel.objects.create(utilisateur=utilisateur, service=service, fonction=fonction,date_naissance=data['ddn'], nom=data['nom'], prenom=data['prenom'], tel=data['tel'], cin=data['cin'])

    serializer=PersonnelSerializer(personnel,many=False)
    return Response(serializer.data)

@api_view(['PUT'])
def updatePersonnel(request):
    data=request.data
    personnel=Personnel.objects.get(pk=data['id'])
    personnel.cin=data["cin"]
    personnel.tel=data["tel"]
    personnel.nom=data["nom"]
    personnel.date_naissance=data["ddn"]
    personnel.prenom=data["prenom"]
    personnel.service=Service.objects.get(pk=data['service'])
    personnel.fonction=Fonction.objects.get(pk=data['fonction'])
    personnel.save()
    serializer=PersonnelSerializer(personnel,many=False)
    return Response(serializer.data)

@api_view(['DELETE'])
def deletePersonnel(request,id):
     personnel=Personnel.objects.get(pk=id)
     personnel.delete()
     serializer=PersonnelSerializer(personnel,many=False)
     return Response(serializer.data)
 
#gestion de service
@api_view(['GET'])
def findAllService(request):
    service=Service.objects.all()
    serializer=ServiceSerializer(service,many=True)
    return Response(serializer.data)

@api_view(['POST'])
def createService(request):
    data=request.data
    personnel=Personnel.objects.get(pk=data['responsable'])
    service=Service.objects.create(service=data['service'])
    service.responsable.add(personnel)
    serializer=ServiceSerializer(service,many=False)
    return Response(serializer.data)

@api_view(['PUT'])
def updateService(request, id):
    data=request.data
    print(id)
    service=Service.objects.get(pk=id)
    service.responsable.clear()
    service.service=data["service"]
    personnel=Personnel.objects.get(pk=data['responsable'])
    service.responsable.add(personnel)
    service.save()
    serializer=ServiceSerializer(service,many=False)
    return Response(serializer.data)

@api_view(['DELETE'])
def deleteService(request,id):
     service=Service.objects.get(pk=id)
     service.delete()
     serializer=ServiceSerializer(service,many=False)
     return Response(serializer.data)
 
# gerer fonction
@api_view(['GET'])
def findAllFonction(request):
    fonction=Fonction.objects.all()
    serializer=FonctionSerializer(fonction,many=True)
    return Response(serializer.data)



