from django.contrib import admin
from .models import Personnel, Fonction, Service

# Register your models here.

admin.site.register(Personnel)
admin.site.register(Fonction)
admin.site.register(Service)