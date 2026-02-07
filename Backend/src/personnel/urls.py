from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('personnel/findall/', views.findAllPersonnel ),
    path('personnel/create/<int:id>', views.createPersonnel ),
    path('personnel/delete/<int:id>', views.deletePersonnel ),
    path('personnel/update', views.updatePersonnel ),
    path('service/findall/', views.findAllService ),
    path('service/create', views.createService ),
    path('service/update/<int:id>', views.updateService ),
    path('service/delete/<int:id>', views.deleteService ),
    path('fonction/findall/', views.findAllFonction ),
    
]
