import requests
from django.conf import settings

HEADERS = {
    "apikey":        settings.SUPABASE_KEY,
    "Authorization": f"Bearer {settings.SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=representation",
    "X-Django-Secret": settings.SUPABASE_SECRET_TOKEN
}

def select_all(table, order='submitted_at'):
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}?order={order}.desc"
    return requests.get(url, headers=HEADERS).json()

def select_filter(table, field, value):
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}?{field}=eq.{value}&order=submitted_at.desc"
    return requests.get(url, headers=HEADERS).json()

def select_one(table, field, value):
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}?{field}=eq.{value}"
    result = requests.get(url, headers=HEADERS).json()
    return result[0] if isinstance(result, list) and result else None

def update(table, field, value, data):
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}?{field}=eq.{value}"
    headers = {**HEADERS, "Prefer": "return=representation"}
    return requests.patch(url, json=data, headers=headers).json()

def get_documents(application_id):
    url = f"{settings.SUPABASE_URL}/rest/v1/extracted_documents?application_id=eq.{application_id}"
    return requests.get(url, headers=HEADERS).json()