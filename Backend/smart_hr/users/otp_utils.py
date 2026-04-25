import random

from django.utils import timezone

from smart_hr.users.models import OTPCode
from smart_hr.users.models import User


def generate_otp_code() -> str:
    return str(random.randint(100000, 999999))


def create_otp_for_user(user: User) -> OTPCode:
    """Crée (ou remplace) un OTP actif pour l'utilisateur donné."""
    expiry_date = timezone.now() + timezone.timedelta(
        minutes=OTPCode.OTP_EXPIRY_MINUTES
    )
    otp_code, _ = OTPCode.objects.update_or_create(
        user=user,
        defaults={
            "code": generate_otp_code(),
            "expiry_date": expiry_date,
            "is_used": False,
        },
    )
    return otp_code


def verify_otp_for_user(user: User, submitted_code: str) -> tuple[bool, str]:
    """
    Vérifie un code OTP soumis.
    Retourne (True, "") si valide, (False, raison) sinon.
    """
    try:
        otp = OTPCode.objects.get(user=user)
    except OTPCode.DoesNotExist:
        return False, "Aucun code OTP trouvé pour cet utilisateur."

    if otp.is_used:
        return False, "Ce code OTP a déjà été utilisé."

    if otp.is_expired:
        return False, "Ce code OTP a expiré. Veuillez en demander un nouveau."

    if otp.code != submitted_code:
        return False, "Code OTP incorrect."

    otp.is_used = True
    otp.save(update_fields=["is_used"])
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified"])

    return True, ""
