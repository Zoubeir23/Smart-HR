import io
import logging
import uuid

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.ai.context_builder import build_system_prompt
from smart_hr.ai.llm_providers import get_llm_provider
from smart_hr.core.throttles import AILLMUserThrottle

logger = logging.getLogger(__name__)

_VOICE_FORMAT_INSTRUCTIONS = (
    "\n\nFORMAT VOCAL : limite ta réponse à 3-4 phrases maximum, sans listes ni markdown, pour une lecture audio fluide."
)

HR_FAQ = {
    "congé": (
        "Pour poser une demande de congé, rendez-vous dans la section 'Congés' "
        "de votre espace personnel. Remplissez le formulaire avec les dates et le motif, "
        "puis soumettez votre demande. Votre responsable RH recevra une notification "
        "et vous informera de la décision par email."
    ),
    "salaire": (
        "Vos fiches de paie sont disponibles dans la section 'Paie' de votre espace. "
        "Elles sont générées chaque mois et archivées. Pour toute question sur votre "
        "rémunération, contactez le service RH."
    ),
    "recrutement": (
        "Notre processus de recrutement comprend : soumission du CV, analyse automatique "
        "par notre IA, entretien téléphonique, puis entretien technique. "
        "Le délai moyen est de 2 à 3 semaines. Vous pouvez suivre votre candidature "
        "dans votre espace candidat."
    ),
    "entretien": (
        "Pour préparer votre entretien technique : révisez les fondamentaux de votre "
        "domaine, préparez des exemples concrets de projets réalisés, et renseignez-vous "
        "sur notre entreprise. L'entretien dure environ 1h30 et comprend des questions "
        "techniques et comportementales."
    ),
    "avantages": (
        "Smart-HR offre : congés payés, mutuelle santé, tickets restaurant, "
        "formation continue, télétravail partiel, et un environnement de travail moderne. "
        "Pour plus de détails, consultez votre contrat ou contactez le service RH."
    ),
    "formation": (
        "Les formations sont accessibles dans la section 'Formations' de votre espace. "
        "Vous pouvez voir les formations planifiées et y participer. "
        "Pour proposer une formation, contactez votre responsable RH."
    ),
    "présence": (
        "Le suivi des présences est géré automatiquement. En cas d'absence, "
        "prévenez votre responsable dès que possible et soumettez un justificatif "
        "dans la section 'Présences' de votre espace."
    ),
}

_GTTS_LANG_MAP = {
    "nova": "fr",
    "alloy": "fr",
    "echo": "fr",
}


def _generate_voice_response(question: str, user) -> str:
    """Génère une réponse RH via le LLM configuré, avec le même contexte
    RBAC/données réelles que le chat texte (smart_hr.ai.context_builder).
    Fallback sur la FAQ statique si le fournisseur LLM est indisponible.
    """
    try:
        provider = get_llm_provider()
        system_prompt = build_system_prompt(user) + _VOICE_FORMAT_INSTRUCTIONS
        return provider.generate_response(system_prompt, [], question)
    except Exception as exc:
        logger.error("Erreur LLM provider pour voice agent : %s", exc)

    question_lower = question.lower()
    for keyword, answer in HR_FAQ.items():
        if keyword in question_lower:
            return answer

    return (
        "Merci pour votre question. Notre assistant vocal peut vous aider sur "
        "les congés, la paie, le recrutement, les formations et les avantages. "
        "N'hésitez pas à reformuler ou à contacter directement le service RH."
    )


def _generate_audio_file(text: str, voice: str) -> str | None:
    """Génère un fichier MP3 via gTTS et le persiste via default_storage (local ou S3/MinIO).

    Retourne le chemin de stockage relatif, ou None si gTTS échoue.
    """
    try:
        from gtts import gTTS

        lang = _GTTS_LANG_MAP.get(voice, "fr")
        buffer = io.BytesIO()
        tts = gTTS(text=text, lang=lang)
        tts.write_to_fp(buffer)
        buffer.seek(0)

        storage_path = f"audio/voice_{uuid.uuid4().hex}.mp3"
        return default_storage.save(storage_path, ContentFile(buffer.read()))
    except Exception as exc:
        logger.warning("gTTS indisponible, audio_url sera None : %s", exc)
        return None


class VoiceAskView(APIView):
    """
    POST /api/v1/agents/voice/ask/
    Body: { "question": "...", "voice": "nova|alloy|echo" }
    Retourne une réponse RH textuelle + URL audio MP3 si gTTS disponible.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [AILLMUserThrottle]

    def post(self, request):
        """Valide la question, génère la réponse textuelle et l'audio TTS."""
        question = request.data.get("question", "").strip()
        voice = request.data.get("voice", "nova")

        if not question:
            return Response(
                {"detail": "Le champ 'question' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if voice not in ("nova", "alloy", "echo"):
            voice = "nova"

        text_response = _generate_voice_response(question, request.user)
        audio_relative_path = _generate_audio_file(text_response, voice)

        audio_url = None
        if audio_relative_path:
            audio_url = default_storage.url(audio_relative_path)

        return Response(
            {
                "text_response": text_response,
                "audio_url": audio_url,
                "sources": ["Smart-HR FAQ RH"],
                "mode": "tts" if audio_url else "text_only",
                "voice": voice,
            },
        )
