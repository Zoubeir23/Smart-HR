from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Conge
from .serializers import CongeSerializer
from personnel.models import Personnel

# ➤ LISTER LES CONGÉS
@api_view(['GET'])
def getAllConges(request):
    conges = Conge.objects.all()
    serializer = CongeSerializer(conges, many=True)
    return Response(serializer.data)

# ➤ CRÉER UN CONGÉ (style que tu préfères)
@api_view(['POST'])
def createConge(request):
    data = request.data
    personnel = Personnel.objects.get(pk=data["personnel"])

    conge = Conge.objects.create(
        personnel=personnel,
        date_debut=data["date_debut"],
        date_fin=data["date_fin"],
        motif=data["motif"]
    )

    serializer = CongeSerializer(conge, many=False)
    return Response(serializer.data)

# ➤ MODIFIER UN CONGÉ
@api_view(['PUT'])
def updateConge(request, id):
    data = request.data
    conge = Conge.objects.get(pk=id)

    conge.date_debut = data["date_debut"]
    conge.date_fin = data["date_fin"]
    conge.motif = data["motif"]
    conge.personnel = Personnel.objects.get(pk=data["personnel"])
    conge.save()

    serializer = CongeSerializer(conge, many=False)
    return Response(serializer.data)

# ➤ SUPPRIMER UN CONGÉ
@api_view(['DELETE'])
def deleteConge(request, id):
    conge = Conge.objects.get(pk=id)
    conge.delete()
    return Response({"message": "Congé supprimé avec succès"})
