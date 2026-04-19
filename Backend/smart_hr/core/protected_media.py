import os

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
            raise PermissionDenied("Authentification requise pour accéder aux fichiers.")

        full_path = self._safe_path(path)
        if not os.path.isfile(full_path):
            raise Http404

        return FileResponse(open(full_path, "rb"))  # noqa: WPS515

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
    def _safe_path(path: str) -> str:
        media_root = os.path.realpath(settings.MEDIA_ROOT)
        full = os.path.realpath(os.path.join(media_root, path))
        if not full.startswith(media_root + os.sep):
            raise Http404
        return full
