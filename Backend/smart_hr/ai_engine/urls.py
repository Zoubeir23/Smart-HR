from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.ai_engine.views import ChurnPredictionViewSet

router = DefaultRouter()
router.register(
    "churn-predictions",
    ChurnPredictionViewSet,
    basename="churn-prediction",
)

urlpatterns = [path("", include(router.urls))]
