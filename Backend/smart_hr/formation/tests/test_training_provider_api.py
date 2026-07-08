from __future__ import annotations

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.formation.models import TrainingProvider
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/formation/training-providers/"


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestReadAccess:
    def test_anonymous_cannot_list(self):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_can_list(self, employee_user):
        TrainingProvider.objects.create(name="CEGOS", provider_type="external")
        client = _authenticated_client(employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 1


class TestWriteAccess:
    def test_employee_cannot_create(self, employee_user):
        client = _authenticated_client(employee_user)
        response = client.post(LIST_URL, {"name": "CEGOS", "provider_type": "external"}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_create_with_full_details(self, rh_user):
        client = _authenticated_client(rh_user)
        payload = {
            "name": "CEGOS",
            "provider_type": "external",
            "contact_name": "Marie Dupont",
            "phone": "+221 77 000 00 00",
            "email": "contact@cegos.sn",
            "website": "https://cegos.sn",
            "specialties": "Management, Leadership, Techniques commerciales",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        provider = TrainingProvider.objects.get(name="CEGOS")
        assert provider.contact_name == "Marie Dupont"
        assert provider.specialties == "Management, Leadership, Techniques commerciales"

    def test_rh_can_create_internal_provider_with_minimal_fields(self, rh_user):
        client = _authenticated_client(rh_user)
        response = client.post(LIST_URL, {"name": "Cellule Formation Interne", "provider_type": "internal"}, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_rh_can_update(self, rh_user):
        provider = TrainingProvider.objects.create(name="CEGOS", provider_type="external")
        client = _authenticated_client(rh_user)
        response = client.patch(f"{LIST_URL}{provider.pk}/", {"phone": "+221 78 111 11 11"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        provider.refresh_from_db()
        assert provider.phone == "+221 78 111 11 11"

    def test_rh_can_delete(self, rh_user):
        provider = TrainingProvider.objects.create(name="CEGOS", provider_type="external")
        client = _authenticated_client(rh_user)
        response = client.delete(f"{LIST_URL}{provider.pk}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not TrainingProvider.objects.filter(pk=provider.pk).exists()

    def test_employee_cannot_delete(self, rh_user, employee_user):
        provider = TrainingProvider.objects.create(name="CEGOS", provider_type="external")
        client = _authenticated_client(employee_user)
        response = client.delete(f"{LIST_URL}{provider.pk}/")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestFilteringAndSearch:
    def test_filter_by_provider_type(self, employee_user):
        TrainingProvider.objects.create(name="CEGOS", provider_type="external")
        TrainingProvider.objects.create(name="Cellule Interne", provider_type="internal")
        client = _authenticated_client(employee_user)
        response = client.get(LIST_URL, {"provider_type": "internal"})
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["name"] == "Cellule Interne"

    def test_search_by_name(self, employee_user):
        TrainingProvider.objects.create(name="CEGOS", provider_type="external")
        TrainingProvider.objects.create(name="Coursera", provider_type="external")
        client = _authenticated_client(employee_user)
        response = client.get(LIST_URL, {"search": "Cours"})
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["name"] == "Coursera"
