from __future__ import annotations

import datetime

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from smart_hr.ai.context_builder import build_system_prompt
from smart_hr.conge.models import LeaveRequest
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.recruitment.models import Application
from smart_hr.recruitment.models import JobOffer
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Ressources Humaines")


@pytest.fixture
def position(db) -> Position:
    return Position.objects.create(title="Développeur Backend")


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE, first_name="Fatou", last_name="Ndiaye")


@pytest.fixture
def other_employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE, first_name="Moussa", last_name="Sow")


@pytest.fixture
def employee(employee_user, department, position) -> Employee:
    return Employee.objects.create(
        user=employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2023, 1, 1),
        salary=500000,
        status="active",
    )


@pytest.fixture
def other_employee(other_employee_user, department, position) -> Employee:
    return Employee.objects.create(
        user=other_employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2022, 1, 1),
        salary=700000,
        status="active",
    )


class TestBuildSystemPromptEmployeeRole:
    def test_includes_own_leave_request(self, employee):
        LeaveRequest.objects.create(
            employee=employee,
            leave_type=LeaveRequest.LeaveType.VACATION,
            status=LeaveRequest.Status.PENDING,
            start_date=datetime.date(2026, 8, 1),
            end_date=datetime.date(2026, 8, 5),
        )
        prompt = build_system_prompt(employee.user)
        assert "Mes congés" in prompt

    def test_does_not_leak_other_employee_leave_request(self, employee, other_employee):
        LeaveRequest.objects.create(
            employee=other_employee,
            leave_type=LeaveRequest.LeaveType.SICK,
            status=LeaveRequest.Status.PENDING,
            start_date=datetime.date(2026, 9, 1),
            end_date=datetime.date(2026, 9, 3),
        )
        prompt = build_system_prompt(employee.user)
        assert "Moussa" not in prompt
        assert "Sow" not in prompt

    def test_includes_role_restriction_instructions(self, employee):
        prompt = build_system_prompt(employee.user)
        assert "refuses toute demande portant sur un autre" in prompt


class TestBuildSystemPromptRHRole:
    def test_includes_aggregate_leave_data_with_names(self, employee, department, position):
        rh_user = UserFactory.create(role=User.Role.RH)
        LeaveRequest.objects.create(
            employee=employee,
            leave_type=LeaveRequest.LeaveType.VACATION,
            status=LeaveRequest.Status.PENDING,
            start_date=datetime.date(2026, 8, 1),
            end_date=datetime.date(2026, 8, 5),
        )
        prompt = build_system_prompt(rh_user)
        assert "Fatou" in prompt
        assert "Demandes de congé en attente" in prompt

    def test_includes_effectif_line(self, employee):
        rh_user = UserFactory.create(role=User.Role.RH)
        prompt = build_system_prompt(rh_user)
        assert "Effectif" in prompt


class TestBuildSystemPromptRHOwnEmployeeData:
    def test_rh_who_is_also_an_employee_gets_own_payroll_data(self, department, position):
        rh_user = UserFactory.create(role=User.Role.RH, first_name="Fatou", last_name="Ndiaye")
        rh_employee = Employee.objects.create(
            user=rh_user,
            department=department,
            position=position,
            hire_date=datetime.date(2023, 1, 1),
            salary=600000,
            status="active",
        )
        from smart_hr.paiement.models import Payroll

        Payroll.objects.create(
            employee=rh_employee,
            month="2026-07",
            base_salary=540000,
            bonuses=20000,
            deductions=10000,
            status="processed",
        )
        prompt = build_system_prompt(rh_user)
        assert "Mes 3 dernières fiches de paie" in prompt
        assert "550 000 FCFA" in prompt

    def test_rh_without_employee_profile_has_no_personal_section(self, db):
        rh_user = UserFactory.create(role=User.Role.RH)
        prompt = build_system_prompt(rh_user)
        assert "--- Mes données personnelles" not in prompt


class TestBuildSystemPromptCandidateRole:
    def test_includes_own_applications(self, db):
        candidate = UserFactory.create(role=User.Role.CANDIDATE)
        rh_user = UserFactory.create(role=User.Role.RH)
        job_offer = JobOffer.objects.create(
            title="Développeur Frontend",
            department="Tech",
            description="Poste frontend",
            created_by=rh_user,
        )
        Application.objects.create(
            job_offer=job_offer,
            candidate=candidate,
            cv=SimpleUploadedFile("cv.pdf", b"%PDF-1.4 fake"),
        )
        prompt = build_system_prompt(candidate)
        assert "Développeur Frontend" in prompt

    def test_includes_role_confidentiality_instructions(self, db):
        candidate = UserFactory.create(role=User.Role.CANDIDATE)
        prompt = build_system_prompt(candidate)
        assert "confidentielle" in prompt


class TestBuildSystemPromptAdminRole:
    def test_admin_gets_rh_admin_context(self, employee):
        admin_user = UserFactory.create(role=User.Role.ADMIN)
        prompt = build_system_prompt(admin_user)
        assert "Effectif" in prompt
        assert "ne transmets jamais de données nominatives" in prompt


class TestBuildSystemPromptRoleIsolation:
    def test_employee_prompt_and_rh_prompt_differ(self, employee):
        rh_user = UserFactory.create(role=User.Role.RH)
        employee_prompt = build_system_prompt(employee.user)
        rh_prompt = build_system_prompt(rh_user)
        assert employee_prompt != rh_prompt


class TestCapabilitiesBlock:
    """Le prompt doit déclarer les actions réellement déclenchables par le rôle.

    Régression : sans ce bloc, l'assistant ignorait ses propres capacités et
    répondait « je ne suis pas en mesure de créer des offres d'emploi » à un RH,
    contredisant le message d'accueil de l'interface qui propose cette action.
    """

    def test_rh_sait_qu_il_peut_creer_une_offre(self):
        rh_user = UserFactory.create(role=User.Role.RH)
        prompt = build_system_prompt(rh_user)
        assert "ACTIONS QUE TU PEUX DÉCLENCHER" in prompt
        assert "Créer une offre d'emploi" in prompt
        assert "Crée une offre d'emploi pour un développeur Django à Dakar" in prompt

    def test_rh_connait_aussi_la_validation_de_conge(self):
        rh_user = UserFactory.create(role=User.Role.RH)
        prompt = build_system_prompt(rh_user)
        assert "Valider ou refuser un congé" in prompt

    def test_employe_ne_voit_pas_les_actions_reservees_au_rh(self, employee):
        prompt = build_system_prompt(employee.user)
        assert "Poser un congé" in prompt
        assert "Créer une offre d'emploi" not in prompt
        assert "Valider ou refuser un congé" not in prompt

    def test_candidat_n_a_aucune_action(self):
        candidate = UserFactory.create(role=User.Role.CANDIDATE)
        prompt = build_system_prompt(candidate)
        assert "Tu n'as aucune action à exécuter" in prompt
        assert "Créer une offre d'emploi" not in prompt

    def test_interdit_de_pretendre_avoir_execute(self):
        """L'exécution passe par le function-calling, pas par cette réponse."""
        rh_user = UserFactory.create(role=User.Role.RH)
        prompt = build_system_prompt(rh_user)
        assert "Ne prétends jamais avoir déjà exécuté" in prompt
