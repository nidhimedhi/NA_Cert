from django.urls import path
from . import views

urlpatterns = [
    path('login/',      views.tahsildar_login,    name='tahsildar_login'),
    path('logout/',     views.tahsildar_logout,   name='tahsildar_logout'),
    path('dashboard/',  views.dashboard,          name='tahsildar_dashboard'),
    path('upcoming/',   views.upcoming,           name='tahsildar_upcoming'),
    path('approved/',   views.approved,           name='tahsildar_approved'),
    path('rejected/',   views.rejected,           name='tahsildar_rejected'),
    path('approve/<str:app_id>/', views.approve_application, name='approve'),
    path('reject/<str:app_id>/',  views.reject_application,  name='reject'),
    path('application/<str:app_id>/', views.application_detail, name='application_detail'),
]