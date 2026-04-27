import uuid as uuid_lib

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import CharField
from django.urls import reverse
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """
    Custom user model for Smart-HR with role-based access control.
    Uses email as the primary identifier alongside username.
    """

    class Role(models.TextChoices):
        ADMIN = "ADMIN", _("Admin Système")
        RH = "RH", _("Responsable RH")
        EMPLOYEE = "EMPLOYEE", _("Employé")
        CANDIDATE = "CANDIDATE", _("Candidat")

    role = CharField(
        _("Rôle"),
        max_length=20,
        choices=Role.choices,
        default=Role.EMPLOYEE,
    )
    tel = CharField(_("Téléphone"), max_length=20, blank=True)
    is_email_verified = models.BooleanField(_("Email vérifié"), default=False)

    # first_name and last_name are inherited from AbstractUser (not overridden)

    def get_absolute_url(self) -> str:
        return reverse("users:detail", kwargs={"username": self.username})


class OTPCode(models.Model):
    """Code OTP à usage unique pour la vérification d'email (candidats)."""

    OTP_EXPIRY_MINUTES = 10

    MAX_FAILED_ATTEMPTS = 5

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="otp_code")
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    failed_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Code OTP"
        verbose_name_plural = "Codes OTP"

    def __str__(self) -> str:
        return f"OTP({self.user.email}) — {'utilisé' if self.is_used else 'actif'}"

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expiry_date

    @property
    def is_locked(self) -> bool:
        return self.locked_until is not None and timezone.now() < self.locked_until
