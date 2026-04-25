import logging
import os

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

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


def _generate_voice_response(question: str) -> str:
    """
    Génère une réponse RH via Gemini, avec fallback FAQ local.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

    if api_key:
        try:
            import google.generativeai as genai

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = (
                "Tu es un assistant RH vocal pour Smart-HR. "
                "Réponds de manière concise, claire et bienveillante. "
                "Limite ta réponse à 3-4 phrases maximum pour une écoute confortable. "
                "Sujet : ressources humaines, recrutement, congés, formations, salaires.\n\n"
                f"Question : {question}"
            )
            response = model.generate_content(prompt)
            return response.text
        except Exception as exc:
            logger.error("Erreur Gemini pour voice agent : %s", exc)

    # Fallback : FAQ locale par mots-clés
    question_lower = question.lower()
    for keyword, answer in HR_FAQ.items():
        if keyword in question_lower:
            return answer

    return (
        "Merci pour votre question. Notre assistant vocal peut vous aider sur "
        "les congés, la paie, le recrutement, les formations et les avantages. "
        "N'hésitez pas à reformuler ou à contacter directement le service RH."
    )


class VoiceAskView(APIView):
    """
    POST /api/v1/agents/voice/ask/
    Body: { "question": "...", "voice": "nova|alloy|echo" }
    Retourne une réponse textuelle RH (audio TTS non activé en v1).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get("question", "").strip()
        voice = request.data.get("voice", "nova")

        if not question:
            return Response(
                {"detail": "Le champ 'question' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if voice not in ("nova", "alloy", "echo"):
            voice = "nova"

        text_response = _generate_voice_response(question)

        return Response(
            {
                "text_response": text_response,
                "audio_url": None,
                "sources": ["Smart-HR FAQ RH"],
                "mode": "simulated",
                "voice": voice,
            }
        )
