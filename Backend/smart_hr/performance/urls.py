from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.performance.views import Feedback360ViewSet
from smart_hr.performance.views import PerformanceEvaluationViewSet
from smart_hr.performance.views import SkillDefinitionViewSet
from smart_hr.performance.views import SkillViewSet

router = DefaultRouter()
router.register("skills", SkillViewSet, basename="skill")
router.register("skill-definitions", SkillDefinitionViewSet, basename="skill-definition")
router.register("evaluations", PerformanceEvaluationViewSet, basename="performance-evaluation")
router.register("feedback-360", Feedback360ViewSet, basename="feedback-360")

urlpatterns = [path("", include(router.urls))]
