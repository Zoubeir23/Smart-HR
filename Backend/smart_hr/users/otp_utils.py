import hashlib
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from smart_hr.users.models import OTPCode
from smart_hr.users.models import User

LOCKOUT_DURATION_MINUTES = 15


def generate_otp_code() -> str:
    return str(secrets.randbelow(900000) + 100000)


def _hash_otp_code(raw_code: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode(),
        raw_code.encode(),
        hashlib.sha256,
    ).hexdigest()


def _verify_otp_hash(raw_code: str, stored_hash: str) -> bool:
    return hmac.compare_digest(stored_hash, _hash_otp_code(raw_code))


def create_otp_for_user(user: User) -> tuple[OTPCode, str]:
    """Crée (ou remplace) un OTP actif. Retourne (otp_code, raw_code) — raw_code à envoyer par email."""
    expiry_date = timezone.now() + timedelta(
        minutes=OTPCode.OTP_EXPIRY_MINUTES,
    )
    raw_code = generate_otp_code()
    otp_code, _ = OTPCode.objects.update_or_create(
        user=user,
        defaults={
            "code": _hash_otp_code(raw_code),
            "expiry_date": expiry_date,
            "is_used": False,
            "failed_attempts": 0,
            "locked_until": None,
        },
    )
    return otp_code, raw_code


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

    if otp.locked_until is not None:
        # Le verrou vient d'expirer : sans cette remise à zéro, le compteur
        # restait à son maximum et la première erreur suivante reverrouillait
        # immédiatement le compte pour 15 minutes.
        OTPCode.objects.filter(pk=otp.pk).update(failed_attempts=0, locked_until=None)
        otp.refresh_from_db()

    if otp.is_used:
        return False, "Ce code OTP a déjà été utilisé."

    if otp.is_expired:
        return False, "Ce code OTP a expiré. Veuillez en demander un nouveau."

    if not _verify_otp_hash(submitted_code, otp.code):
        OTPCode.objects.filter(pk=otp.pk).update(
            failed_attempts=F("failed_attempts") + 1,
        )
        otp.refresh_from_db()
        if otp.failed_attempts >= OTPCode.MAX_FAILED_ATTEMPTS:
            OTPCode.objects.filter(pk=otp.pk).update(
                locked_until=timezone.now() + timedelta(minutes=LOCKOUT_DURATION_MINUTES),
            )
            return (
                False,
                "Compte verrouillé après trop de tentatives. Réessayez dans 15 minutes.",
            )
        remaining = OTPCode.MAX_FAILED_ATTEMPTS - otp.failed_attempts
        return False, f"Code OTP incorrect. {remaining} tentative(s) restante(s)."

    with transaction.atomic():
        otp.is_used = True
        otp.save(update_fields=["is_used"])
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])

    return True, ""
