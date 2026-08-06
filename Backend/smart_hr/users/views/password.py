"""Vues mot de passe throttlées.

Les vues dj-rest-auth d'origine n'ont aucun throttle dédié : elles retombent sur
le quota anonyme global (100 req/h/IP), ce qui autorise le bombardement de la
boîte mail d'une victime via /password/reset/. Ces sous-classes ne changent que
la limitation de débit, la logique métier reste celle de dj-rest-auth.
"""

from dj_rest_auth.views import PasswordChangeView
from dj_rest_auth.views import PasswordResetConfirmView
from dj_rest_auth.views import PasswordResetView
from rest_framework.throttling import AnonRateThrottle
from rest_framework.throttling import UserRateThrottle


class PasswordResetThrottle(AnonRateThrottle):
    """3 demandes de réinitialisation par heure et par IP."""

    scope = "password_reset"


class PasswordChangeThrottle(UserRateThrottle):
    """5 changements de mot de passe par heure et par utilisateur."""

    scope = "password_change"


class ThrottledPasswordResetView(PasswordResetView):
    """POST /api/v1/auth/password/reset/ — envoi du lien de réinitialisation."""

    throttle_classes = [PasswordResetThrottle]


class ThrottledPasswordResetConfirmView(PasswordResetConfirmView):
    """POST /api/v1/auth/password/reset/confirm/ — validation du nouveau mot de passe."""

    throttle_classes = [PasswordResetThrottle]


class ThrottledPasswordChangeView(PasswordChangeView):
    """POST /api/v1/auth/password/change/ — changement depuis l'espace connecté."""

    throttle_classes = [PasswordChangeThrottle]
