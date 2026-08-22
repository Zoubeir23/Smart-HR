import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Diploma
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import FamilyStatus
from smart_hr.personnel.models import Nationality
from smart_hr.personnel.models import Position
from smart_hr.personnel.models import Service
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/personnel/employees/"


@pytest.fixture
def department(db):
    return Department.objects.create(name="Engineering")


@pytest.fixture
def position(db):
    return Position.objects.create(title="Backend Developer")


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin_emp",
        email="admin_emp@test.com",
        password="pass1234!",
        role=User.Role.ADMIN,
        is_email_verified=True,
    )


@pytest.fixture
def rh_user(db):
    return User.objects.create_user(
        username="rh_emp",
        email="rh_emp@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(
        username="emp_emp",
        email="emp_emp@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def employee(employee_user, department, position):
    return Employee.objects.create(
        user=employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2023, 1, 1),
        salary=500000,
    )


@pytest.fixture
def rh_employee(rh_user, department):
    return Employee.objects.create(
        user=rh_user,
        department=department,
        hire_date=datetime.date(2022, 1, 1),
        salary=700000,
    )


class TestEmployeePermissions:
    def test_anonymous_cannot_list(self):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rh_can_list_all(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_employee_sees_only_self(self, employee_user, rh_employee, employee):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert employee.pk in ids
        assert rh_employee.pk not in ids


class TestEmployeeListQueryCount:
    def test_list_stays_bounded_regardless_of_row_count(
        self,
        rh_user,
        department,
        position,
        django_assert_max_num_queries,
    ):
        """Régression N+1 : EmployeeSerializer traverse service.name,
        nationality.name, family_status.label et diploma.label, mais
        get_queryset() ne faisait un select_related que sur
        user/department/position — chacun de ces 4 champs déclenchait une
        requête par employé listé. Avec 3 employés ayant tous ces champs
        renseignés, ça faisait jusqu'à 12 requêtes en trop. Le nombre de
        requêtes doit rester borné indépendamment du nombre d'employés."""
        service = Service.objects.create(name="Support", department=department)
        nationality = Nationality.objects.create(name="Sénégalaise")
        family_status = FamilyStatus.objects.create(label="Marié(e)")
        diploma = Diploma.objects.create(label="Master")

        for index in range(3):
            employee_account = User.objects.create_user(
                username=f"n1_emp_{index}",
                email=f"n1_emp_{index}@test.com",
                password="pass1234!",
                role=User.Role.EMPLOYEE,
            )
            Employee.objects.create(
                user=employee_account,
                department=department,
                position=position,
                service=service,
                nationality=nationality,
                family_status=family_status,
                diploma=diploma,
                hire_date=datetime.date(2023, 1, 1),
                salary=500000,
            )

        client = APIClient()
        client.force_authenticate(user=rh_user)

        with django_assert_max_num_queries(6):
            response = client.get(LIST_URL)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 3


class TestEmployeeCRUD:
    def test_rh_can_create_employee(self, rh_user, department, position):
        new_user = User.objects.create_user(
            username="newbie",
            email="newbie@test.com",
            password="pass1234!",
            role=User.Role.EMPLOYEE,
        )
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {
            "user": new_user.pk,
            "department": department.pk,
            "position": position.pk,
            "hire_date": "2026-01-01",
            "salary": "450000.00",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_employee_cannot_create(self, employee_user):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.post(LIST_URL, {}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_update_salary(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{employee.pk}/"
        response = client.patch(url, {"salary": "600000.00"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        employee.refresh_from_db()
        assert employee.salary == 600000

    def test_rh_can_delete_employee(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{employee.pk}/"
        response = client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT


class TestEmployeeMe:
    def test_me_returns_own_profile(self, employee_user, employee):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL + "me/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == employee.pk

    def test_me_returns_404_if_no_profile(self, rh_user):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL + "me/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestEmployeeSearch:
    def test_search_by_name(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        name = employee.user.first_name or employee.user.username
        response = client.get(LIST_URL + f"?search={name}")
        assert response.status_code == status.HTTP_200_OK


class TestEmployeeExport:
    def test_rh_can_export_employees_csv(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(f"{LIST_URL}export/")
        assert response.status_code == status.HTTP_200_OK
        assert "text/csv" in response["Content-Type"]

    def test_rh_can_export_employees_xlsx(self, rh_user, employee):
        """Régression : `?format=xlsx` renvoyait 404 (collision avec URL_FORMAT_OVERRIDE)."""
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(f"{LIST_URL}export/?export_format=xlsx")
        assert response.status_code == status.HTTP_200_OK
        assert "spreadsheetml" in response["Content-Type"]

    def test_employee_cannot_export(self, employee_user, employee):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(f"{LIST_URL}export/")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestEmployeeSetManager:
    def test_rh_can_set_manager(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{employee.pk}/set-manager/"
        response = client.post(url, {"is_manager": True}, format="json")
        assert response.status_code == status.HTTP_200_OK
        employee.refresh_from_db()
        assert employee.is_department_manager is True

    def test_rh_can_remove_manager(self, rh_user, employee):
        employee.is_department_manager = True
        employee.save()
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{employee.pk}/set-manager/"
        response = client.post(url, {"is_manager": False}, format="json")
        assert response.status_code == status.HTTP_200_OK
        employee.refresh_from_db()
        assert employee.is_department_manager is False


class TestEmployeeAnonymize:
    """RGPD droit à l'oubli — /employees/{id}/anonymize/.

    Régression : la cascade d'anonymisation tentait d'écrire sur des champs
    `notes` inexistants sur Attendance et Payroll, provoquant un FieldError
    systématiquement masqué par un `except Exception: pass` — l'endpoint
    semblait fonctionner (200) mais LeaveRequest.reason n'était en réalité
    jamais atteint dans certains ordres d'exécution. Ces tests garantissent
    que l'anonymisation aboutit réellement, sans dépendre d'un swallow silencieux.
    """

    def test_admin_can_anonymize_terminated_employee(self, admin_user, department, position):
        from smart_hr.conge.models import LeaveRequest
        from smart_hr.paiement.models import Payroll
        from smart_hr.presence.models import Attendance

        target_user = User.objects.create_user(
            username="terminated_emp",
            email="terminated_emp@test.com",
            password="pass1234!",
            role=User.Role.EMPLOYEE,
            is_email_verified=True,
        )
        target_employee = Employee.objects.create(
            user=target_user,
            department=department,
            position=position,
            hire_date=datetime.date(2020, 1, 1),
            salary=400000,
            status=Employee.Status.TERMINATED,
            cin="1234567890",
            address="12 rue de la Paix, Dakar",
        )
        LeaveRequest.objects.create(
            employee=target_employee,
            leave_type="annual",
            status="approved",
            start_date=datetime.date(2025, 1, 1),
            end_date=datetime.date(2025, 1, 5),
            reason="Vacances en famille",
        )
        Attendance.objects.create(employee=target_employee, date=datetime.date(2025, 1, 10))
        Payroll.objects.create(employee=target_employee, month="2025-01", base_salary=400000)

        client = APIClient()
        client.force_authenticate(user=admin_user)
        response = client.post(f"{LIST_URL}{target_employee.pk}/anonymize/")

        assert response.status_code == status.HTTP_200_OK
        target_employee.refresh_from_db()
        assert target_employee.anonymized is True
        assert target_employee.cin == ""
        assert target_employee.address == ""
        assert LeaveRequest.objects.get(employee=target_employee).reason == "[anonymise]"

    def test_rh_cannot_anonymize(self, rh_user, employee):
        employee.status = Employee.Status.TERMINATED
        employee.save()
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.post(f"{LIST_URL}{employee.pk}/anonymize/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_anonymize_active_employee(self, admin_user, employee):
        client = APIClient()
        client.force_authenticate(user=admin_user)
        response = client.post(f"{LIST_URL}{employee.pk}/anonymize/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_anonymize_twice(self, admin_user, employee):
        employee.status = Employee.Status.TERMINATED
        employee.anonymized = True
        employee.save()
        client = APIClient()
        client.force_authenticate(user=admin_user)
        response = client.post(f"{LIST_URL}{employee.pk}/anonymize/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
