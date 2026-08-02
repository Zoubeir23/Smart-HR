from __future__ import annotations

import pytest

from smart_hr.messaging.contact_rules import allowed_contacts_queryset
from smart_hr.messaging.contact_rules import can_start_conversation
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory


@pytest.fixture
def admin_user(db) -> User:
    return UserFactory.create(role=User.Role.ADMIN)


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def candidate_user(db) -> User:
    return UserFactory.create(role=User.Role.CANDIDATE)


class TestCanStartConversation:
    def test_admin_can_contact_candidate(self, admin_user, candidate_user):
        assert can_start_conversation(admin_user, candidate_user) is True

    def test_rh_can_contact_candidate(self, rh_user, candidate_user):
        assert can_start_conversation(rh_user, candidate_user) is True

    def test_employee_cannot_contact_candidate(self, employee_user, candidate_user):
        assert can_start_conversation(employee_user, candidate_user) is False

    def test_candidate_cannot_contact_employee(self, candidate_user, employee_user):
        assert can_start_conversation(candidate_user, employee_user) is False

    def test_candidate_can_contact_rh(self, candidate_user, rh_user):
        assert can_start_conversation(candidate_user, rh_user) is True

    def test_employee_can_contact_employee(self, db, employee_user):
        colleague = UserFactory.create(role=User.Role.EMPLOYEE)
        assert can_start_conversation(employee_user, colleague) is True

    def test_user_cannot_contact_himself(self, employee_user):
        assert can_start_conversation(employee_user, employee_user) is False

    def test_inactive_recipient_is_not_contactable(self, db, rh_user):
        inactive = UserFactory.create(role=User.Role.EMPLOYEE, is_active=False)
        assert can_start_conversation(rh_user, inactive) is False


class TestAllowedContactsQueryset:
    def test_candidate_sees_only_rh_and_admin(
        self,
        candidate_user,
        rh_user,
        admin_user,
        employee_user,
        db,
    ):
        other_candidate = UserFactory.create(role=User.Role.CANDIDATE)

        contacts = list(allowed_contacts_queryset(candidate_user))

        assert rh_user in contacts
        assert admin_user in contacts
        assert employee_user not in contacts
        assert other_candidate not in contacts

    def test_employee_does_not_see_candidates(self, employee_user, candidate_user, rh_user):
        contacts = list(allowed_contacts_queryset(employee_user))

        assert candidate_user not in contacts
        assert rh_user in contacts

    def test_initiator_is_excluded_from_his_own_contacts(self, rh_user):
        assert rh_user not in list(allowed_contacts_queryset(rh_user))
