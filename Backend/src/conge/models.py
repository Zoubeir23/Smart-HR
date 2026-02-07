from django.db import models
from personnel.models import Personnel  # ou adaptez selon votre projet

class Conge(models.Model):
    personnel = models.ForeignKey(Personnel, on_delete=models.CASCADE)
    date_debut = models.DateField()
    date_fin = models.DateField()
    motif = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.personnel.nom} - {self.date_debut} à {self.date_fin} - {self.motif}"
