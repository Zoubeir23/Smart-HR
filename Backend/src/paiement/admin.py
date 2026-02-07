from django.contrib import admin
from .models import Paiement, Salaire

# Register your models here.

admin.site.register(Paiement)
admin.site.register(Salaire)