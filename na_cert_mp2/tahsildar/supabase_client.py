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
    params = []
    if filters:
        for k, v in filters.items():
            params.append(f"{k}=eq.{v}")
    if params:
        url += "?" + "&".join(params)
    response = requests.get(url, headers=HEADERS)
    return response.json()

def select_all(table):
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}?order=submitted_at.desc"
    response = requests.get(url, headers=HEADERS)
    return response.json()

def update(table, filters, data):
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    if filters:
        url += "?" + "&".join([f"{k}=eq.{v}" for k, v in filters.items()])
    update_headers = {**HEADERS, "Prefer": "return=representation"}
    response = requests.patch(url, json=data, headers=update_headers)
    return response.json()

def select_with_filter(table, field, value, operator='eq'):
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}?{field}={operator}.{value}&order=submitted_at.desc"
    response = requests.get(url, headers=HEADERS)
    return response.json()

def select_documents_for_application(application_id):
    url = f"{settings.SUPABASE_URL}/rest/v1/extracted_documents?application_id=eq.{application_id}"
    response = requests.get(url, headers=HEADERS)
    return response.json()