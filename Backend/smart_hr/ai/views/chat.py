from __future__ import annotations

import logging

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

logger = logging.getLogger(__name__)

_TITLE_MAX_LENGTH = 60


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
        Body: { "question": "...", "conversation": <id, optionnel> }
        Génère une réponse IA personnalisée selon le rôle et les données réelles DB.
        Si aucun `conversation` n'est fourni, un nouveau fil est créé automatiquement.
        """
        question = request.data.get("question", "").strip()
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
            from smart_hr.ai.actions import extract_leave_parameters

            action_intent = detect_action_intent(question)
            if action_intent:
                params = extract_leave_parameters(question)
                action_result = execute_action(action_intent, request.user, params)

        ai_response = _get_ai_response(question, request.user, conversation)

        if action_result.get("success"):
            leave_data = action_result["data"]
            ai_response += (
                f"\n\n✅ Demande de congé créée : **{leave_data['leave_type']}** "
                f"du {leave_data['start_date']} au {leave_data['end_date']} "
                f"({leave_data['duration_days']} jour(s)) — {leave_data['status']}."
            )
        elif action_result.get("error") == "dates_missing":
            ai_response += "\n\nPour créer votre demande automatiquement, précisez les dates (ex: du 01/06/2026 au 05/06/2026)."

        chat = ChatHistory.objects.create(
            user=request.user,
            conversation=conversation,
            question=question,
            response=ai_response,
            action_type=action_result.get("type", ""),
            action_data=action_result.get("data", {}),
        )
        serializer = self.get_serializer(chat)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
