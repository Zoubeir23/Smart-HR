from __future__ import annotations

import logging
import os

from rest_framework import status
from rest_framework import viewsets
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.ai.context_builder import build_system_prompt
from smart_hr.ai.llm_providers import get_llm_provider
from smart_hr.ai.models import ChatHistory
from smart_hr.ai.models import Conversation
from smart_hr.ai.serializers import ChatHistorySerializer
from smart_hr.core.throttles import AILLMUserThrottle
from smart_hr.recruitment.services.document_text_extraction import SUPPORTED_DOCUMENT_EXTENSIONS
from smart_hr.recruitment.services.document_text_extraction import extract_text_from_uploaded_document

logger = logging.getLogger(__name__)

_TITLE_MAX_LENGTH = 60

# ─── Pièce jointe (fiche de poste, document RH…) ─────────────────────────────

_MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024  # 10 Mo, aligné sur job-offers/generate
# Borne le contenu injecté dans le prompt pour protéger la fenêtre de contexte
# du LLM (un PDF de plusieurs pages dépasse vite la limite de tokens).
_MAX_ATTACHMENT_TEXT_CHARS = 8000
_DEFAULT_QUESTION_WITH_ATTACHMENT = "Analyse le document joint et fais-en une synthèse."


def _load_attachment(request) -> tuple[str, str, Response | None]:
    """Valide et lit le fichier joint optionnel de la requête chat.

    Retourne (nom_du_fichier, texte_extrait, réponse_d_erreur_ou_None).
    Un fichier illisible (extension supportée mais extraction vide) est signalé
    à l'appelant par une erreur explicite plutôt qu'ignoré en silence."""
    uploaded_file = request.FILES.get("file")
    if uploaded_file is None:
        return "", "", None

    extension = os.path.splitext(uploaded_file.name)[1].lower()
    if extension not in SUPPORTED_DOCUMENT_EXTENSIONS:
        return (
            "",
            "",
            Response(
                {
                    "detail": (
                        f"Extension «{extension}» non supportée. "
                        f"Formats acceptés : {', '.join(sorted(SUPPORTED_DOCUMENT_EXTENSIONS))}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            ),
        )
    if uploaded_file.size > _MAX_ATTACHMENT_SIZE_BYTES:
        return (
            "",
            "",
            Response(
                {"detail": "Fichier trop volumineux. Maximum autorisé : 10 Mo."},
                status=status.HTTP_400_BAD_REQUEST,
            ),
        )

    file_text = extract_text_from_uploaded_document(uploaded_file)
    if not file_text:
        return (
            "",
            "",
            Response(
                {"detail": "Impossible de lire le contenu du fichier. Vérifiez qu'il n'est pas vide ou protégé."},
                status=status.HTTP_400_BAD_REQUEST,
            ),
        )

    return uploaded_file.name, file_text[:_MAX_ATTACHMENT_TEXT_CHARS], None


def _truncate_title(question: str) -> str:
    """Titre de conversation par troncature du premier message (comme ChatGPT) —
    pas d'appel LLM dédié, gratuit et instantané."""
    question = question.strip()
    if len(question) <= _TITLE_MAX_LENGTH:
        return question
    return question[:_TITLE_MAX_LENGTH].rstrip() + "…"


# ─── Conversation history ─────────────────────────────────────────────────────


def _build_conversation_history(conversation: Conversation) -> list[dict]:
    """Retourne les 6 derniers échanges de CE fil de discussion, au format unifié.

    Scopé au fil (pas à l'utilisateur) pour ne pas mélanger le contexte de
    sujets sans rapport dans une même session utilisateur.
    """
    recent = list(ChatHistory.objects.filter(conversation=conversation).order_by("-created_at")[:6])
    history = []
    for past in reversed(recent):
        history.append({"role": "user", "content": past.question})
        history.append({"role": "assistant", "content": past.response})
    return history


# ─── Escalade humaine ─────────────────────────────────────────────────────────

_UNCERTAIN_MARKERS = (
    "je ne sais pas",
    "je n'ai pas",
    "pas suffisamment d'informations",
    "je ne peux pas répondre",
    "hors de mes compétences",
    "je ne comprends pas",
    "je n'ai pas accès",
)

_HUMAN_ESCALATION_MESSAGE = (
    "Je ne dispose pas des informations nécessaires pour répondre à cette question. "
    "Pour une assistance personnalisée, veuillez contacter directement votre Responsable RH."
)


def _needs_human_escalation(response_text: str) -> bool:
    lower = response_text.lower()
    return any(marker in lower for marker in _UNCERTAIN_MARKERS)


def _count_recent_uncertain_responses(conversation: Conversation) -> int:
    recent = list(ChatHistory.objects.filter(conversation=conversation).order_by("-created_at")[:2])
    return sum(1 for chat in recent if _HUMAN_ESCALATION_MESSAGE[:40] in chat.response)


# ─── LLM call ────────────────────────────────────────────────────────────────


def _get_ai_response(question: str, user, conversation: Conversation) -> str:
    """Interroge le LLM avec un prompt système contextuel selon le rôle."""
    if _count_recent_uncertain_responses(conversation) >= 2:
        return _HUMAN_ESCALATION_MESSAGE

    try:
        provider = get_llm_provider()
        system_prompt = build_system_prompt(user)
        history = _build_conversation_history(conversation)
        response_text = provider.generate_response(system_prompt, history, question)

        if _needs_human_escalation(response_text):
            return _HUMAN_ESCALATION_MESSAGE

        return response_text
    except Exception as exc:
        logger.error("Erreur LLM provider : %s", exc)
        return "Désolé, le service IA est temporairement indisponible. Veuillez réessayer."


# ─── Agent(s) d'action — mise en forme du résultat ────────────────────────────


def _format_action_success_suffix(action_result: dict) -> str:
    if action_result["type"] == "leave_created":
        leave_data = action_result["data"]
        return (
            f"\n\n✅ Demande de congé créée : **{leave_data['leave_type']}** "
            f"du {leave_data['start_date']} au {leave_data['end_date']} "
            f"({leave_data['duration_days']} jour(s)) — {leave_data['status']}."
        )
    if action_result["type"] == "objective_created":
        objective_data = action_result["data"]
        return (
            f"\n\n✅ Objectif OKR créé : **{objective_data['title']}** "
            f"({objective_data['level_display']}, {objective_data['period']}) "
            f"avec {objective_data['key_results_count']} résultat(s) clé(s)."
        )
    if action_result["type"] == "onboarding_created":
        onboarding_data = action_result["data"]
        return (
            f"\n\n✅ {onboarding_data['program_type_display']} créé pour **{onboarding_data['employee_name']}** : "
            f"**{onboarding_data['title']}** avec {onboarding_data['steps_count']} étape(s)."
        )
    if action_result["type"] == "leave_decision_applied":
        decision_data = action_result["data"]
        verb = "validée" if decision_data["decision"] == "approve" else "refusée"
        return (
            f"\n\n✅ Demande de congé de **{decision_data['employee_name']}** {verb} : "
            f"**{decision_data['leave_type']}** du {decision_data['start_date']} au {decision_data['end_date']}."
        )
    if action_result["type"] == "job_offer_created":
        job_offer_data = action_result["data"]
        return (
            f"\n\n✅ Offre d'emploi créée : **{job_offer_data['title']}** "
            f"({job_offer_data['department']}, {job_offer_data['job_type_display']}) — "
            f"{job_offer_data['status_display']}."
        )
    return ""


_ACTION_ERROR_MESSAGES = {
    "dates_missing": "\n\nPour créer votre demande automatiquement, précisez les dates (ex: du 01/06/2026 au 05/06/2026).",
    "objective_info_missing": (
        "\n\nPour créer votre objectif automatiquement, précisez son titre, sa période "
        '(ex: Q1 2026) et au moins un résultat clé mesurable (ex: "signer 10 clients").'
    ),
    "department_not_found": "\n\nJe n'ai pas trouvé ce département. Vérifiez son nom exact et réessayez.",
    "employee_not_found": (
        "\n\nJe n'ai pas trouvé cet employé (ou son nom est ambigu). Précisez son prénom et son nom complets exacts."
    ),
    "onboarding_info_missing": (
        "\n\nPour créer le programme automatiquement, précisez le poste ou le contexte "
        "afin que je puisse générer les étapes d'intégration."
    ),
    "leave_decision_missing": (
        "\n\nJe n'ai pas compris votre décision. Précisez si vous souhaitez valider ou refuser la demande de congé."
    ),
    "no_pending_leave": "\n\nAucune demande de congé en attente n'a été trouvée pour cet employé.",
}


def _format_action_result_suffix(action_result: dict) -> str:
    """Complète la réponse du LLM par la confirmation/l'erreur de l'action
    métier exécutée (congé, objectif OKR...), le cas échéant.

    `_ACTION_ERROR_MESSAGES` couvre les codes d'erreur courts (ex: "dates_missing")
    qui doivent être reformulés en une phrase conviviale. Les fonctions d'exécution
    (`_execute_leave_request`, `_execute_objective_creation`...) retournent parfois
    directement une phrase complète déjà destinée à l'utilisateur (ex: "Aucun profil
    employé trouvé...") — celle-ci est alors affichée telle quelle plutôt que
    silencieusement ignorée si elle ne correspond à aucun code connu."""
    if not action_result:
        return ""
    if action_result.get("success"):
        return _format_action_success_suffix(action_result)

    error = action_result.get("error") or ""
    if error in _ACTION_ERROR_MESSAGES:
        return _ACTION_ERROR_MESSAGES[error]
    return f"\n\n⚠️ {error}" if error else ""


# ─── ViewSet ─────────────────────────────────────────────────────────────────


class ChatHistoryViewSet(viewsets.ModelViewSet):
    """Historique des conversations IA d'un utilisateur authentifié."""

    serializer_class = ChatHistorySerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [AILLMUserThrottle]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return ChatHistory.objects.filter(user=self.request.user).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        """
        POST /api/v1/ai/chat/
        Body (JSON ou multipart) : { "question": "...", "conversation": <id, optionnel> }
        et/ou { "file": <PDF|TXT|MD> } — le contenu du fichier joint (fiche de
        poste, document RH…) est lu et fourni au LLM comme contexte de la question.
        Génère une réponse IA personnalisée selon le rôle et les données réelles DB.
        Si aucun `conversation` n'est fourni, un nouveau fil est créé automatiquement.
        """
        attachment_name, attachment_text, attachment_error = _load_attachment(request)
        if attachment_error is not None:
            return attachment_error

        question = request.data.get("question", "").strip()
        if not question and attachment_text:
            question = _DEFAULT_QUESTION_WITH_ATTACHMENT
        if not question:
            return Response(
                {"detail": "Le champ 'question' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(question) > 1000:
            return Response(
                {"detail": "La question ne peut pas dépasser 1000 caractères."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversation_id = request.data.get("conversation")
        if conversation_id:
            conversation = get_object_or_404(Conversation, id=conversation_id, user=request.user)
        else:
            conversation = Conversation.objects.create(user=request.user, title=_truncate_title(question))

        is_first_message = not ChatHistory.objects.filter(conversation=conversation).exists()
        if is_first_message and conversation.title in ("", "Nouvelle conversation"):
            conversation.title = _truncate_title(question)
        conversation.save()

        action_intent = None
        action_result: dict = {}
        user_role = getattr(request.user, "role", "").upper()
        if user_role in ("EMPLOYEE", "RH", "ADMIN"):
            from smart_hr.ai.actions import detect_action_intent
            from smart_hr.ai.actions import execute_action
            from smart_hr.ai.actions import extract_leave_approval_parameters
            from smart_hr.ai.actions import extract_leave_parameters
            from smart_hr.ai.actions import extract_objective_parameters
            from smart_hr.ai.actions import extract_onboarding_parameters

            action_intent = detect_action_intent(question)
            if action_intent == "leave_request":
                params = extract_leave_parameters(question)
                action_result = execute_action(action_intent, request.user, params)
            elif action_intent == "leave_approval":
                params = extract_leave_approval_parameters(question)
                action_result = execute_action(action_intent, request.user, params)
            elif action_intent == "objective_creation":
                params = extract_objective_parameters(question, can_manage=user_role in ("RH", "ADMIN"))
                action_result = execute_action(action_intent, request.user, params)
            elif action_intent == "onboarding_creation":
                params = extract_onboarding_parameters(question)
                action_result = execute_action(action_intent, request.user, params)

        # Le contenu du document n'est injecté que dans le prompt de CE tour ;
        # l'historique stocke la question de l'utilisateur avec un simple
        # marqueur 📎 pour ne pas polluer l'affichage des bulles.
        question_for_llm = question
        stored_question = question
        if attachment_text:
            question_for_llm = f"{question}\n\n--- Contenu du document joint « {attachment_name} » ---\n{attachment_text}"
            stored_question = f"{question}\n\n📎 {attachment_name}"

        ai_response = _get_ai_response(question_for_llm, request.user, conversation)
        ai_response += _format_action_result_suffix(action_result)

        chat = ChatHistory.objects.create(
            user=request.user,
            conversation=conversation,
            question=stored_question,
            response=ai_response,
            action_type=action_result.get("type", ""),
            action_data=action_result.get("data", {}),
        )
        serializer = self.get_serializer(chat)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
