import secrets

from django.db.models import F
from django.utils import timezone

from smart_hr.users.models import OTPCode
from smart_hr.users.models import User

LOCKOUT_DURATION_MINUTES = 15


def generate_otp_code() -> str:
    return str(secrets.randbelow(900000) + 100000)


def create_otp_for_user(user: User) -> OTPCode:
    """Crée (ou remplace) un OTP actif pour l'utilisateur donné. Réinitialise le compteur d'échecs."""
    expiry_date = timezone.now() + timezone.timedelta(
        minutes=OTPCode.OTP_EXPIRY_MINUTES,
    )
    otp_code, _ = OTPCode.objects.update_or_create(
        user=user,
        defaults={
            "code": generate_otp_code(),
            "expiry_date": expiry_date,
            "is_used": False,
            "failed_attempts": 0,
            "locked_until": None,
        },
    )
    return otp_code


def verify_otp_for_user(user: User, submitted_code: str) -> tuple[bool, str]:  # noqa: PLR0911
    """
    Vérifie un code OTP soumis avec protection brute-force.
    Retourne (True, "") si valide, (False, raison) sinon.
    """
    try:
        otp = OTPCode.objects.get(user=user)
    except OTPCode.DoesNotExist:
        return False, "Aucun code OTP trouvé pour cet utilisateur."

    if otp.is_locked:
        return False, "Trop de tentatives incorrectes. Réessayez dans 15 minutes."

    if otp.is_used:
        return False, "Ce code OTP a déjà été utilisé."

    if otp.is_expired:
        return False, "Ce code OTP a expiré. Veuillez en demander un nouveau."

    if otp.code != submitted_code:
        OTPCode.objects.filter(pk=otp.pk).update(
            failed_attempts=F("failed_attempts") + 1,
        )
        otp.refresh_from_db()
        if otp.failed_attempts >= OTPCode.MAX_FAILED_ATTEMPTS:
            OTPCode.objects.filter(pk=otp.pk).update(
                locked_until=timezone.now() + timezone.timedelta(minutes=LOCKOUT_DURATION_MINUTES),
            )
            return (
                False,
                "Compte verrouillé après trop de tentatives. Réessayez dans 15 minutes.",
            )
        remaining = OTPCode.MAX_FAILED_ATTEMPTS - otp.failed_attempts
        return False, f"Code OTP incorrect. {remaining} tentative(s) restante(s)."

    otp.is_used = True
    otp.save(update_fields=["is_used"])
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified"])

    return True, ""
