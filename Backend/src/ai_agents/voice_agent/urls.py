from django.urls import path
from . import views

urlpatterns = [
    path('ask/', views.ask, name='voice_ask'),
    path('index-docs/', views.index_docs, name='voice_index_docs'),
    path('index-from-url/', views.index_from_url, name='voice_index_from_url'),
]
