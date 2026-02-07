from django.db import models

# Create your models here.
import os
from django.db import models
from personnel.models import Personnel  # adapte selon ton projet

def document_upload_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower()

    if ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
        folder = 'images'
    elif ext == '.pdf':
        folder = 'pdf'
    elif ext in ['.doc', '.docx', 'xlsx', '.xls', '.ppt', '.pptx']:
        folder = 'word'
    else:
        folder = 'autres'

    return f'documents/{folder}/{filename}'

class Document(models.Model):
    personnel = models.ForeignKey(Personnel, on_delete=models.CASCADE, related_name="documents")
    nom = models.CharField(max_length=100)
    fichier = models.FileField(upload_to=document_upload_path)
    date_upload = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nom} ({self.personnel.nom} - {self.date_upload} - {self.fichier.name})"
