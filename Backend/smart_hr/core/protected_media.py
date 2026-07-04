from pathlib import Path

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.http import FileResponse
from django.http import Http404
from django.views import View
from rest_framework_simplejwt.authentication import JWTAuthentication

# Préfixes de média soumis à un contrôle de propriété strict.
_CV_PREFIX = "cvs/"
_DOCUMENT_PREFIX = "documents/"
_RECRUITMENT_DOCUMENT_PREFIX = "recruitment_documents/"
_SENSITIVE_PREFIXES = (_CV_PREFIX, _DOCUMENT_PREFIX, _RECRUITMENT_DOCUMENT_PREFIX)
_PRIVILEGED_ROLES = ("ADMIN", "RH")


class ProtectedMediaView(View):
    """
    Sert les fichiers media aux utilisateurs autorisés.

    Trois niveaux de protection :
    1. Path traversal : le chemin résolu doit rester sous MEDIA_ROOT.
    2. Contrôle d'accès objet : un employé/candidat ne peut télécharger que
       ses propres documents (contrats, fiches, pièces de candidature) et son
       propre CV. RH/Admin accèdent à tout. Les autres médias (photos, audio)
       restent accessibles à tout utilisateur authentifié.
    3. Les fichiers sensibles sont servis en pièce jointe (Content-Disposition:
       attachment) pour empêcher l'exécution de contenu actif dans le navigateur.

    Authentification via JWT (header Authorization: Bearer <token>).
    """

    def get(self, request, path):
        user = self._resolve_user(request)
        if not user or not user.is_authenticated:
            raise PermissionDenied(
                "Authentification requise pour accéder aux fichiers.",
            )

        if not self._is_authorized(user, path):
            raise PermissionDenied(
                "Vous n'êtes pas autorisé à accéder à ce fichier.",
            )

        full_path = self._safe_path(path)
        if not full_path.is_file():
            raise Http404

        return FileResponse(
            full_path.open("rb"),
            as_attachment=path.startswith(_SENSITIVE_PREFIXES),
        )

    @staticmethod
    def _resolve_user(request):
        if request.user and request.user.is_authenticated:
            return request.user
        try:
            result = JWTAuthentication().authenticate(request)
            return result[0] if result else None
        except Exception:
            return None

    @staticmethod
    def _is_authorized(user, path: str) -> bool:
        """Vérifie que l'utilisateur a le droit de télécharger ce fichier précis."""
        if getattr(user, "role", None) in _PRIVILEGED_ROLES:
            return True

        if path.startswith(_CV_PREFIX):
            from smart_hr.recruitment.models import Application

            return Application.objects.filter(cv=path, candidate=user).exists()

        if path.startswith(_DOCUMENT_PREFIX):
            from smart_hr.document.models import Document

            return Document.objects.filter(file=path, employee__user=user).exists()

        if path.startswith(_RECRUITMENT_DOCUMENT_PREFIX):
            from smart_hr.recruitment.models import ApplicationDocument

            return ApplicationDocument.objects.filter(
                file=path,
                application__candidate=user,
            ).exists()

        # Médias non sensibles (photos de profil, audio) : utilisateur authentifié suffit.
        return True

    @staticmethod
    def _safe_path(path: str) -> Path:
        media_root = Path(settings.MEDIA_ROOT).resolve()
        full = (media_root / path).resolve()
        if not str(full).startswith(str(media_root) + "/"):
            raise Http404
        return full
