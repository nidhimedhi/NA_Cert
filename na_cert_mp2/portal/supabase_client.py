import requests
from django.conf import settings

HEADERS = {
    "apikey": settings.SUPABASE_KEY,
    "Authorization": f"Bearer {settings.SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def select(table, filters=None):
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    if filters:
        url += "?" + "&".join([f"{k}=eq.{v}" for k, v in filters.items()])
    response = requests.get(url, headers=HEADERS)
    return response.json()

def insert(table, data):
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    response = requests.post(url, json=data, headers=HEADERS)
    return response.json()

def update(table, filters, data):
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    if filters:
        url += "?" + "&".join([f"{k}=eq.{v}" for k, v in filters.items()])
    response = requests.patch(url, json=data, headers=HEADERS)
    return response.json()

def upload_file(file, file_path):
    """Upload file to Supabase Storage"""
    url = f"{settings.SUPABASE_URL}/storage/v1/object/documents/{file_path}"
    upload_headers = {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        "Content-Type": file.content_type,
    }
    file.seek(0)
    response = requests.post(url, headers=upload_headers, data=file.read())
    if response.status_code in [200, 201]:
        return f"{settings.SUPABASE_URL}/storage/v1/object/public/documents/{file_path}"
    return None