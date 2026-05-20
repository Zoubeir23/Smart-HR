from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.users.models import User
from smart_hr.users.permissions import IsAdmin

logger = logging.getLogger(__name__)

_ALLOWED_ROLES = {User.Role.ADMIN, User.Role.RH, User.Role.EMPLOYEE, User.Role.CANDIDATE}


class AdminUserManagementView(APIView):
    """
    GET  /api/v1/auth/admin/users/           — liste tous les utilisateurs
    PATCH /api/v1/auth/admin/users/{id}/      — modifie role ou is_active
    """

    permission_classes = [IsAdmin]

    def get(self, request) -> Response:
        users = User.objects.order_by("date_joined").values(
            "id",
            "email",
            "first_name",
            "last_name",
            "username",
            "role",
            "is_active",
            "is_email_verified",
            "date_joined",
            "last_login",
        )
        return Response(list(users))

    def patch(self, request, user_id: int) -> Response:
        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        # Empecher l'admin de se desactiver lui-meme
        if target_user.pk == request.user.pk and "is_active" in request.data:
            return Response(
                {"detail": "Vous ne pouvez pas modifier votre propre statut d'activation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated_fields = []

        if "is_active" in request.data:
            target_user.is_active = bool(request.data["is_active"])
            updated_fields.append("is_active")
            logger.info(
                "Admin %s a %s le compte de %s (id=%s)",
                request.user.email,
                "active" if target_user.is_active else "desactive",
                target_user.email,
                target_user.pk,
            )

        if "role" in request.data:
            new_role = request.data["role"]
            if new_role not in _ALLOWED_ROLES:
                return Response(
                    {"detail": f"Role invalide. Valeurs acceptees : {sorted(_ALLOWED_ROLES)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            target_user.role = new_role
            updated_fields.append("role")
            logger.info(
                "Admin %s a change le role de %s (id=%s) vers %s",
                request.user.email,
                target_user.email,
                target_user.pk,
                new_role,
            )

        if not updated_fields:
            return Response(
                {"detail": "Aucun champ valide fourni ('is_active' ou 'role')."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user.save(update_fields=updated_fields)

        return Response(
            {
                "id": target_user.pk,
                "email": target_user.email,
                "role": target_user.role,
                "is_active": target_user.is_active,
            }
        )
