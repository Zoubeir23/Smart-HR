from __future__ import annotations

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.survey.models import Survey
from smart_hr.survey.models import SurveyQuestion
from smart_hr.survey.models import SurveyResponse
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/surveys/surveys/"


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE, first_name="Awa", last_name="Diallo")


@pytest.fixture
def other_employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE, first_name="Moussa", last_name="Sow")


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


CREATE_PAYLOAD = {
    "title": "Enquête de satisfaction Q1",
    "description": "Votre avis compte",
    "is_anonymous": False,
    "questions": [
        {"text": "Recommanderiez-vous l'entreprise ?", "question_type": "rating"},
        {"text": "Qu'aimeriez-vous améliorer ?", "question_type": "text"},
        {
            "text": "Quel est votre département préféré pour collaborer ?",
            "question_type": "single_choice",
            "options": ["Tech", "RH", "Commercial"],
        },
    ],
}


class TestCreateSurvey:
    def test_anonymous_cannot_create(self):
        client = APIClient()
        response = client.post(LIST_URL, CREATE_PAYLOAD, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_cannot_create(self, employee_user):
        client = _authenticated_client(employee_user)
        response = client.post(LIST_URL, CREATE_PAYLOAD, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_create_survey_with_questions(self, rh_user):
        client = _authenticated_client(rh_user)
        response = client.post(LIST_URL, CREATE_PAYLOAD, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        survey = Survey.objects.get(pk=response.data["id"])
        assert survey.questions.count() == 3
        assert survey.status == Survey.Status.DRAFT
        assert survey.created_by == rh_user

    def test_requires_at_least_one_question(self, rh_user):
        client = _authenticated_client(rh_user)
        payload = {"title": "Vide", "questions": []}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_questions_with_only_empty_text(self, rh_user):
        client = _authenticated_client(rh_user)
        payload = {"title": "Enquête", "questions": [{"text": "", "question_type": "text"}]}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not Survey.objects.filter(title="Enquête").exists()


class TestUpdateSurveyStatus:
    def test_rh_can_activate_draft_survey(self, rh_user):
        survey = Survey.objects.create(title="Enquête", status=Survey.Status.DRAFT, created_by=rh_user)
        client = _authenticated_client(rh_user)
        response = client.patch(f"{LIST_URL}{survey.pk}/", {"status": "active"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        survey.refresh_from_db()
        assert survey.status == Survey.Status.ACTIVE

    def test_employee_cannot_update_status(self, rh_user, employee_user):
        survey = Survey.objects.create(title="Enquête", status=Survey.Status.DRAFT, created_by=rh_user)
        client = _authenticated_client(employee_user)
        response = client.patch(f"{LIST_URL}{survey.pk}/", {"status": "active"}, format="json")
        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)


class TestListSurveys:
    def test_rh_sees_all_surveys_including_drafts(self, rh_user):
        Survey.objects.create(title="Brouillon", status=Survey.Status.DRAFT, created_by=rh_user)
        Survey.objects.create(title="Active", status=Survey.Status.ACTIVE, created_by=rh_user)
        client = _authenticated_client(rh_user)
        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        assert len(results) == 2

    def test_employee_only_sees_active_surveys(self, rh_user, employee_user):
        Survey.objects.create(title="Brouillon", status=Survey.Status.DRAFT, created_by=rh_user)
        Survey.objects.create(title="Active", status=Survey.Status.ACTIVE, created_by=rh_user)
        Survey.objects.create(title="Clôturée", status=Survey.Status.CLOSED, created_by=rh_user)
        client = _authenticated_client(employee_user)
        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["title"] == "Active"


class TestRespondToSurvey:
    def _create_active_survey(self, rh_user) -> Survey:
        survey = Survey.objects.create(title="Enquête", status=Survey.Status.ACTIVE, created_by=rh_user)
        SurveyQuestion.objects.create(
            survey=survey, text="Note globale", question_type=SurveyQuestion.QuestionType.RATING, order=0
        )
        SurveyQuestion.objects.create(survey=survey, text="Commentaire", question_type=SurveyQuestion.QuestionType.TEXT, order=1)
        return survey

    def test_employee_can_submit_response(self, rh_user, employee_user):
        survey = self._create_active_survey(rh_user)
        questions = list(survey.questions.all())
        client = _authenticated_client(employee_user)
        payload = {
            "answers": [
                {"question": questions[0].pk, "text_answer": "4"},
                {"question": questions[1].pk, "text_answer": "Très bien dans l'ensemble."},
            ]
        }
        response = client.post(f"{LIST_URL}{survey.pk}/respond/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert SurveyResponse.objects.filter(survey=survey, respondent=employee_user).exists()
        survey_response = SurveyResponse.objects.get(survey=survey, respondent=employee_user)
        assert survey_response.answers.count() == 2

    def test_employee_cannot_submit_twice(self, rh_user, employee_user):
        survey = self._create_active_survey(rh_user)
        client = _authenticated_client(employee_user)
        payload = {"answers": [{"question": survey.questions.first().pk, "text_answer": "4"}]}
        client.post(f"{LIST_URL}{survey.pk}/respond/", payload, format="json")
        response = client.post(f"{LIST_URL}{survey.pk}/respond/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_employee_cannot_see_or_respond_to_draft_survey(self, rh_user, employee_user):
        """Un brouillon n'apparaît même pas dans le queryset d'un employé (get_queryset
        le filtre déjà sur ACTIVE) — la tentative de réponse échoue donc en 404,
        pas en 400, ce qui évite de révéler l'existence de brouillons non publiés."""
        survey = Survey.objects.create(title="Brouillon", status=Survey.Status.DRAFT, created_by=rh_user)
        question = SurveyQuestion.objects.create(survey=survey, text="Q", question_type=SurveyQuestion.QuestionType.TEXT)
        client = _authenticated_client(employee_user)
        response = client.post(
            f"{LIST_URL}{survey.pk}/respond/", {"answers": [{"question": question.pk, "text_answer": "x"}]}, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_rh_cannot_respond_to_own_draft_survey(self, rh_user):
        survey = Survey.objects.create(title="Brouillon", status=Survey.Status.DRAFT, created_by=rh_user)
        question = SurveyQuestion.objects.create(survey=survey, text="Q", question_type=SurveyQuestion.QuestionType.TEXT)
        client = _authenticated_client(rh_user)
        response = client.post(
            f"{LIST_URL}{survey.pk}/respond/", {"answers": [{"question": question.pk, "text_answer": "x"}]}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_respond_to_closed_survey(self, rh_user):
        survey = Survey.objects.create(title="Clôturée", status=Survey.Status.CLOSED, created_by=rh_user)
        question = SurveyQuestion.objects.create(survey=survey, text="Q", question_type=SurveyQuestion.QuestionType.TEXT)
        client = _authenticated_client(rh_user)
        response = client.post(
            f"{LIST_URL}{survey.pk}/respond/", {"answers": [{"question": question.pk, "text_answer": "x"}]}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rh_cannot_respond_to_active_survey(self, rh_user):
        survey = Survey.objects.create(title="Enquête", status=Survey.Status.ACTIVE, created_by=rh_user)
        question = SurveyQuestion.objects.create(survey=survey, text="Q", question_type=SurveyQuestion.QuestionType.TEXT)
        client = _authenticated_client(rh_user)
        response = client.post(
            f"{LIST_URL}{survey.pk}/respond/", {"answers": [{"question": question.pk, "text_answer": "x"}]}, format="json"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rating_answer_must_be_numeric(self, rh_user, employee_user):
        survey = Survey.objects.create(title="Enquête", status=Survey.Status.ACTIVE, created_by=rh_user)
        rating_q = SurveyQuestion.objects.create(survey=survey, text="Note", question_type=SurveyQuestion.QuestionType.RATING)
        client = _authenticated_client(employee_user)
        response = client.post(
            f"{LIST_URL}{survey.pk}/respond/",
            {"answers": [{"question": rating_q.pk, "text_answer": "pas un nombre"}]},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not SurveyResponse.objects.filter(survey=survey, respondent=employee_user).exists()


class TestSurveyResults:
    def test_employee_cannot_view_results(self, rh_user, employee_user):
        survey = Survey.objects.create(title="Enquête", status=Survey.Status.ACTIVE, created_by=rh_user)
        client = _authenticated_client(employee_user)
        response = client.get(f"{LIST_URL}{survey.pk}/results/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_sees_aggregated_rating_and_choice_results(self, rh_user, employee_user, other_employee_user):
        survey = Survey.objects.create(title="Enquête", status=Survey.Status.ACTIVE, created_by=rh_user)
        rating_q = SurveyQuestion.objects.create(
            survey=survey, text="Note", question_type=SurveyQuestion.QuestionType.RATING, order=0
        )
        choice_q = SurveyQuestion.objects.create(
            survey=survey,
            text="Département préféré",
            question_type=SurveyQuestion.QuestionType.SINGLE_CHOICE,
            options=["Tech", "RH"],
            order=1,
        )

        client1 = _authenticated_client(employee_user)
        client1.post(
            f"{LIST_URL}{survey.pk}/respond/",
            {"answers": [{"question": rating_q.pk, "text_answer": "5"}, {"question": choice_q.pk, "selected_options": ["Tech"]}]},
            format="json",
        )
        client2 = _authenticated_client(other_employee_user)
        client2.post(
            f"{LIST_URL}{survey.pk}/respond/",
            {"answers": [{"question": rating_q.pk, "text_answer": "3"}, {"question": choice_q.pk, "selected_options": ["Tech"]}]},
            format="json",
        )

        client_rh = _authenticated_client(rh_user)
        response = client_rh.get(f"{LIST_URL}{survey.pk}/results/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_responses"] == 2

        results_by_question = {r["question_id"]: r for r in response.data["questions"]}
        assert results_by_question[rating_q.pk]["average"] == 4.0
        assert results_by_question[choice_q.pk]["option_counts"] == {"Tech": 2}

    def test_results_ignores_non_numeric_rating_answers_without_crashing(self, rh_user, employee_user):
        from smart_hr.survey.models import SurveyAnswer

        survey = Survey.objects.create(title="Enquête", status=Survey.Status.ACTIVE, created_by=rh_user)
        rating_q = SurveyQuestion.objects.create(survey=survey, text="Note", question_type=SurveyQuestion.QuestionType.RATING)
        survey_response = SurveyResponse.objects.create(survey=survey, respondent=employee_user)
        SurveyAnswer.objects.create(response=survey_response, question=rating_q, text_answer="invalide")

        client_rh = _authenticated_client(rh_user)
        response = client_rh.get(f"{LIST_URL}{survey.pk}/results/")

        assert response.status_code == status.HTTP_200_OK
        results_by_question = {r["question_id"]: r for r in response.data["questions"]}
        assert results_by_question[rating_q.pk]["average"] is None
        assert results_by_question[rating_q.pk]["response_count"] == 0

    def test_anonymous_survey_results_do_not_expose_respondent_identity(self, rh_user, employee_user):
        survey = Survey.objects.create(
            title="Enquête anonyme", status=Survey.Status.ACTIVE, is_anonymous=True, created_by=rh_user
        )
        question = SurveyQuestion.objects.create(
            survey=survey, text="Commentaire", question_type=SurveyQuestion.QuestionType.TEXT
        )
        client = _authenticated_client(employee_user)
        client.post(
            f"{LIST_URL}{survey.pk}/respond/", {"answers": [{"question": question.pk, "text_answer": "Super"}]}, format="json"
        )

        client_rh = _authenticated_client(rh_user)
        response = client_rh.get(f"{LIST_URL}{survey.pk}/results/")
        body = str(response.data)
        assert "Awa" not in body
        assert "Diallo" not in body


class TestMyResponseStatus:
    def test_survey_list_indicates_whether_employee_has_responded(self, rh_user, employee_user):
        survey = Survey.objects.create(title="Enquête", status=Survey.Status.ACTIVE, created_by=rh_user)
        question = SurveyQuestion.objects.create(survey=survey, text="Q", question_type=SurveyQuestion.QuestionType.TEXT)
        client = _authenticated_client(employee_user)

        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        assert results[0]["has_responded"] is False

        client.post(
            f"{LIST_URL}{survey.pk}/respond/", {"answers": [{"question": question.pk, "text_answer": "x"}]}, format="json"
        )

        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        assert results[0]["has_responded"] is True
