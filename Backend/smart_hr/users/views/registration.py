import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
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


class OTPResendThrottle(AnonRateThrottle):
    """3 renvois d'OTP par heure par IP — endpoint AllowAny, utilisateurs non authentifiés."""

    rate = "3/hour"
    scope = "otp_resend"


class RegistrationThrottle(AnonRateThrottle):
    """5 inscriptions par heure par IP."""

    rate = "5/hour"
    scope = "registration"


logger = logging.getLogger(__name__)

# Message unique renvoyé que le compte existe ou non : sans cela, la réponse
# permettait d'énumérer les emails déjà inscrits sur la plateforme.
ACCOUNT_CREATION_NEUTRAL_MESSAGE = "Si cette adresse peut être utilisée, un code de vérification vient d'y être envoyé."
OTP_INVALID_NEUTRAL_MESSAGE = "Code de vérification invalide ou expiré."


class CandidateRegisterView(APIView):
    """
    Inscription d'un nouveau candidat.
    Crée le compte avec role=CANDIDATE et envoie un OTP de vérification par email.
    """

    permission_classes = [AllowAny]
    throttle_classes = [RegistrationThrottle]

    def post(self, request):
        """Crée un compte candidat et déclenche l'envoi du code OTP.

        Si un compte existe déjà pour cet email, aucune donnée existante n'est
        modifiée : on se contente de renvoyer un OTP au propriétaire légitime
        (compte non vérifié) et une réponse neutre dans tous les cas.
        """
        email = request.data.get("email", "").strip().lower()
        existing_user = User.objects.filter(email__iexact=email).first()

        if existing_user:
            # Ne JAMAIS écraser les identifiants d'un compte existant depuis une
            # requête anonyme : un tiers pouvait ainsi imposer son mot de passe à
            # une inscription en attente, puis laisser la victime valider l'OTP
            # et lui livrer le compte. On renvoie seulement un nouveau code au
            # propriétaire de la boîte mail.
            if not existing_user.is_email_verified:
                _otp, raw_otp_code = create_otp_for_user(existing_user)
                try:
                    send_otp_verification_email(
                        recipient_email=existing_user.email,
                        first_name=existing_user.first_name or "",
                        otp_code=raw_otp_code,
                    )
                except Exception:
                    logger.exception(
                        "Échec renvoi OTP pour compte non vérifié %s",
                        existing_user.email,
                    )
            else:
                logger.info(
                    "Tentative d'inscription sur un email déjà vérifié : %s",
                    existing_user.email,
                )
            # Réponse identique au cas nominal : aucune fuite sur l'existence
            # ni sur l'état de vérification du compte.
            return Response(
                {"detail": ACCOUNT_CREATION_NEUTRAL_MESSAGE, "email": email},
                status=status.HTTP_201_CREATED,
            )

        serializer = UserRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save(role=User.Role.CANDIDATE)

        _otp, raw_otp_code = create_otp_for_user(user)
        try:
            send_otp_verification_email(
                recipient_email=user.email,
                first_name=user.first_name or "",
                otp_code=raw_otp_code,
            )
        except Exception:
            logger.exception(
                "Échec envoi OTP lors de l'inscription du candidat %s",
                user.email,
            )

        return Response(
            {"detail": ACCOUNT_CREATION_NEUTRAL_MESSAGE, "email": user.email},
            status=status.HTTP_201_CREATED,
        )


class VerifyOTPView(APIView):
    """
    Vérifie le code OTP soumis par le candidat SANS nécessiter d'être connecté.

    Flux correct :
      1. POST /register/candidate/  → compte créé, OTP envoyé par email
      2. POST /verify-otp/          → { email, code } → email vérifié
      3. POST /auth/login/          → connexion autorisée (is_email_verified=True)
    """

    permission_classes = [AllowAny]
    throttle_classes = [OTPVerifyThrottle]

    def post(self, request):
        """Valide le code OTP pour l'email fourni dans le corps de la requête."""
        email = request.data.get("email", "").strip().lower()
        code = request.data.get("code", "").strip()

        if not email or not code:
            return Response(
                {"detail": "Les champs 'email' et 'code' sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # .filter().first() et non .get() : tant qu'un doublon d'email subsiste
        # en base, .get() lèverait MultipleObjectsReturned (500) et rendrait la
        # vérification impossible pour les deux comptes concernés.
        user = User.objects.filter(email__iexact=email).order_by("date_joined").first()
        if user is None:
            # Réponse identique à un code erroné : pas de fuite d'existence.
            return Response(
                {"detail": OTP_INVALID_NEUTRAL_MESSAGE},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.is_email_verified:
            # Même réponse qu'un code erroné : révéler qu'un email est déjà
            # vérifié revient à confirmer qu'un compte existe derrière.
            return Response(
                {"detail": OTP_INVALID_NEUTRAL_MESSAGE},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_valid, error_message = verify_otp_for_user(user, code)
        if not is_valid:
            return Response(
                {"detail": error_message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Email vérifié avec succès. Vous pouvez maintenant vous connecter."},
            status=status.HTTP_200_OK,
        )


class ResendOTPView(APIView):
    """
    Renvoie un nouveau code OTP SANS nécessiter d'être connecté.
    Accessible avec uniquement l'email (candidat non encore vérifié).
    """

    permission_classes = [AllowAny]
    throttle_classes = [OTPResendThrottle]

    def post(self, request):
        """Génère et renvoie un nouveau code OTP pour l'email fourni."""
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response(
                {"detail": "Le champ 'email' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).order_by("date_joined").first()
        if user is None or user.is_email_verified:
            # Réponse neutre pour ne pas confirmer l'existence du compte
            # ni son état de vérification.
            return Response(
                {"detail": "Si cet email existe, un nouveau code a été envoyé."},
            )

        _otp, raw_otp_code = create_otp_for_user(user)
        try:
            send_otp_verification_email(
                recipient_email=user.email,
                first_name=user.first_name or "",
                otp_code=raw_otp_code,
            )
        except Exception:
            logger.exception("Échec renvoi OTP pour %s", user.email)
            return Response(
                {"detail": "Erreur lors de l'envoi de l'email. Réessayez plus tard."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": "Un nouveau code a été envoyé à votre adresse email."},
        )
