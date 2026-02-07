from django.urls import path
from . import views

urlpatterns = [
    path('', views.getAllConges),
    path('create/', views.createConge),
    path('update/<int:id>/', views.updateConge),
    path('delete/<int:id>/', views.deleteConge),
]
