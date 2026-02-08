from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'employees', views.EmployeeViewSet)
router.register(r'departments', views.DepartmentViewSet)
router.register(r'positions', views.PositionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
