from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import CharField
from django.urls import reverse
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

    # first_name and last_name are inherited from AbstractUser (not overridden)

    def get_absolute_url(self) -> str:
        """Get URL for user's detail view.

        Returns:
            str: URL for user detail.

        """
        return reverse("users:detail", kwargs={"username": self.username})
