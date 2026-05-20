from django.urls import path

from smart_hr.core.views import NotificationListView
from smart_hr.core.views import NotificationMarkReadView

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/<int:pk>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
]
