from pathlib import Path

from django.conf import settings
from django.http import FileResponse
from django.http import Http404
from django.views import View
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


class ProtectedMediaView(View):
    """
    Sert les fichiers media uniquement aux utilisateurs authentifiés.
    Protège contre le path traversal.
    Authentification via JWT (header Authorization: Bearer <token>).
    """

    def get(self, request, path):
        user = self._resolve_user(request)
        if not user or not user.is_authenticated:
            raise PermissionDenied(
                "Authentification requise pour accéder aux fichiers.",
            )

        full_path = self._safe_path(path)
        if not full_path.is_file():
            raise Http404

        return FileResponse(full_path.open("rb"))

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
    def _safe_path(path: str) -> Path:
        media_root = Path(settings.MEDIA_ROOT).resolve()
        full = (media_root / path).resolve()
        if not str(full).startswith(str(media_root) + "/"):
            raise Http404
        return full
