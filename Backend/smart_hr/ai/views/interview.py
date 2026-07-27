from __future__ import annotations

import json
import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.ai.llm_providers import get_llm_provider
from smart_hr.core.prompt_safety import sanitize_conversation_message
from smart_hr.core.prompt_safety import sanitize_free_text
from smart_hr.core.prompt_safety import validate_conversation
from smart_hr.core.throttles import AILLMUserThrottle
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)

_QUESTIONS_PROMPT = """Tu es un expert en recrutement et en conduite d'entretiens professionnels.
Sur la base des informations suivantes, génère une liste structurée de questions d'entretien de haute qualité :

Poste : {job_position}
Description du poste : {job_description}
Durée de l'entretien : {duration}
Type d'entretien : {interview_type}

Ta mission :
- Analyse la description du poste pour identifier les compétences clés et les responsabilités.
- Génère un nombre de questions adapté à la durée de l'entretien.
- Adapte la profondeur des questions au type d'entretien indiqué.

Retourne UNIQUEMENT un JSON valide sans markdown, sans backticks.
Format attendu :
{{
  "interviewQuestions": [
    {{"question": "...", "type": "Technique|Comportemental|Expérience|Résolution de problèmes|Leadership"}},
    ...
  ]
}}"""

_FEEDBACK_PROMPT = """Voici la transcription d'un entretien entre un assistant RH et un candidat :

{conversation}

Sur la base de cet entretien, évalue le candidat et retourne UNIQUEMENT un JSON valide sans markdown ni backticks.
Format attendu :
{{
  "feedback": {{
    "rating": {{
      "technicalSkills": <score sur 10>,
      "communication": <score sur 10>,
      "problemSolving": <score sur 10>,
      "experience": <score sur 10>,
      "totalRating": <moyenne sur 10>
    }},
    "summary": "<résumé de 3 phrases sur la performance>",
    "recommendation": true,
    "recommendationMessage": "<une phrase de recommandation ou de refus>"
  }}
}}"""


class GenerateInterviewQuestionsView(APIView):
    """
    POST /api/v1/ai/interview/questions/
    Body: { job_position, job_description, duration, interview_type }
    Génère une liste de questions d'entretien via le LLM actif. Réservé RH/Admin,
    seul rôle exposé à cette action côté frontend (`/recruteur-ia`).
    """

    permission_classes = [IsRH]
    throttle_classes = [AILLMUserThrottle]

    def post(self, request) -> Response:
        job_position = request.data.get("job_position", "").strip()
        job_description = request.data.get("job_description", "").strip()
        duration = request.data.get("duration", "30 Min").strip()
        interview_type = request.data.get("interview_type", "Technique").strip()

        if not job_position or not job_description:
            return Response(
                {"detail": "Les champs 'job_position' et 'job_description' sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prompt = _QUESTIONS_PROMPT.format(
            job_position=sanitize_free_text(job_position, max_length=200),
            job_description=sanitize_free_text(job_description, max_length=6000),
            duration=duration,
            interview_type=interview_type,
        )

        try:
            provider = get_llm_provider()
            raw = provider.extract_json(prompt)
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()
            data = json.loads(raw)
            return Response(data, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Erreur génération questions entretien")
            return Response(
                {"detail": "Erreur lors de la génération des questions. Réessayez."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GenerateInterviewFeedbackView(APIView):
    """
    POST /api/v1/ai/interview/feedback/
    Body: { conversation: [{"role": "assistant"|"candidate", "content": str}, ...] }
    Génère un feedback structuré via le LLM actif. Réservé RH/Admin (auto-test
    d'entretien depuis `/recruteur-ia`).

    Durci au même niveau que son équivalent candidat public
    (`InterviewSessionFeedbackCreateView`) : le contenu de `conversation` reste du
    texte utilisateur atteignant un prompt LLM, quel que soit le rôle qui l'envoie.
    """

    permission_classes = [IsRH]
    throttle_classes = [AILLMUserThrottle]

    def post(self, request) -> Response:
        conversation = request.data.get("conversation", [])

        if not conversation:
            return Response(
                {"detail": "Le champ 'conversation' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_valid, error_message = validate_conversation(conversation)
        if not is_valid:
            return Response({"detail": error_message}, status=status.HTTP_400_BAD_REQUEST)

        sanitized_conversation = [
            {
                "role": msg.get("role", "inconnu"),
                "content": sanitize_conversation_message(str(msg.get("content", ""))),
            }
            for msg in conversation
        ]
        conversation_text = "\n".join(f"{msg['role'].upper()} : {msg['content']}" for msg in sanitized_conversation)

        prompt = _FEEDBACK_PROMPT.format(conversation=conversation_text)

        try:
            provider = get_llm_provider()
            raw = provider.extract_json(prompt)
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()
            data = json.loads(raw)
            return Response(data, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Erreur génération feedback entretien")
            return Response(
                {"detail": "Erreur lors de la génération du feedback. Réessayez."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
