from rest_framework import serializers
from .models import Personnel, Fonction, Service
class PersonnelSerializer(serializers.ModelSerializer):
    class Meta:
       model = Personnel
       fields = '__all__'

class FonctionSerializer(serializers.ModelSerializer):
    class Meta:
       model = Fonction
       fields = '__all__'

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
       model = Service
       fields = '__all__'
