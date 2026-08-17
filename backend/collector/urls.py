from django.urls import path
from . import views

urlpatterns = [
    path('login/',      views.collector_login,    name='collector_login'),
    path('logout/',     views.collector_logout,   name='collector_logout'),
    path('dashboard/',  views.dashboard,          name='collector_dashboard'),
    path('applications/', views.applications,     name='collector_applications'),
    path('application/<str:app_id>/', views.application_detail, name='collector_detail'),
    path('approve/<str:app_id>/', views.approve_application,    name='collector_approve'),
    path('reject/<str:app_id>/',  views.reject_application,     name='collector_reject'),
    path('approved/',   views.approved,           name='collector_approved'),
    path('rejected/',   views.rejected,           name='collector_rejected'),
]