from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path('login/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('google/', views.GoogleLoginView.as_view(), name='google_login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('me/', views.get_current_user, name='current_user'),
    path('me/update/', views.update_profile, name='update_profile'),
    path('me/change-password/', views.change_password, name='change_password'),
    path('logout/', views.logout_view, name='logout'),
    path('admin/stats/', views.admin_stats, name='admin_stats'),
]
