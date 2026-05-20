from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.core.models import Notification

_NOTIFICATION_PAGE_SIZE = 20


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
