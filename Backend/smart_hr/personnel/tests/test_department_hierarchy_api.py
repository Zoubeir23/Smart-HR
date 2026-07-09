from __future__ import annotations

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Department
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/personnel/departments/"


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


class TestDepartmentHierarchy:
    def test_rh_can_create_unit_attached_to_a_root(self, rh_user):
        dg = Department.objects.create(name="Direction Générale", unit_type=Department.UnitType.DG)
        client = _authenticated_client(rh_user)
        payload = {
            "name": "Chief Marketing Office",
            "unit_type": "department",
            "parent": dg.pk,
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        cmo = Department.objects.get(pk=response.data["id"])
        assert cmo.parent == dg
        assert response.data["parent_name"] == "Direction Générale"

    def test_unit_cannot_be_its_own_parent(self, rh_user):
        unit = Department.objects.create(name="Solo")
        client = _authenticated_client(rh_user)
        response = client.patch(f"{LIST_URL}{unit.pk}/", {"parent": unit.pk}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_circular_parent_rattachment_is_rejected(self, rh_user):
        root = Department.objects.create(name="Racine")
        child = Department.objects.create(name="Enfant", parent=root)
        client = _authenticated_client(rh_user)
        response = client.patch(f"{LIST_URL}{root.pk}/", {"parent": child.pk}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_employee_cannot_create_unit(self, employee_user):
        client = _authenticated_client(employee_user)
        response = client.post(LIST_URL, {"name": "Interdit"}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestOrganigrammeArbitraryDepth:
    def test_organigramme_nests_children_under_root_units(self, rh_user):
        dg = Department.objects.create(name="Direction Générale", unit_type=Department.UnitType.DG)
        cmo = Department.objects.create(name="Chief Marketing Office", unit_type=Department.UnitType.DEPARTMENT, parent=dg)
        Department.objects.create(name="Cellule Communication", unit_type=Department.UnitType.SERVICE, parent=cmo)

        client = _authenticated_client(rh_user)
        response = client.get(f"{LIST_URL}organigramme/")
        assert response.status_code == status.HTTP_200_OK

        roots = [node for node in response.data if node["id"] == dg.pk]
        assert len(roots) == 1
        dg_node = roots[0]
        assert dg_node["unit_type"] == "dg"

        [cmo_node] = dg_node["children"]
        assert cmo_node["name"] == "Chief Marketing Office"

        [cellule_node] = cmo_node["children"]
        assert cellule_node["name"] == "Cellule Communication"
        assert cellule_node["children"] == []

    def test_units_without_parent_remain_top_level_roots(self, rh_user):
        Department.objects.create(name="Commercial")
        Department.objects.create(name="Technologie")
        client = _authenticated_client(rh_user)
        response = client.get(f"{LIST_URL}organigramme/")
        names = {node["name"] for node in response.data}
        assert names == {"Commercial", "Technologie"}
