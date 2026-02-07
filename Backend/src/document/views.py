from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from .models import Document
from .serializers import DocumentSerializer
from personnel.models import Personnel

@api_view(['GET'])
def getAllDocuments(request):
    docs = Document.objects.all().order_by('-date_upload')
    serializer = DocumentSerializer(docs, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def uploadDocument(request):
    data = request.data
    personnel = Personnel.objects.get(pk=data['personnel'])

    doc = Document.objects.create(
        personnel=personnel,
        nom=data['nom'],
        fichier=data['fichier']
    )

    serializer = DocumentSerializer(doc, many=False)
    return Response(serializer.data)

@api_view(['DELETE'])
def deleteDocument(request, id):
    doc = Document.objects.get(pk=id)
    doc.fichier.delete(save=False)  # Supprime le fichier physique
    doc.delete()
    return Response({"message": "Document supprimé avec succès"})
