from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.ai.views import ChatHistoryViewSet
from smart_hr.ai.views.interview import GenerateInterviewFeedbackView
from smart_hr.ai.views.interview import GenerateInterviewQuestionsView

router = DefaultRouter()
router.register("chat", ChatHistoryViewSet, basename="chat")

urlpatterns = [
    path("", include(router.urls)),
    path("interview/questions/", GenerateInterviewQuestionsView.as_view(), name="interview-questions"),
    path("interview/feedback/", GenerateInterviewFeedbackView.as_view(), name="interview-feedback"),
]
