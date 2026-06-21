from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.performance.views import PerformanceEvaluationViewSet
from smart_hr.performance.views import SkillViewSet

router = DefaultRouter()
router.register("skills", SkillViewSet, basename="skill")
router.register("evaluations", PerformanceEvaluationViewSet, basename="performance-evaluation")

urlpatterns = [path("", include(router.urls))]
