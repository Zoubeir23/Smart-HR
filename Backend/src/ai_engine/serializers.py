from rest_framework import serializers
from .models import ChurnPrediction


class ChurnPredictionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)

    class Meta:
        model = ChurnPrediction
        fields = [
            'id', 'employee', 'employee_name', 'risk_score', 'risk_level',
            'risk_level_display', 'factors', 'recommendations', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
