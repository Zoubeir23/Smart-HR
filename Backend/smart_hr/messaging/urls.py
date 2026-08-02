from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.messaging.views import ContactListView
from smart_hr.messaging.views import ConversationViewSet

router = DefaultRouter()
router.register("conversations", ConversationViewSet, basename="conversation")

urlpatterns = [
    path("contacts/", ContactListView.as_view(), name="messaging-contact-list"),
    path("", include(router.urls)),
]
