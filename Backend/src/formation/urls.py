from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FormationViewSet, MeetingViewSet, create_meeting, zoom_auth, zoom_callback

router = DefaultRouter()
router.register('formations', FormationViewSet, basename='formation')
router.register('meetings', MeetingViewSet, basename='meeting')

urlpatterns = [
    path('', include(router.urls)),
    path('zoom/auth/', zoom_auth, name='zoom_auth'),
    path('zoom/callback/', zoom_callback, name='zoom_callback'),
    path('zoom/create-meeting/', create_meeting, name='create_meeting'),
]
