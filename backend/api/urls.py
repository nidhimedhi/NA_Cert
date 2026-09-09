from django.urls import path
from . import views

urlpatterns = [
    # ── Citizen auth ──────────────────────────────────────────────────
    path('auth/register/',     views.citizen_register),
    path('auth/login/',        views.citizen_login),
    path('auth/me/',           views.citizen_me),

    # ── Tahsildar auth ────────────────────────────────────────────────
    path('tahsildar/auth/login/',  views.tahsildar_login),

    # ── Collector auth ────────────────────────────────────────────────
    path('collector/auth/login/',  views.collector_login),

    # ── Public ────────────────────────────────────────────────────────
    path('land-types/',  views.land_types),
    path('track/',       views.track_application),
    path('track/<str:ref>/', views.track_application),

    # ── Citizen portal ────────────────────────────────────────────────
    path('apply/',       views.apply_na),
    path('citizen/applications/', views.citizen_applications),

    # ── Tahsildar dashboard ───────────────────────────────────────────
    path('tahsildar/applications/',              views.tahsildar_applications),
    path('tahsildar/applications/<str:app_id>/', views.tahsildar_application_detail),
    path('tahsildar/applications/<str:app_id>/approve/', views.tahsildar_approve),
    path('tahsildar/applications/<str:app_id>/reject/',  views.tahsildar_reject),

    # ── Collector dashboard ───────────────────────────────────────────
    path('collector/applications/',                     views.collector_applications),
    path('collector/applications/<str:app_id>/',        views.collector_application_detail),
    path('collector/applications/<str:app_id>/forward/', views.collector_forward),
    path('collector/applications/<str:app_id>/approve/', views.collector_approve),
    path('collector/applications/<str:app_id>/reject/',  views.collector_reject),
]
