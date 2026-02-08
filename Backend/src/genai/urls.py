from django.urls import path

from .views import chat, chat_history

urlpatterns = [
    path('chat/', chat, name='chat'),
    path('history/', chat_history, name='chat_history'),
]
