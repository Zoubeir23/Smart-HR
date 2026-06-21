from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.core.models import AuditLog
from smart_hr.core.models import Notification
from smart_hr.users.permissions import IsAdmin

_NOTIFICATION_PAGE_SIZE = 20


_AUDIT_LOG_PAGE_SIZE = 50


class AuditLogListView(APIView):
    """
    GET /api/v1/audit-logs/ — journal d'audit (Admin uniquement).
    Filtres query : action, model_name, performed_by (user_id), limit.
    """

    permission_classes = [IsAdmin]

    def get(self, request) -> Response:
        queryset = AuditLog.objects.select_related("performed_by").order_by("-timestamp")

        action_filter = request.query_params.get("action")
        if action_filter:
            queryset = queryset.filter(action=action_filter)

        model_name_filter = request.query_params.get("model_name")
        if model_name_filter:
            queryset = queryset.filter(model_name__icontains=model_name_filter)

        performed_by_id = request.query_params.get("performed_by")
        if performed_by_id:
            try:
                queryset = queryset.filter(performed_by_id=int(performed_by_id))
            except ValueError:
                pass

        try:
            limit = min(int(request.query_params.get("limit", _AUDIT_LOG_PAGE_SIZE)), 200)
        except ValueError:
            limit = _AUDIT_LOG_PAGE_SIZE

        logs = queryset[:limit]

        data = [
            {
                "id": log.pk,
                "action": log.action,
                "model_name": log.model_name,
                "object_id": log.object_id,
                "object_repr": log.object_repr,
                "details": log.details,
                "timestamp": log.timestamp.isoformat(),
                "performed_by": {
                    "id": log.performed_by.pk,
                    "email": log.performed_by.email,
                    "full_name": log.performed_by.get_full_name(),
                    "role": log.performed_by.role,
                }
                if log.performed_by
                else None,
            }
            for log in logs
        ]

        return Response({"count": len(data), "results": data})


class NotificationListView(APIView):
    """
    GET  /api/v1/notifications/              — liste (20 plus récentes)
    POST /api/v1/notifications/mark-all-read/ — marquer tout lu
    """

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        notifications = Notification.objects.filter(recipient=request.user).order_by("-created_at")[:_NOTIFICATION_PAGE_SIZE]
        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()

        data = [
            {
                "id": notification.pk,
                "notification_type": notification.notification_type,
                "title": notification.title,
                "message": notification.message,
                "is_read": notification.is_read,
                "target_url": notification.target_url,
                "created_at": notification.created_at.isoformat(),
            }
            for notification in notifications
        ]

        return Response({"results": data, "unread_count": unread_count})

    def post(self, request) -> Response:
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "Toutes les notifications ont été marquées comme lues."})


class NotificationMarkReadView(APIView):
    """PATCH /api/v1/notifications/<pk>/read/ — marquer une notification comme lue."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk: int) -> Response:
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Notification introuvable."}, status=status.HTTP_404_NOT_FOUND)

        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response({"id": notification.pk, "is_read": True})
