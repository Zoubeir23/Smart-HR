from django.db import models


class TimeStampedModel(models.Model):
    """
    Modèle abstrait de base pour tous les modèles du projet.

    Fournit automatiquement :
    - created_at : date/heure de création (non modifiable)
    - updated_at : date/heure de dernière modification (mis à jour automatiquement)

    Usage :
        class MonModele(TimeStampedModel):
            ...
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
