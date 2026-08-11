from django.urls import path
from . import views




urlpatterns = [
    path('upload/', views.upload, name='upload'),
    path('apply/', views.apply_na, name='apply'),  

path('',views.home),

path('about/',views.about),

path('residential/',views.residential),

path('commercial/',views.commercial),

path('industrial/',views.industrial),

path('educational/',views.educational),

path('register/',views.register),

path('login/',views.login_user),

path('logout/',views.logout_user),

]