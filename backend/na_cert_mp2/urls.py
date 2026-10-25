from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from django.shortcuts import redirect

def state_govt_redirect(request):
    # If React dev server is running, or deployed frontend
    frontend_url = 'http://localhost:5173/state-govt/login'
    return redirect(frontend_url)

urlpatterns = [
    path('admin/',      admin.site.urls),
    path('api/',        include('api.urls')),
    path('tahsildar/',  include('tahsildar.urls')),
    path('collector/',  include('collector.urls')),
    path('state-govt/', state_govt_redirect),
    path('state-govt',  state_govt_redirect),
    path('',            include('portal.urls')),
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATICFILES_DIRS[0]}),
]
