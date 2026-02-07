from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('findall/', views.findAllTache ),
    path('create', views.createTache ),
    path('delete/<int:id>', views.deleteTache ),
    path('update', views.updateTache ),
    path('updateEtat', views.updateEtat ),
    
]
