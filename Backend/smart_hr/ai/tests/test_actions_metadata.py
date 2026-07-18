from __future__ import annotations

from smart_hr.ai.actions import list_supported_actions_for_role


class TestListSupportedActionsForRole:
    def test_rh_sees_all_actions_including_job_offer_creation(self):
        intents = [action["intent"] for action in list_supported_actions_for_role("RH")]
        assert "job_offer_creation" in intents
        assert "onboarding_creation" in intents
        assert "leave_approval" in intents
        assert "leave_request" in intents
        assert "objective_creation" in intents

    def test_employee_does_not_see_rh_only_actions(self):
        intents = [action["intent"] for action in list_supported_actions_for_role("EMPLOYEE")]
        assert "job_offer_creation" not in intents
        assert "onboarding_creation" not in intents
        assert "leave_approval" not in intents
        assert "leave_request" in intents
        assert "objective_creation" in intents

    def test_candidate_sees_no_actionable_intent(self):
        assert list_supported_actions_for_role("CANDIDATE") == []

    def test_unknown_role_sees_no_actionable_intent(self):
        assert list_supported_actions_for_role("") == []

    def test_each_action_exposes_label_and_example(self):
        for action in list_supported_actions_for_role("ADMIN"):
            assert action["label"]
            assert action["example"]
