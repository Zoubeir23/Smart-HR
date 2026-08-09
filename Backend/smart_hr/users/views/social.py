"""Connexion SSO Google pour le frontend React.

Le frontend envoie un **code d'autorisation** (`code`), obtenu via la popup
Google. Le backend l'échange lui-même contre les jetons, avec le client_secret :
l'identité obtenue est donc nécessairement liée à notre application.

Un `id_token` reste accepté pour compatibilité (ancien bouton Google Identity
Services) : il est alors présenté comme jeton porteur, l'adapter allauth en
vérifiant la signature, l'émetteur et l'audience avant toute connexion.
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


# dj-rest-auth renvoie ses erreurs en anglais et sans contexte. Traduites ici,
# car elles remontent telles quelles jusqu'à l'utilisateur.
GOOGLE_ERROR_TRANSLATIONS = {
    "Failed to exchange code for access token": ("Google a refusé la connexion (code expiré ou déjà utilisé). Réessayez."),
    "Incorrect value": "Réponse Google inattendue. Réessayez de vous connecter.",
    "User is already registered with this e-mail address.": ("Un compte existe déjà avec cette adresse email."),
}


class GoogleIdTokenLoginSerializer(SocialLoginSerializer):
    """Accepte un `code` d'autorisation ou, à défaut, un `id_token` seul.

    Le flux nominal est le code : le backend l'échange côté serveur. L'`id_token`
    est présenté comme jeton porteur, l'adapter Google le décodant et vérifiant
    sa signature plutôt que d'appeler l'endpoint userinfo.
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
        except serializers.ValidationError as exc:
            logger.warning("Connexion Google refusée : %s", exc.detail)
            raise serializers.ValidationError(self._translate(exc.detail)) from exc

    @staticmethod
    def _translate(detail):
        """Remplace les messages connus de dj-rest-auth par leur version française."""
        messages = detail if isinstance(detail, list) else [detail]
        return [GOOGLE_ERROR_TRANSLATIONS.get(str(message), str(message)) for message in messages]


class GoogleLoginView(SocialLoginView):
    """POST /api/v1/auth/google/ — { "code": "<code d'autorisation Google>" }"""

    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client
    serializer_class = GoogleIdTokenLoginSerializer
    throttle_classes = [LoginRateThrottle]

    # Le frontend utilise le flux « code d'autorisation » de Google en popup
    # (`useGoogleLogin({ flow: 'auth-code' })`). Dans ce mode, le code est émis
    # pour la redirection spéciale `postmessage` — Google le renvoie à la page
    # appelante par message plutôt que par une redirection HTTP. C'est cette
    # valeur exacte que le backend doit présenter lors de l'échange du code,
    # sinon Google refuse l'échange (redirect_uri_mismatch).
    #
    # L'échange est fait côté serveur avec le client_secret : le jeton reste
    # lié à notre application. C'est ce qui rend ce flux plus sûr qu'un simple
    # access_token transmis par le navigateur, qui pourrait provenir d'une
    # autre application et permettre une usurpation.
    callback_url = "postmessage"
