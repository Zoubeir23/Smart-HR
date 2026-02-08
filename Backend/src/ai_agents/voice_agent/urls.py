from django.urls import path
from . import views

urlpatterns = [
    path('ask/', views.ask, name='voice_ask'),
    path('index-docs/', views.index_docs, name='voice_index_docs'),
]
