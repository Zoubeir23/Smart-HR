from __future__ import annotations

import json
import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.ai.llm_providers import get_llm_provider

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
    Génère une liste de questions d'entretien via le LLM actif.
    """

    permission_classes = [IsAuthenticated]

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
            job_position=job_position,
            job_description=job_description,
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
    Génère un feedback structuré via le LLM actif.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request) -> Response:
        conversation = request.data.get("conversation", [])

        if not conversation:
            return Response(
                {"detail": "Le champ 'conversation' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversation_text = "\n".join(
            f"{msg.get('role', 'inconnu').upper()} : {msg.get('content', '')}"
            for msg in conversation
        )

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
