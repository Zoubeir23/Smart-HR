from django.urls import path
from . import views

urlpatterns = [
    path('meetings/', views.findAllMeetings),
    path('meetings/create/', views.createMeeting),
    path('meetings/update/', views.updateMeeting),
    path('meetings/status/', views.updateMeetingStatus),
    path('meetings/delete/<int:id>/', views.deleteMeeting),

    path('', views.findAllFormations),
    path('create/', views.createFormation),
    path('update/', views.updateFormation),
    path('delete/<int:id>/', views.deleteFormation),

    path('zoom/auth/', views.zoom_auth, name='zoom_auth'),
    path('zoom/callback/', views.zoom_callback, name='zoom_callback'),
    path('zoom/create-meeting/', views.create_meeting, name='create_meeting'),
]
