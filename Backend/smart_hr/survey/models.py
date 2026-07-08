from django.conf import settings
from django.db import models

from smart_hr.core.models import TimeStampedModel


class Survey(TimeStampedModel):
    """Enquête interne (engagement, onboarding, satisfaction...) créée par les RH,
    remplaçant le suivi ad hoc sous Excel/formulaires externes."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Clôturée"

    title = models.CharField(max_length=200, verbose_name="Titre")
    description = models.TextField(blank=True, verbose_name="Description")
    is_anonymous = models.BooleanField(default=False, verbose_name="Anonyme")
    start_date = models.DateField(null=True, blank=True, verbose_name="Date de début")
    end_date = models.DateField(null=True, blank=True, verbose_name="Date de fin")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT, verbose_name="Statut")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_surveys",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Enquête"
        verbose_name_plural = "Enquêtes"

    def __str__(self) -> str:
        return self.title


class SurveyQuestion(TimeStampedModel):
    """Question d'une enquête. `options` n'est utilisé que pour les questions
    à choix (liste de libellés) — ignoré pour TEXT et RATING."""

    class QuestionType(models.TextChoices):
        TEXT = "text", "Texte libre"
        RATING = "rating", "Note (1-5)"
        SINGLE_CHOICE = "single_choice", "Choix unique"
        MULTIPLE_CHOICE = "multiple_choice", "Choix multiple"

    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name="questions")
    text = models.CharField(max_length=500, verbose_name="Question")
    question_type = models.CharField(max_length=20, choices=QuestionType.choices, default=QuestionType.TEXT)
    options = models.JSONField(default=list, blank=True, verbose_name="Options de réponse")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Question d'enquête"
        verbose_name_plural = "Questions d'enquête"

    def __str__(self) -> str:
        return f"{self.survey} — {self.text}"


class SurveyResponse(TimeStampedModel):
    """Une soumission complète d'un employé à une enquête — une seule par
    couple (survey, respondent), qu'elle soit anonyme ou non (l'identité du
    répondant sert uniquement à empêcher les doubles soumissions ; elle n'est
    jamais exposée dans les résultats agrégés d'une enquête anonyme)."""

    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name="responses")
    respondent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="survey_responses",
    )
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("survey", "respondent")]
        ordering = ["-submitted_at"]
        verbose_name = "Réponse à l'enquête"
        verbose_name_plural = "Réponses aux enquêtes"

    def __str__(self) -> str:
        return f"{self.respondent} → {self.survey}"


class SurveyAnswer(TimeStampedModel):
    """Réponse à une question donnée, rattachée à une SurveyResponse."""

    response = models.ForeignKey(SurveyResponse, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(SurveyQuestion, on_delete=models.CASCADE, related_name="answers")
    text_answer = models.TextField(blank=True, verbose_name="Réponse texte/note")
    selected_options = models.JSONField(default=list, blank=True, verbose_name="Options sélectionnées")

    class Meta:
        ordering = ["question__order"]
        verbose_name = "Réponse à une question"
        verbose_name_plural = "Réponses aux questions"

    def __str__(self) -> str:
        return f"{self.response} — {self.question}"
