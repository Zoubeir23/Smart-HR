from rest_framework import serializers
from .models import Formation, Meeting, ZoomToken


class FormationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Formation
        fields = "__all__"
        
class MeetingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meeting
        fields = '__all__'
        
class ZoomTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZoomToken
        fields = '__all__'
