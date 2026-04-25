import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from smart_hr.core.email_service import send_otp_verification_email
from smart_hr.users.models import User
from smart_hr.users.otp_utils import create_otp_for_user
from smart_hr.users.otp_utils import verify_otp_for_user
from smart_hr.users.serializers import UserRegisterSerializer


class OTPVerifyThrottle(UserRateThrottle):
    """10 tentatives de vérification OTP par heure par utilisateur."""
    rate = "10/hour"
    scope = "otp_verify"


class OTPResendThrottle(UserRateThrottle):
    """3 renvois d'OTP par heure par utilisateur."""
    rate = "3/hour"
    scope = "otp_resend"


class RegistrationThrottle(AnonRateThrottle):
    """5 inscriptions par heure par IP."""
    rate = "5/hour"
    scope = "registration"

logger = logging.getLogger(__name__)


class CandidateRegisterView(APIView):
    """
    Inscription d'un nouveau candidat.
    Crée le compte avec role=CANDIDATE et envoie un OTP de vérification par email.
    """

    permission_classes = [AllowAny]
    throttle_classes = [RegistrationThrottle]

    def post(self, request):
        """Crée un compte candidat et déclenche l'envoi du code OTP."""
        data = {**request.data, "role": User.Role.CANDIDATE}
        serializer = UserRegisterSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()

        otp = create_otp_for_user(user)
        try:
            send_otp_verification_email(
                recipient_email=user.email,
                first_name=user.first_name or "",
                otp_code=otp.code,
            )
        except Exception:
            logger.exception(
                "Échec envoi OTP lors de l'inscription du candidat %s", user.email
            )

        return Response(
            {
                "detail": "Compte créé. Un code de vérification a été envoyé à votre adresse email.",
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyOTPView(APIView):
    """
    Vérifie le code OTP soumis par le candidat.
    Marque is_email_verified=True si le code est valide.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [OTPVerifyThrottle]

    def post(self, request):
        """Valide le code OTP soumis par l'utilisateur connecté."""
        code = request.data.get("code", "").strip()
        if not code:
            return Response(
                {"detail": "Le champ 'code' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_valid, error_message = verify_otp_for_user(request.user, code)
        if not is_valid:
            return Response(
                {"detail": error_message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"detail": "Email vérifié avec succès."})


class ResendOTPView(APIView):
    """
    Renvoie un nouveau code OTP à l'utilisateur connecté (si email non encore vérifié).
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [OTPResendThrottle]

    def post(self, request):
        """Génère et renvoie un nouveau code OTP si l'email n'est pas vérifié."""
        user = request.user
        if user.is_email_verified:
            return Response(
                {"detail": "Votre email est déjà vérifié."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp = create_otp_for_user(user)
        try:
            send_otp_verification_email(
                recipient_email=user.email,
                first_name=user.first_name or "",
                otp_code=otp.code,
            )
        except Exception:
            logger.exception("Échec renvoi OTP pour %s", user.email)
            return Response(
                {"detail": "Erreur lors de l'envoi de l'email. Réessayez plus tard."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"detail": "Un nouveau code a été envoyé à votre adresse email."})
