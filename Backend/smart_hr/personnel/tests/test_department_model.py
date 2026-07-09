from __future__ import annotations

import pytest
from django.core.exceptions import ValidationError

from smart_hr.personnel.models import Department

pytestmark = pytest.mark.django_db


class TestDepartmentHierarchyModelValidation:
    """Le contrôle anti-cycle doit s'appliquer au niveau du modèle (save/clean),
    pas seulement dans le serializer DRF — pour bloquer aussi les créations via
    l'admin Django, un shell, ou un script de données."""

    def test_cannot_save_department_as_its_own_parent(self):
        department = Department.objects.create(name="Racine")
        department.parent = department
        with pytest.raises(ValidationError):
            department.save()

    def test_cannot_save_indirect_circular_parent(self):
        root = Department.objects.create(name="Racine")
        child = Department.objects.create(name="Enfant", parent=root)
        root.parent = child
        with pytest.raises(ValidationError):
            root.save()

    def test_valid_deep_chain_saves_without_error(self):
        dg = Department.objects.create(name="DG", unit_type=Department.UnitType.DG)
        direction = Department.objects.create(name="Direction", parent=dg, unit_type=Department.UnitType.DIRECTION)
        service = Department.objects.create(name="Service", parent=direction, unit_type=Department.UnitType.SERVICE)
        assert service.parent == direction
        assert direction.parent == dg
