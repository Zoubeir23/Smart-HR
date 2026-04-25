from rest_framework import serializers

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = "__all__"


class PositionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Position
        fields = ["id", "title", "department", "department_name"]


class EmployeeSerializer(serializers.ModelSerializer):
    """Serializer complet : exposé uniquement aux rôles ADMIN et RH."""

    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    position_title = serializers.CharField(source="position.title", read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id",
            "user",
            "user_email",
            "user_full_name",
            "department",
            "department_name",
            "position",
            "position_title",
            "hire_date",
            "salary",
            "status",
            "date_of_birth",
            "cin",
            "address",
            "emergency_contact",
            "churn_risk",
        ]
        read_only_fields = ["churn_risk"]

    def to_representation(self, instance):
        """Remplace le FK user par un objet imbriqué en lecture."""
        data = super().to_representation(instance)
        user = instance.user
        data["user"] = {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "role": user.role,
        }
        return data


class EmployeeSelfSerializer(EmployeeSerializer):
    """Serializer restreint pour le profil personnel d'un employé.

    Exclut churn_risk (score interne RH non destiné à l'employé).
    """

    class Meta(EmployeeSerializer.Meta):
        fields = [
            f for f in EmployeeSerializer.Meta.fields if f != "churn_risk"
        ]
