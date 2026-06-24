import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

ADMIN_LIST_URL = "/api/v1/auth/admin/users/"
ANALYTICS_URL = "/api/v1/stats/overview/"


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin_mgmt",
        email="admin_mgmt@test.com",
        password="pass1234!",
        role=User.Role.ADMIN,
        is_email_verified=True,
        is_active=True,
    )


@pytest.fixture
def rh_user(db):
    return User.objects.create_user(
        username="rh_mgmt",
        email="rh_mgmt@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
        is_active=True,
    )


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(
        username="emp_mgmt",
        email="emp_mgmt@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
        is_active=True,
    )


class TestAdminUserManagement:
    def test_non_admin_cannot_list_users(self, rh_user):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(ADMIN_LIST_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_list_users(self, admin_user):
        client = APIClient()
        client.force_authenticate(user=admin_user)
        response = client.get(ADMIN_LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_admin_can_create_rh_user(self, admin_user):
        client = APIClient()
        client.force_authenticate(user=admin_user)
        payload = {
            "email": "new_rh@test.com",
            "username": "new_rh",
            "first_name": "Marie",
            "last_name": "Curie",
            "role": "RH",
        }
        response = client.post(ADMIN_LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email="new_rh@test.com").exists()

    def test_cannot_create_candidate_via_admin_route(self, admin_user):
        client = APIClient()
        client.force_authenticate(user=admin_user)
        payload = {
            "email": "cand@test.com",
            "username": "cand_test",
            "role": "CANDIDATE",
        }
        response = client.post(ADMIN_LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_role_rejected(self, admin_user):
        client = APIClient()
        client.force_authenticate(user=admin_user)
        payload = {
            "email": "x@test.com",
            "username": "x_user",
            "role": "superuser",
        }
        response = client.post(ADMIN_LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_admin_can_patch_user_role(self, admin_user, employee_user):
        client = APIClient()
        client.force_authenticate(user=admin_user)
        url = f"{ADMIN_LIST_URL}{employee_user.pk}/"
        response = client.patch(url, {"role": "RH"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        employee_user.refresh_from_db()
        assert employee_user.role == User.Role.RH

    def test_admin_can_deactivate_user(self, admin_user, employee_user):
        client = APIClient()
        client.force_authenticate(user=admin_user)
        url = f"{ADMIN_LIST_URL}{employee_user.pk}/"
        response = client.patch(url, {"is_active": False}, format="json")
        assert response.status_code == status.HTTP_200_OK
        employee_user.refresh_from_db()
        assert employee_user.is_active is False

    def test_admin_cannot_deactivate_self(self, admin_user):
        client = APIClient()
        client.force_authenticate(user=admin_user)
        url = f"{ADMIN_LIST_URL}{admin_user.pk}/"
        response = client.patch(url, {"is_active": False}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_nonexistent_user(self, admin_user):
        client = APIClient()
        client.force_authenticate(user=admin_user)
        url = f"{ADMIN_LIST_URL}99999/"
        response = client.patch(url, {"role": "rh"}, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestHRAnalyticsPermissions:
    def test_anonymous_cannot_access(self):
        client = APIClient()
        response = client.get(ANALYTICS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_cannot_access(self, employee_user):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(ANALYTICS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN
