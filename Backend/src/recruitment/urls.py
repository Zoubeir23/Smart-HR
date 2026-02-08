from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'jobs', views.JobOfferViewSet)
router.register(r'applications', views.ApplicationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
