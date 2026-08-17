from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/',  admin.site.urls),
    path('api/',    include('api.urls')),
    # Keep legacy Django template routes during transition (can remove later)
    path('',        include('portal.urls')),
    path('tahsildar/', include('tahsildar.urls')),
    path('collector/', include('collector.urls')),
]
