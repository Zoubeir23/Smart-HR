from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.ai.views import ChatHistoryViewSet
from smart_hr.ai.views.interview import GenerateInterviewFeedbackView
from smart_hr.ai.views.interview import GenerateInterviewQuestionsView
from smart_hr.ai.views.interview_session import InterviewSessionCreateView
from smart_hr.ai.views.interview_session import InterviewSessionDetailView
from smart_hr.ai.views.interview_session import InterviewSessionFeedbackCreateView
from smart_hr.ai.views.interview_session import InterviewSessionListView

router = DefaultRouter()
router.register("chat", ChatHistoryViewSet, basename="chat")

urlpatterns = [
    path("", include(router.urls)),
    path("interview/questions/", GenerateInterviewQuestionsView.as_view(), name="interview-questions"),
    path("interview/feedback/", GenerateInterviewFeedbackView.as_view(), name="interview-feedback"),
    path("interview/sessions/", InterviewSessionListView.as_view(), name="interview-session-list"),
    path("interview/sessions/create/", InterviewSessionCreateView.as_view(), name="interview-session-create"),
    path("interview/sessions/<uuid:token>/", InterviewSessionDetailView.as_view(), name="interview-session-detail"),
    path(
        "interview/sessions/<uuid:token>/feedback/",
        InterviewSessionFeedbackCreateView.as_view(),
        name="interview-session-feedback",
    ),
]
