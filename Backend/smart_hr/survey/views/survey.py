from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.survey.models import Survey
from smart_hr.survey.models import SurveyAnswer
from smart_hr.survey.models import SurveyQuestion
from smart_hr.survey.models import SurveyResponse
from smart_hr.survey.serializers import SurveySerializer
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH


class SurveyViewSet(viewsets.ModelViewSet):
    """Enquêtes internes : RH crée et publie, les employés répondent une fois,
    RH consulte les résultats agrégés (respectant l'anonymat le cas échéant)."""

    serializer_class = SurveySerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = Survey.objects.prefetch_related("questions").order_by("-created_at")
        if user.role in ["ADMIN", "RH"]:
            return qs
        return qs.filter(status=Survey.Status.ACTIVE)

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "results"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """
        POST /api/v1/surveys/surveys/
        Body: { title, description, is_anonymous, start_date, end_date,
                questions: [{text, question_type, options}, ...] }
        """
        questions_payload = request.data.get("questions") or []
        valid_questions = [q for q in questions_payload if q.get("text")]
        if not valid_questions:
            return Response({"questions": ["Au moins une question est requise."]}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        survey = serializer.save(created_by=request.user)

        SurveyQuestion.objects.bulk_create(
            [
                SurveyQuestion(
                    survey=survey,
                    text=q.get("text", ""),
                    question_type=q.get("question_type", SurveyQuestion.QuestionType.TEXT),
                    options=q.get("options") or [],
                    order=index,
                )
                for index, q in enumerate(valid_questions)
            ]
        )

        output = self.get_serializer(survey)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="respond")
    def respond(self, request, pk=None):
        """POST /surveys/{id}/respond/ — Body: { answers: [{question, text_answer, selected_options}, ...] }"""
        survey = self.get_object()

        if survey.status != Survey.Status.ACTIVE:
            return Response({"detail": "Cette enquête n'est pas ouverte aux réponses."}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.role != User.Role.EMPLOYEE:
            return Response(
                {"detail": "Seuls les employés peuvent répondre aux enquêtes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if SurveyResponse.objects.filter(survey=survey, respondent=request.user).exists():
            return Response({"detail": "Vous avez déjà répondu à cette enquête."}, status=status.HTTP_400_BAD_REQUEST)

        answers_payload = request.data.get("answers") or []
        if not answers_payload:
            return Response({"answers": ["Au moins une réponse est requise."]}, status=status.HTTP_400_BAD_REQUEST)

        error_response = self._validate_answers_payload(survey, answers_payload)
        if error_response is not None:
            return error_response

        survey_response = SurveyResponse.objects.create(survey=survey, respondent=request.user)
        SurveyAnswer.objects.bulk_create(
            [
                SurveyAnswer(
                    response=survey_response,
                    question_id=answer["question"],
                    text_answer=answer.get("text_answer", ""),
                    selected_options=answer.get("selected_options") or [],
                )
                for answer in answers_payload
            ]
        )

        return Response({"detail": "Réponse enregistrée."}, status=status.HTTP_201_CREATED)

    def _validate_answers_payload(self, survey, answers_payload):
        """Valide les réponses soumises ; renvoie une Response d'erreur ou None si tout est valide."""
        questions_by_id = {q.pk: q for q in survey.questions.all()}
        for answer in answers_payload:
            question = questions_by_id.get(answer.get("question"))
            if question is None:
                return Response({"detail": "Question invalide pour cette enquête."}, status=status.HTTP_400_BAD_REQUEST)
            if question.question_type == SurveyQuestion.QuestionType.RATING:
                try:
                    float(answer.get("text_answer", ""))
                except (TypeError, ValueError):
                    return Response(
                        {"detail": "La réponse à une question de type note doit être numérique."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        return None

    @action(detail=True, methods=["get"], url_path="results")
    def results(self, request, pk=None):
        """GET /surveys/{id}/results/ — Résultats agrégés (RH/Admin uniquement).

        - RATING : moyenne et distribution des notes.
        - SINGLE_CHOICE/MULTIPLE_CHOICE : nombre de sélections par option.
        - TEXT : liste des réponses libres (jamais associées à une identité
          dans les résultats, même si l'enquête n'est pas anonyme, pour rester
          cohérent avec l'usage prévu de ce tableau agrégé).
        """
        survey = self.get_object()
        total_responses = survey.responses.count()

        questions_data = []
        for question in survey.questions.all():
            answers = SurveyAnswer.objects.filter(question=question)
            entry = {
                "question_id": question.pk,
                "text": question.text,
                "question_type": question.question_type,
            }

            if question.question_type == SurveyQuestion.QuestionType.RATING:
                values = []
                for a in answers:
                    if not a.text_answer:
                        continue
                    try:
                        values.append(float(a.text_answer))
                    except ValueError:
                        continue
                entry["average"] = round(sum(values) / len(values), 2) if values else None
                entry["response_count"] = len(values)
            elif question.question_type in [
                SurveyQuestion.QuestionType.SINGLE_CHOICE,
                SurveyQuestion.QuestionType.MULTIPLE_CHOICE,
            ]:
                option_counts: dict[str, int] = {}
                for a in answers:
                    for option in a.selected_options:
                        option_counts[option] = option_counts.get(option, 0) + 1
                entry["option_counts"] = option_counts
            else:
                entry["text_answers"] = [a.text_answer for a in answers if a.text_answer]

            questions_data.append(entry)

        return Response({"total_responses": total_responses, "questions": questions_data})
