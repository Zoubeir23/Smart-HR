from django.urls import path
from .views import findAllPresence, createPresence, updatePresence, deletePresence

urlpatterns = [
    path('', findAllPresence, name='findAllPresence'),
    path('create/', createPresence, name='createPresence'),
    path('update/', updatePresence, name='updatePresence'),
    path('delete/<int:id>/', deletePresence, name='deletePresence'),
]
