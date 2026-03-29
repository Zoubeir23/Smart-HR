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
