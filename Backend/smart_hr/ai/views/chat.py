import logging
import os

from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.ai.models import ChatHistory
from smart_hr.ai.serializers import ChatHistorySerializer

logger = logging.getLogger(__name__)


def _get_ai_response(question: str) -> str:
    """
    Appelle Google Gemini pour générer une réponse.
    Retourne un message d'erreur gracieux si l'API n'est pas configurée.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return (
            "L'assistant IA n'est pas configuré. "
            "Veuillez définir la variable d'environnement GEMINI_API_KEY."
        )
    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        system_prompt = (
            "Tu es un assistant RH expert pour Smart-HR. "
            "Réponds de manière concise et professionnelle aux questions RH. "
            "Si la question est hors sujet, redirige poliment vers les sujets RH."
        )
        response = model.generate_content(f"{system_prompt}\n\nQuestion : {question}")
        return response.text
    except Exception as exc:
        logger.error("Erreur Gemini API : %s", exc)
        return "Désolé, le service IA est temporairement indisponible. Veuillez réessayer."


class ChatHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = ChatHistorySerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return ChatHistory.objects.filter(user=self.request.user).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        """
        POST /api/v1/ai/chat/
        Body: { "question": "..." }
        Génère une réponse IA et sauvegarde l'échange.
        """
        question = request.data.get("question", "").strip()
        if not question:
            return Response(
                {"detail": "Le champ 'question' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ai_response = _get_ai_response(question)

        chat = ChatHistory.objects.create(
            user=request.user,
            question=question,
            response=ai_response,
        )
        serializer = self.get_serializer(chat)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
