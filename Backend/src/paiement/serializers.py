from rest_framework import serializers
from .models import Salaire, Paiement



class SalaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salaire
        fields = '__all__'

class PaiementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paiement
        fields = '__all__'