from rest_framework import serializers
from .models import Conge

class CongeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conge
        fields = '__all__'
