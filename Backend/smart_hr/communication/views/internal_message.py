from __future__ import annotations

import logging

from django.db.models import Count
from django.db.models import Q
from rest_framework import filters
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.communication.models import InternalMessage
from smart_hr.communication.serializers import InternalMessageSerializer
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)

ROLE_TO_AUDIENCE_MAP: dict[str, list[str]] = {
    User.Role.ADMIN: [
        InternalMessage.TargetAudience.ALL,
        InternalMessage.TargetAudience.ADMIN,
        InternalMessage.TargetAudience.RH,
        InternalMessage.TargetAudience.EMPLOYEE,
    ],
    User.Role.RH: [
        InternalMessage.TargetAudience.ALL,
        InternalMessage.TargetAudience.RH,
        InternalMessage.TargetAudience.EMPLOYEE,
    ],
    User.Role.EMPLOYEE: [
        InternalMessage.TargetAudience.ALL,
        InternalMessage.TargetAudience.EMPLOYEE,
    ],
}


class InternalMessageViewSet(viewsets.ModelViewSet):
    """Gestion des messages internes : mémorandums, notes et ordres de service."""

    serializer_class = InternalMessageSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "content", "category"]
    ordering_fields = ["published_at", "created_at", "message_type", "title"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        base = InternalMessage.objects.select_related("author")

        if user.role in [User.Role.ADMIN, User.Role.RH]:
            queryset = base
        elif user.role not in ROLE_TO_AUDIENCE_MAP:
            return InternalMessage.objects.none()
        else:
            allowed_audiences = ROLE_TO_AUDIENCE_MAP[user.role]
            queryset = base.filter(
                is_published=True,
                target_audience__in=allowed_audiences,
            )

        message_type = self.request.query_params.get("message_type")
        if message_type:
            valid_types = {c[0] for c in InternalMessage.MessageType.choices}
            if message_type in valid_types:
                queryset = queryset.filter(message_type=message_type)

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__icontains=category)

        published_year = self.request.query_params.get("year")
        if published_year and published_year.isdigit():
            queryset = queryset.filter(Q(published_at__year=published_year) | Q(created_at__year=published_year))

        return queryset

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """Statistiques des communications (RH/Admin uniquement)."""
        if request.user.role not in [User.Role.ADMIN, User.Role.RH]:
            return Response(status=status.HTTP_403_FORBIDDEN)

        total = InternalMessage.objects.count()
        published_count = InternalMessage.objects.filter(is_published=True).count()
        draft_count = total - published_count
        by_type = list(InternalMessage.objects.values("message_type").annotate(count=Count("id")).order_by("-count"))
        categories = list(
            InternalMessage.objects.exclude(category="").values_list("category", flat=True).distinct().order_by("category")
        )

        return Response(
            {
                "total": total,
                "published": published_count,
                "drafts": draft_count,
                "by_type": by_type,
                "categories": categories,
            }
        )
