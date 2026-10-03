from django.urls import path
from . import views

urlpatterns = [
    path('',           views.home,         name='home'),
    path('about/',     views.about,        name='about'),
    path('resources/', views.resources,    name='resources'),
    path('resources/<str:filename>', views.resource_pdf_redirect, name='resource_pdf_redirect'),
    path('contact/',   views.contact,      name='contact'),
    path('upload/',    views.upload,       name='upload'),
    path('apply/',     views.apply_na,     name='apply'),
    path('track/',     views.track_view,   name='track'),
    
    path('residential/',  views.residential,  name='residential'),
    path('commercial/',   views.commercial,   name='commercial'),
    path('industrial/',   views.industrial,   name='industrial'),
    path('educational/',  views.educational,  name='educational'),
    path('register/',  views.register,    name='register'),
    path('login/',     views.login_user,  name='login'),
    path('logout/',    views.logout_user, name='logout'),
]
