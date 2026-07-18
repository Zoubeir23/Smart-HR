from __future__ import annotations

import pytest

from smart_hr.ai.actions import execute_action
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.recruitment.models import JobOffer
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


class TestExecuteJobOfferCreation:
    def test_rh_creates_job_offer(self, rh_user):
        params = {
            "title": "Développeur Backend Django",
            "department": "Technique",
            "location": "Dakar",
            "job_type": "full_time",
            "description": "Nous recherchons un développeur Django expérimenté.",
            "requirements": "3 ans d'expérience\nDjango",
            "salary_range": "800k-1.2M FCFA",
        }
        result = execute_action("job_offer_creation", rh_user, params)
        assert result["success"] is True
        assert result["type"] == "job_offer_created"
        job_offer = JobOffer.objects.get(pk=result["data"]["job_offer_id"])
        assert job_offer.title == "Développeur Backend Django"
        assert job_offer.created_by == rh_user
        assert job_offer.status == JobOffer.Status.OPEN

    def test_employee_role_cannot_create_job_offer(self, employee_user):
        params = {
            "title": "Poste interdit",
            "department": "Technique",
            "location": "",
            "job_type": "full_time",
            "description": "Description",
            "requirements": "",
            "salary_range": "",
        }
        result = execute_action("job_offer_creation", employee_user, params)
        assert result["success"] is False
        assert "RH" in result["error"]
        assert not JobOffer.objects.exists()

    def test_missing_required_fields_is_rejected(self, rh_user):
        params = {
            "title": None,
            "department": "Technique",
            "location": "",
            "job_type": "full_time",
            "description": "Description",
            "requirements": "",
            "salary_range": "",
        }
        result = execute_action("job_offer_creation", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "job_offer_info_missing"
        assert not JobOffer.objects.exists()

    def test_invalid_job_type_defaults_to_full_time(self, rh_user):
        """Garde-fou serveur : le schéma du tool contraint déjà job_type à un
        enum valide, mais l'exécution ne doit jamais faire confiance aveuglément
        à ce que le LLM a réellement extrait."""
        params = {
            "title": "Développeur Backend Django",
            "department": "Technique",
            "location": "",
            "job_type": "invalide",
            "description": "Description",
            "requirements": "",
            "salary_range": "",
        }
        result = execute_action("job_offer_creation", rh_user, params)
        assert result["success"] is True
        job_offer = JobOffer.objects.get(pk=result["data"]["job_offer_id"])
        assert job_offer.job_type == "full_time"

    def test_missing_department_falls_back_to_requester_employee_department(self, rh_user):
        """Si le LLM n'a pas extrait de département (cas fréquent, la plupart des
        messages ne le précisent pas explicitement), on retombe sur le département
        de l'employé RH demandeur plutôt que de bloquer la création."""
        department = Department.objects.create(name="Technique")
        Employee.objects.create(user=rh_user, department=department, hire_date="2023-01-01")

        params = {
            "title": "Développeur Backend Django",
            "department": None,
            "location": "Dakar",
            "job_type": "full_time",
            "description": "Nous recherchons un développeur Django expérimenté.",
            "requirements": "",
            "salary_range": "",
        }
        result = execute_action("job_offer_creation", rh_user, params)
        assert result["success"] is True
        job_offer = JobOffer.objects.get(pk=result["data"]["job_offer_id"])
        assert job_offer.department == "Technique"

    def test_missing_department_without_employee_profile_is_rejected(self, rh_user):
        """Un compte RH sans profil Employee (pas de département à déduire) reste
        bloqué par le message d'information manquante — comportement inchangé."""
        params = {
            "title": "Développeur Backend Django",
            "department": None,
            "location": "",
            "job_type": "full_time",
            "description": "Description",
            "requirements": "",
            "salary_range": "",
        }
        result = execute_action("job_offer_creation", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "job_offer_info_missing"
