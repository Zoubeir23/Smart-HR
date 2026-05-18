from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.ai_engine.views import ChurnPredictionViewSet
from smart_hr.ai_engine.views import RetriggerChurnModelView

router = DefaultRouter()
router.register(
    "churn-predictions",
    ChurnPredictionViewSet,
    basename="churn-prediction",
)

urlpatterns = [
    path("", include(router.urls)),
    path("retrain/", RetriggerChurnModelView.as_view(), name="churn-retrain"),
]
