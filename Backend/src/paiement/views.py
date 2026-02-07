from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Personnel, Salaire, Paiement
from .serializers import SalaireSerializer, PaiementSerializer


# ➤ GESTION DES SALAIRES

@api_view(['GET'])
def getAllSalaires(request):
    """Liste tous les salaires"""
    salaires = Salaire.objects.all()
    serializer = SalaireSerializer(salaires, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def createSalaire(request):
    data=request.data
    employe=Personnel.objects.get(pk=int(data["personnel"]))
    salaire = Salaire.objects.create(
        personnel=employe,
        mois=data["mois"],
        salaire_brut=data["salaire_brut"],
        primes=data["primes"], 
        )
    salaire.calculer_salaire_net()
    salaire.save()
    serializer = SalaireSerializer(salaire, many=False)
    return Response(serializer.data)

@api_view(['PUT'])
def updateSalaire(request, id):
    """Met à jour un salaire"""
    salaire = Salaire.objects.get(pk=id)
    serializer = SalaireSerializer(instance=salaire, data=request.data)
    if serializer.is_valid():
        serializer.save()
    return Response(serializer.data)

@api_view(['DELETE'])
def deleteSalaire(request, id):
    """Supprime un salaire"""
    salaire = Salaire.objects.get(pk=id)
    salaire.delete()
    return Response({"message": "Salaire supprimé avec succès"})

# ➤ GESTION DES PAIEMENTS

@api_view(['GET'])
def getAllPaiements(request):
    """Liste tous les paiements"""
    paiements = Paiement.objects.all()
    serializer = PaiementSerializer(paiements, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def createPaiement(request):
    """Ajoute un paiement"""
    data=request.data
    employe=Personnel.objects.get(pk=data["personnel"])
    salaire=Salaire.objects.get(pk=data["salaire"])
    paiement = Paiement.objects.create(
        personnel=employe,
        salaire=salaire,
        mode_paiement=data["mode_paiement"],
        statut=data["statut"]
    )
    paiement.save()
    serializer = PaiementSerializer(paiement, many=False)
    return Response(serializer.data)

@api_view(['PUT'])
def updatePaiement(request, id):
    """Met à jour un paiement"""
    paiement = Paiement.objects.get(pk=id)
    serializer = PaiementSerializer(instance=paiement, data=request.data)
    if serializer.is_valid():
        serializer.save()
    return Response(serializer.data)

@api_view(['DELETE'])
def deletePaiement(request, id):
    """Supprime un paiement"""
    paiement = Paiement.objects.get(pk=id)
    paiement.delete()
    return Response({"message": "Paiement supprimé avec succès"})
