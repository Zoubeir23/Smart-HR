from django.db import models
from personnel.models import Personnel

# Create your models here.

class Presence(models.Model):
    """Modèle représentant la présence d'un employé"""
    STATUT_CHOICES = [
        ('Présent', 'Présent'),
        ('Absent', 'Absent'),
        ('Retard', 'Retard'),
        ('Congé', 'Congé'),
    ]

    personnel = models.ForeignKey(Personnel, on_delete=models.CASCADE)
    date_jour = models.DateField(auto_now_add=True)
    heure_arrivee = models.TimeField(null=True, blank=True)
    heure_depart = models.TimeField(null=True, blank=True)
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='Présent')
    commentaire = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f" {self.personnel.nom} {self.personnel.prenom} - {self.date_jour} - {self.heure_arrivee} - {self.heure_depart} - {self.statut} - {self.commentaire}"
    
