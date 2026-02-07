from django.db import models

# Create your models here.
class Utilisateur(models.Model):
    username=models.CharField( max_length=50)
    email=models.EmailField(max_length=254, unique=True)
    tel=models.CharField(max_length=14)
    mot_de_passe=models.CharField(max_length=50)