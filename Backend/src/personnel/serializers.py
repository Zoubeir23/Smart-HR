from rest_framework import serializers
from utilisateur.serializers import UserSerializer
from .models import Employee, Department, Position


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'employee_count']

    def get_employee_count(self, obj):
        return obj.employees.count()


class PositionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Position
        fields = ['id', 'title', 'department', 'department_name']


class EmployeeListSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    position_title = serializers.CharField(source='position.title', read_only=True)

    class Meta:
        model = Employee
        fields = [
            'id', 'user', 'department', 'department_name', 'position', 'position_title',
            'hire_date', 'salary', 'status', 'churn_risk',
        ]


class EmployeeDetailSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    position_title = serializers.CharField(source='position.title', read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'


class EmployeeCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = [
            'department', 'position', 'hire_date', 'salary', 'status',
            'date_of_birth', 'cin', 'address', 'emergency_contact',
        ]
