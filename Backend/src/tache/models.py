from django.db import models
from personnel.models import Personnel, Service, Utilisateur

# Create your models here.

class Tache(models.Model):
    class Etat(models.IntegerChoices):
        a_faire=1,"A Faire"
        en_cours=2,"En Cours"
        test=3,"En Test"
        termine=4,"Terminé"
    etat=models.PositiveSmallIntegerField(choices=Etat.choices, default=Etat.a_faire)
    nom = models.CharField(max_length = 150)
    description=models.TextField(null=True)
    date_debut = models.DateTimeField(auto_now=False, auto_now_add=False)
    date_fin = models.DateTimeField(auto_now=False, auto_now_add=False)
    utilisateur=models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True)
    personnel=models.ForeignKey(Personnel, on_delete=models.SET_NULL, null=True)
    service=models.ForeignKey(Service, on_delete=models.SET_NULL, null=True)
    
    def __str__(self):
        return f"{self.nom} - {self.description} - {self.date_debut} - {self.date_fin} - {self.utilisateur} - {self.personnel}- {self.service} - {self.etat}"