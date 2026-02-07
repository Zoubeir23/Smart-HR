from django.db import models
from utilisateur.models import Utilisateur

# Create your models here.
    
class Service(models.Model):
    service = models.CharField(max_length = 150)
    responsable=models.ManyToManyField("personnel.Personnel", related_name="responsable")
    def __str__(self):
        return f" service {self.service} - responsables {self.responsable}"
    

class Fonction(models.Model):
    Fonction = models.CharField(max_length = 150)
    def __str__(self):
        return f" {self.Fonction}"

class Personnel(models.Model):
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True)
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True)
    fonction = models.ForeignKey(Fonction, on_delete=models.SET_NULL, null=True)
    date_naissance = models.DateField(auto_now=False, auto_now_add=False, null=True)
    nom=models.CharField( max_length=50)
    prenom=models.CharField( max_length=50)
    tel = models.CharField(max_length = 150)
    cin = models.CharField(max_length = 150)
    
    def __str__(self):
        return f"{self.nom} {self.prenom} - {self.service} - {self.fonction} - {self.tel} - {self.cin} - date de naissance : {self.date_naissance}"
    