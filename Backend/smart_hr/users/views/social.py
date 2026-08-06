"""Connexion SSO Google pour le frontend React.

Le composant `GoogleLogin` (@react-oauth/google) renvoie un `credential`, qui est
un **ID token** JWT signé par Google. Le serializer de dj-rest-auth exige, lui,
un `access_token` ou un `code` : sans cette passerelle, la route /auth/google/
n'existait pas et le bouton Google renvoyait un 404.

La signature de l'ID token, son émetteur et son audience (client_id) sont
vérifiés par l'adapter allauth avant toute création de session.
"""

import logging

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from allauth.socialaccount.providers.oauth2.client import OAuth2Error
from dj_rest_auth.registration.serializers import SocialLoginSerializer
from dj_rest_auth.registration.views import SocialLoginView
from rest_framework import serializers

from smart_hr.core.throttles import LoginRateThrottle

logger = logging.getLogger(__name__)


class GoogleIdTokenLoginSerializer(SocialLoginSerializer):
    """Accepte un `id_token` seul en le présentant comme jeton porteur.

    L'adapter Google privilégie l'`id_token` lorsqu'il est fourni : il le décode
    et en vérifie la signature, plutôt que d'appeler l'endpoint userinfo.
    """

    def validate(self, attrs):
        has_oauth_credentials = attrs.get("access_token") or attrs.get("code")
        if not has_oauth_credentials and attrs.get("id_token"):
            attrs["access_token"] = attrs["id_token"]
        try:
            return super().validate(attrs)
        except OAuth2Error as exc:
            # Jeton illisible, expiré ou émis pour une autre application :
            # c'est une requête invalide, pas une panne du serveur (500).
            logger.warning("Connexion Google refusée : %s", exc)
            message = "Jeton Google invalide ou expiré. Réessayez de vous connecter."
            raise serializers.ValidationError(message) from exc


class GoogleLoginView(SocialLoginView):
    """POST /api/v1/auth/google/ — { "id_token": "<credential Google>" }"""

    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client
    serializer_class = GoogleIdTokenLoginSerializer
    throttle_classes = [LoginRateThrottle]

    @property
    def callback_url(self) -> str:
        from django.conf import settings

        return f"{settings.SITE_URL.rstrip('/')}/login"
