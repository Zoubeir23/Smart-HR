from rest_framework import serializers

from smart_hr.personnel.models import Contract
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer de base pour un département."""

    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "name", "description", "employee_count", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def get_employee_count(self, obj: Department) -> int:
        """Retourne le nombre d'employés actifs dans ce département.

        Note : utilise prefetch_related depuis la vue pour éviter le N+1.
        """
        # Optimisé si prefetch_related("employees") est fait dans la vue
        return obj.employees.filter(status=Employee.Status.ACTIVE).count()


class DepartmentDetailSerializer(DepartmentSerializer):
    """Serializer enrichi avec la liste des postes et la masse salariale."""

    positions = serializers.SerializerMethodField()
    total_salary = serializers.SerializerMethodField()

    class Meta(DepartmentSerializer.Meta):
        fields = [*DepartmentSerializer.Meta.fields, "positions", "total_salary"]

    def get_positions(self, obj: Department) -> list:
        """Retourne les postes rattachés au département."""
        return list(
            obj.positions.values("id", "title"),
        )

    def get_total_salary(self, obj: Department) -> float:
        """Masse salariale totale des employés actifs du département."""
        from django.db.models import Sum

        result = obj.employees.filter(status=Employee.Status.ACTIVE).aggregate(
            total=Sum("salary"),
        )
        return float(result["total"] or 0)


class PositionSerializer(serializers.ModelSerializer):
    """Serializer pour un poste de travail."""

    department_name = serializers.CharField(source="department.name", read_only=True)
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Position
        fields = ["id", "title", "department", "department_name", "employee_count"]

    def get_employee_count(self, obj: Position) -> int:
        """Nombre d'employés occupant ce poste."""
        return obj.employees.filter(status=Employee.Status.ACTIVE).count()


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
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["churn_risk", "created_at", "updated_at"]

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
        fields = [f for f in EmployeeSerializer.Meta.fields if f != "churn_risk"]


class ContractSerializer(serializers.ModelSerializer):
    """Serializer pour un contrat employé."""

    employee_full_name = serializers.CharField(
        source="employee.user.get_full_name", read_only=True
    )
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Contract
        fields = [
            "id",
            "employee",
            "employee_full_name",
            "contract_type",
            "start_date",
            "end_date",
            "salary",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["employee", "status", "created_at", "updated_at"]

    def validate(self, data: dict) -> dict:
        end_date = data.get("end_date")
        start_date = data.get("start_date")
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "La date de fin doit être postérieure à la date de début."}
            )
        salary = data.get("salary")
        if salary is not None and salary <= 0:
            raise serializers.ValidationError(
                {"salary": "Le salaire doit être supérieur à zéro."}
            )
        return data
