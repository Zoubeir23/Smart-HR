from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.serializers import Serializer
from rest_framework.decorators import api_view
from .serializers import UtilisateurSerializer
from .models import Utilisateur

# Create your views here.

@api_view(['POST'])
def findOne(request):
    data=request.data
    utilisateur=Utilisateur.objects.get(email=data['email'], mot_de_passe=data['mot_de_passe'])
    serializer=UtilisateurSerializer(utilisateur,many=False)
    return Response(serializer.data)
