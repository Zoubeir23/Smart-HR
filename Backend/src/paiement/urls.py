from django.urls import path
from .views import (
    getAllSalaires, createSalaire, updateSalaire, deleteSalaire,
    getAllPaiements, createPaiement, updatePaiement, deletePaiement
)

urlpatterns = [
    # Routes pour les salaires
    path('salaires/', getAllSalaires, name='getAllSalaires'),
    path('salaires/create/', createSalaire, name='createSalaire'),
    path('salaires/update/<int:id>/', updateSalaire, name='updateSalaire'),
    path('salaires/delete/<int:id>/', deleteSalaire, name='deleteSalaire'),

    # Routes pour les paiements
    path('', getAllPaiements, name='getAllPaiements'),
    path('create/', createPaiement, name='createPaiement'),
    path('update/<int:id>/', updatePaiement, name='updatePaiement'),
    path('delete/<int:id>/', deletePaiement, name='deletePaiement'),
]
