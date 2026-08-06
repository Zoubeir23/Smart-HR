from __future__ import annotations

import typing

from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings

from smart_hr.users.models import User

if typing.TYPE_CHECKING:
    from allauth.socialaccount.models import SocialLogin
    from django.http import HttpRequest


class AccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request: HttpRequest) -> bool:
        return getattr(settings, "ACCOUNT_ALLOW_REGISTRATION", True)


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    def is_open_for_signup(
        self,
        request: HttpRequest,
        sociallogin: SocialLogin,
    ) -> bool:
        # Volontairement découplé de ACCOUNT_ALLOW_REGISTRATION : l'inscription
        # libre par formulaire est fermée (un anonyme pouvait s'auto-attribuer
        # le rôle EMPLOYEE), mais Google a déjà vérifié la propriété de
        # l'adresse email — c'est une garantie qu'un simple formulaire n'offre
        # pas. Seul Google est configuré (SOCIALACCOUNT_PROVIDERS), donc ce
        # chemin ne crée en pratique que des comptes CANDIDATE (voir
        # populate_user ci-dessous), jamais de compte interne.
        return True

    def populate_user(
        self,
        request: HttpRequest,
        sociallogin: SocialLogin,
        data: dict[str, typing.Any],
    ) -> User:
        """
        Populates user information from social provider info.

        See: https://docs.allauth.org/en/latest/socialaccount/advanced.html#creating-and-populating-user-instances
        """
        user = super().populate_user(request, sociallogin, data)
        # Le modèle User de Smart-HR n'a pas de champ `name` : il hérite de
        # first_name / last_name (AbstractUser). L'ancien code levait donc une
        # AttributeError dès qu'un profil social devait être renseigné.
        if not user.first_name and not user.last_name:
            first_name = data.get("first_name") or ""
            last_name = data.get("last_name") or ""
            if not first_name and not last_name and (full_name := data.get("name")):
                first_name, _, last_name = full_name.partition(" ")
            user.first_name = first_name
            user.last_name = last_name

        # populate_user n'est appelé par allauth que pour un COMPTE INEXISTANT
        # (une connexion qui correspond à un compte existant se connecte
        # directement, sans repasser ici) : c'est donc systématiquement une
        # nouvelle inscription candidat, jamais un compte interne. Google a
        # déjà vérifié l'adresse email, l'OTP n'a donc pas lieu d'être.
        user.role = User.Role.CANDIDATE
        user.is_email_verified = True
        return user
