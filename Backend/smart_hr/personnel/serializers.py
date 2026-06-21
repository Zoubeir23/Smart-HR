from rest_framework import serializers

from smart_hr.personnel.models import Contract
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import DepartureReason
from smart_hr.personnel.models import Diploma
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import FamilyMember
from smart_hr.personnel.models import FamilyStatus
from smart_hr.personnel.models import Nationality
from smart_hr.personnel.models import Position
from smart_hr.personnel.models import Service

# ---------------------------------------------------------------------------
# Tables de référence
# ---------------------------------------------------------------------------


class NationalitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Nationality
        fields = ["id", "name", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class FamilyStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyStatus
        fields = ["id", "label", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class DiplomaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diploma
        fields = ["id", "label", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class DepartureReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepartureReason
        fields = ["id", "label", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


# ---------------------------------------------------------------------------
# Hiérarchie structurelle
# ---------------------------------------------------------------------------


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "name", "description", "employee_count", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def get_employee_count(self, obj: Department) -> int:
        return sum(1 for e in obj.employees.all() if e.status == Employee.Status.ACTIVE)


class DepartmentDetailSerializer(DepartmentSerializer):
    """Serializer enrichi avec services, postes et masse salariale."""

    services = serializers.SerializerMethodField()
    total_salary = serializers.SerializerMethodField()

    class Meta(DepartmentSerializer.Meta):
        fields = [*DepartmentSerializer.Meta.fields, "services", "total_salary"]

    def get_services(self, obj: Department) -> list:
        return list(obj.services.values("id", "name"))

    def get_total_salary(self, obj: Department) -> float:
        return float(sum(e.salary or 0 for e in obj.employees.all() if e.status == Employee.Status.ACTIVE))


class ServiceSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    employee_count = serializers.SerializerMethodField()
    position_count = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "description",
            "department",
            "department_name",
            "employee_count",
            "position_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_employee_count(self, obj: Service) -> int:
        return obj.employees.filter(status=Employee.Status.ACTIVE).count()

    def get_position_count(self, obj: Service) -> int:
        return obj.positions.count()


class PositionSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    department_name = serializers.SerializerMethodField()
    department_id = serializers.SerializerMethodField()
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Position
        fields = [
            "id",
            "title",
            "service",
            "service_name",
            "department_id",
            "department_name",
            "profile_type",
            "indicative_salary",
            "employee_count",
        ]

    def get_department_name(self, obj: Position) -> str:
        return obj.service.department.name if obj.service else ""

    def get_department_id(self, obj: Position) -> int | None:
        return obj.service.department_id if obj.service else None

    def get_employee_count(self, obj: Position) -> int:
        return obj.employees.filter(status=Employee.Status.ACTIVE).count()


# ---------------------------------------------------------------------------
# Employé
# ---------------------------------------------------------------------------


class EmployeeSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)
    position_title = serializers.CharField(source="position.title", read_only=True)
    nationality_name = serializers.CharField(source="nationality.name", read_only=True)
    family_status_label = serializers.CharField(source="family_status.label", read_only=True)
    diploma_label = serializers.CharField(source="diploma.label", read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id",
            "user",
            "user_email",
            "user_full_name",
            "matricule",
            "department",
            "department_name",
            "service",
            "service_name",
            "position",
            "position_title",
            "hire_date",
            "salary",
            "status",
            "date_of_birth",
            "cin",
            "cnss_number",
            "address",
            "emergency_contact",
            "nationality",
            "nationality_name",
            "family_status",
            "family_status_label",
            "diploma",
            "diploma_label",
            "churn_risk",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["matricule", "churn_risk", "created_at", "updated_at"]

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

    employee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())
    employee_full_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
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
        read_only_fields = ["status", "created_at", "updated_at"]

    def update(self, instance: Contract, validated_data: dict) -> Contract:
        employee = validated_data.pop("employee", None)
        if employee is not None and employee != instance.employee:
            raise serializers.ValidationError({"employee": "La réassignation d'un contrat à un autre employé est interdite."})
        return super().update(instance, validated_data)

    def validate(self, data: dict) -> dict:
        contract_type = data.get("contract_type") or (self.instance.contract_type if self.instance else None)
        end_date = data.get("end_date")
        start_date = data.get("start_date")

        if contract_type == "CDI" and end_date:
            raise serializers.ValidationError({"end_date": "Un CDI ne peut pas avoir de date de fin."})

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "La date de fin doit être postérieure à la date de début."})

        salary = data.get("salary")
        if salary is not None and salary <= 0:
            raise serializers.ValidationError({"salary": "Le salaire doit être supérieur à zéro."})
        return data


class FamilyMemberSerializer(serializers.ModelSerializer):
    """Serializer pour les membres de la famille d'un employé."""

    relationship_display = serializers.CharField(
        source="get_relationship_display",
        read_only=True,
    )
    age = serializers.SerializerMethodField()

    class Meta:
        model = FamilyMember
        fields = [
            "id",
            "employee",
            "relationship",
            "relationship_display",
            "first_name",
            "last_name",
            "date_of_birth",
            "gender",
            "age",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_age(self, obj: FamilyMember) -> int | None:
        if not obj.date_of_birth:
            return None
        from django.utils import timezone

        today = timezone.now().date()
        born = obj.date_of_birth
        return today.year - born.year - ((today.month, today.day) < (born.month, born.day))
