from rest_framework import serializers

from smart_hr.ai_engine.models import ChurnPrediction


class ChurnPredictionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)

    class Meta:
        model = ChurnPrediction
        fields = [
            "id",
            "employee",
            "employee_name",
            "risk_score",
            "risk_level",
            "factors",
            "recommendations",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
