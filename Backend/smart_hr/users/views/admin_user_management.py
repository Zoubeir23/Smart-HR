from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.users.models import User
from smart_hr.users.permissions import IsAdmin
from smart_hr.users.serializers import UserRegisterSerializer

logger = logging.getLogger(__name__)

_ALLOWED_ROLES = {User.Role.ADMIN, User.Role.RH, User.Role.EMPLOYEE, User.Role.CANDIDATE}


class AdminUserManagementView(APIView):
    """
    GET   /api/v1/auth/admin/users/           — liste tous les utilisateurs
    POST  /api/v1/auth/admin/users/           — crée un compte (RH, EMPLOYEE, ADMIN)
    PATCH /api/v1/auth/admin/users/{id}/      — modifie role ou is_active
    """

    permission_classes = [IsAdmin]

    def post(self, request) -> Response:
        """Crée un compte utilisateur interne (RH, EMPLOYEE, ADMIN).
        Le compte est actif et vérifié dès la création — pas d'OTP requis.
        """
        role = request.data.get("role", "")
        if role == User.Role.CANDIDATE:
            return Response(
                {"detail": "Utilisez /register/candidate/ pour créer un compte candidat."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if role not in _ALLOWED_ROLES:
            return Response(
                {"detail": f"Rôle invalide. Valeurs acceptées : {sorted(str(r) for r in _ALLOWED_ROLES)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = UserRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        user.is_email_verified = True
        user.is_active = True
        user.save(update_fields=["is_email_verified", "is_active"])

        logger.info(
            "Admin %s a créé le compte %s avec le rôle %s",
            request.user.email,
            user.email,
            user.role,
        )

        return Response(
            {
                "id": user.pk,
                "email": user.email,
                "username": user.username,
                "role": user.role,
                "is_active": user.is_active,
                "is_email_verified": user.is_email_verified,
            },
            status=status.HTTP_201_CREATED,
        )

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
