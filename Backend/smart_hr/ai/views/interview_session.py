from __future__ import annotations

import json
import logging

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.ai.llm_providers import get_llm_provider
from smart_hr.ai.models import InterviewSession, InterviewSessionFeedback

logger = logging.getLogger(__name__)

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


class InterviewSessionCreateView(APIView):
    """POST /api/v1/ai/interview/sessions/create/ — RH crée une session (authentifié)"""

    permission_classes = [IsAuthenticated]

    def post(self, request) -> Response:
        job_position = request.data.get("job_position", "").strip()
        job_description = request.data.get("job_description", "").strip()
        duration = request.data.get("duration", "30 Min").strip()
        interview_type = request.data.get("interview_type", "Technique").strip()
        questions = request.data.get("questions", [])

        if not job_position or not questions:
            return Response(
                {"detail": "Les champs 'job_position' et 'questions' sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session = InterviewSession.objects.create(
            job_position=job_position,
            job_description=job_description,
            duration=duration,
            interview_type=interview_type,
            questions=questions,
            created_by=request.user,
        )

        return Response(
            {
                "token": str(session.token),
                "job_position": session.job_position,
                "duration": session.duration,
                "interview_type": session.interview_type,
                "questions_count": len(questions),
                "created_at": session.created_at,
            },
            status=status.HTTP_201_CREATED,
        )


class InterviewSessionDetailView(APIView):
    """GET /api/v1/ai/interview/sessions/{token}/ — Public, candidat récupère les détails"""

    permission_classes = [AllowAny]

    def get(self, request, token) -> Response:
        try:
            session = InterviewSession.objects.get(
                token=token,
                status=InterviewSession.Status.ACTIVE,
            )
        except InterviewSession.DoesNotExist:
            return Response(
                {"detail": "Lien d'entretien invalide ou expiré."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "token": str(session.token),
                "job_position": session.job_position,
                "job_description": session.job_description,
                "duration": session.duration,
                "interview_type": session.interview_type,
                "questions": session.questions,
            }
        )


class InterviewSessionFeedbackCreateView(APIView):
    """POST /api/v1/ai/interview/sessions/{token}/feedback/ — Public, candidat soumet le feedback"""

    permission_classes = [AllowAny]

    def post(self, request, token) -> Response:
        try:
            session = InterviewSession.objects.get(token=token)
        except InterviewSession.DoesNotExist:
            return Response(
                {"detail": "Session introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        candidate_name = request.data.get("candidate_name", "").strip()
        candidate_email = request.data.get("candidate_email", "").strip()
        conversation = request.data.get("conversation", [])

        if not candidate_name or not conversation:
            return Response(
                {"detail": "Les champs 'candidate_name' et 'conversation' sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        feedback_data: dict = {}
        recommended = False

        try:
            conversation_text = "\n".join(
                f"{msg.get('role', 'inconnu').upper()} : {msg.get('content', '')}"
                for msg in conversation
            )
            prompt = _FEEDBACK_PROMPT.format(conversation=conversation_text)
            provider = get_llm_provider()
            raw = provider.extract_json(prompt).strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()
            parsed = json.loads(raw)
            feedback_data = parsed.get("feedback", parsed)
            recommended = bool(feedback_data.get("recommendation", False))
        except Exception:
            logger.exception("Erreur génération feedback session entretien token=%s", token)

        record = InterviewSessionFeedback.objects.create(
            session=session,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            conversation=conversation,
            feedback=feedback_data,
            recommended=recommended,
        )

        return Response(
            {
                "id": record.id,
                "feedback": feedback_data,
                "recommended": recommended,
            },
            status=status.HTTP_201_CREATED,
        )


class InterviewSessionListView(APIView):
    """GET /api/v1/ai/interview/sessions/ — RH liste ses sessions (authentifié)"""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        sessions = (
            InterviewSession.objects.filter(created_by=request.user)
            .prefetch_related("feedbacks")
        )
        data = [
            {
                "token": str(session.token),
                "job_position": session.job_position,
                "duration": session.duration,
                "interview_type": session.interview_type,
                "status": session.status,
                "feedbacks_count": session.feedbacks.count(),
                "created_at": session.created_at,
            }
            for session in sessions
        ]
        return Response(data)
