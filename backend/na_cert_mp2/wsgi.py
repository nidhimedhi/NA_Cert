"""
WSGI config for na_cert_mp2 project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'na_cert_mp2.settings')

application = get_wsgi_application()
app = application
