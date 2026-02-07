from django.db import models
from personnel.models import Personnel

class Salaire(models.Model):
    """Modèle représentant le salaire d'un employé"""
    personnel = models.ForeignKey(Personnel, on_delete=models.CASCADE)
    mois = models.CharField(max_length=20)  # Exemple : "Janvier 2024"
    salaire_brut = models.DecimalField(max_digits=10, decimal_places=2)
    primes = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    salaire_net = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    date_paiement = models.DateField(auto_now_add=True)

    def calculer_salaire_net(self):
        """Calcule le salaire net (brut + primes)"""
        self.salaire_net = float(self.salaire_brut) + float(self.primes)
        self.save()
        
    def __str__(self):
        return f"Salaire de {self.personnel.nom} pour {self.mois} - {self.salaire_net}€ - {self.date_paiement} - {self.salaire_brut}€ - {self.primes}€"

class Paiement(models.Model):
    """Modèle pour enregistrer les paiements des salaires"""
    personnel = models.ForeignKey(Personnel, on_delete=models.CASCADE)
    salaire = models.ForeignKey(Salaire, on_delete=models.CASCADE)
    mode_paiement = models.CharField(max_length=50, choices=[('Virement', 'Virement'), ('Chèque', 'Chèque'), ('Espèces', 'Espèces')])
    statut = models.CharField(max_length=20, choices=[('En attente', 'En attente'), ('Effectué', 'Effectué')], default='En attente')
    date_paiement = models.DateField(auto_now_add=True)
    
    def __str__(self):
        return f"Paiement de {self.salaire.salaire_net}€ pour {self.personnel.nom} - {self.date_paiement} - {self.mode_paiement} - {self.statut}"

