from django.urls import path
from . import views

urlpatterns = [
    path('predict/<int:employee_id>/', views.predict_employee_churn, name='predict_churn'),
    path('predict-all/', views.predict_all_churn, name='predict_all_churn'),
    path('predictions/', views.get_all_predictions, name='all_predictions'),
    path('high-risk/', views.get_high_risk, name='high_risk'),
]
