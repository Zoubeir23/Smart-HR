from django.urls import path
from . import views
from .views_filemanager import list_files, upload_file, delete_file, download_file

urlpatterns = [
    path('', views.getAllDocuments),
    path('files/', list_files),
    path('files/upload/', upload_file),
    path('files/delete/', delete_file),
    path('files/download/', download_file),
    path('upload/', views.uploadDocument),
    path('delete/<int:id>/', views.deleteDocument),
]
