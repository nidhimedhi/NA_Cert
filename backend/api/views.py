"""
All REST API views for the NA Certificate portal.

Auth strategy:
  - Citizens  → Supabase `users` table + PyJWT (custom)
  - Tahsildar / Collector → Django auth + SimpleJWT
"""

import random
import re

import jwt
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from portal.supabase_client import insert, select, update, upload_file
from portal.extractor import extract_712, extract_any_pdf

# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────

DOCUMENTS = {
    'Residential - Individual': [
        'Ownership Document',
        '7/12 Utara (Satbara)',
        'Holding Certificate',
        'Proposed Layout Plan',
    ],
    'Residential - Partnership': [
        'Ownership Document',
        '7/12 Utara (Satbara)',
        'Holding Certificate',
        'Proposed Layout Plan',
        'Partnership Agreement Deed',
        'Return on a Set (Tax Returns)',
    ],
    'Educational - Granted': [
        'Town Pleasure Reservation Declaration',
        'Reservation Report (for Collector)',
        'State Government Referral (via Collector)',
        'Solving Conditions Proof - Educational Use',
        'Street Government Document (Collector Signed)',
    ],
    'Educational - Semi-Granted': [
        'Town Pleasure Reservation Declaration',
        'Reservation Report (for Collector)',
        'State Government Referral (via Collector)',
        'Solving Conditions Proof - Educational Use',
        'Street Government Document (Collector Signed)',
    ],
    'Educational - Private': [
        'Town Pleasure Reservation Declaration',
        'Reservation Report (for Collector)',
        'State Government Referral (via Collector)',
        'Solving Conditions Proof - Educational Use',
        'Street Government Document (Collector Signed)',
    ],
    'Industrial - Granted': [
        'Town Pleasure Reservation Declaration',
        'Reservation Report (for Collector)',
        'State Government Referral (via Collector)',
        'Solving Conditions Proof - Industrial Use',
        'Street Government Document (Collector Signed)',
    ],
    'Industrial - Semi-Granted': [
        'Town Pleasure Reservation Declaration',
        'Reservation Report (for Collector)',
        'State Government Referral (via Collector)',
        'Solving Conditions Proof - Industrial Use',
        'Street Government Document (Collector Signed)',
    ],
    'Industrial - Private': [
        'Town Pleasure Reservation Declaration',
        'Reservation Report (for Collector)',
        'State Government Referral (via Collector)',
        'Solving Conditions Proof - Industrial Use',
        'Street Government Document (Collector Signed)',
    ],
    'Commercial - Granted': [
        'Town Pleasure Reservation Declaration',
        'Reservation Report (for Collector)',
        'State Government Referral (via Collector)',
        'Solving Conditions Proof - Commercial Use',
        'Street Government Document (Collector Signed)',
    ],
    'Commercial - Semi-Granted': [
        'Town Pleasure Reservation Declaration',
        'Reservation Report (for Collector)',
        'State Government Referral (via Collector)',
        'Solving Conditions Proof - Commercial Use',
        'Street Government Document (Collector Signed)',
    ],
    'Commercial - Private': [
        'Town Pleasure Reservation Declaration',
        'Reservation Report (for Collector)',
        'State Government Referral (via Collector)',
        'Solving Conditions Proof - Commercial Use',
        'Street Government Document (Collector Signed)',
    ],
}


def _make_citizen_token(user: dict) -> str:
    """Issue a simple JWT for a citizen (Supabase user)."""
    payload = {
        'user_id':    str(user['id']),
        'user_email': user['email'],
        'user_name':  user.get('first_name', ''),
        'role':       'citizen',
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def _decode_citizen_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
    except jwt.PyJWTError:
        return None


def _citizen_payload(request) -> dict | None:
    """Extract citizen JWT payload from Authorization header."""
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    return _decode_citizen_token(auth.split(' ', 1)[1])


# ─────────────────────────────────────────────────────────────────────
# Citizen auth
# ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def citizen_register(request):
    data = request.data
    required = ['first_name', 'last_name', 'email', 'password', 'confirm_password']
    for field in required:
        if not data.get(field):
            return Response({'error': f'{field} is required.'}, status=400)

    if data['password'] != data['confirm_password']:
        return Response({'error': 'Passwords do not match.'}, status=400)

    existing = select('users', {'email': data['email']})
    if isinstance(existing, list) and len(existing) > 0:
        return Response({'error': 'Email already registered.'}, status=400)

    insert('users', {
        'username':   data['email'],
        'email':      data['email'],
        'password':   make_password(data['password']),
        'first_name': data['first_name'],
        'last_name':  data['last_name'],
        'phone':      data.get('phone', ''),
        'address':    data.get('address', ''),
    })
    return Response({'message': 'Registered successfully.'}, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def citizen_login(request):
    email    = request.data.get('email', '').strip()
    password = request.data.get('password', '')

    result = select('users', {'username': email})
    if not (isinstance(result, list) and result):
        return Response({'error': 'Invalid email or password.'}, status=401)

    user = result[0]
    if not check_password(password, user['password']):
        return Response({'error': 'Invalid email or password.'}, status=401)

    token = _make_citizen_token(user)
    return Response({
        'token':      token,
        'user_email': user['email'],
        'user_name':  user.get('first_name', ''),
        'user_id':    str(user['id']),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def citizen_me(request):
    payload = _citizen_payload(request)
    if not payload:
        return Response({'error': 'Unauthorized'}, status=401)
    return Response({
        'user_email': payload['user_email'],
        'user_name':  payload['user_name'],
        'user_id':    payload['user_id'],
    })


# ─────────────────────────────────────────────────────────────────────
# Tahsildar auth (Django users → SimpleJWT)
# ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def tahsildar_login(request):
    username = request.data.get('username', '')
    password = request.data.get('password', '')
    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({'error': 'Invalid credentials.'}, status=401)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access':   str(refresh.access_token),
        'refresh':  str(refresh),
        'username': user.username,
        'role':     'tahsildar',
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def collector_login(request):
    username = request.data.get('username', '')
    password = request.data.get('password', '')
    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({'error': 'Invalid credentials.'}, status=401)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access':   str(refresh.access_token),
        'refresh':  str(refresh),
        'username': user.username,
        'role':     'collector',
    })


# ─────────────────────────────────────────────────────────────────────
# Land types (public)
# ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def land_types(request):
    return Response({
        'land_types': list(DOCUMENTS.keys()),
        'documents':  DOCUMENTS,
    })


# ─────────────────────────────────────────────────────────────────────
# Apply for NA certificate (citizen)
# ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def apply_na(request):
    payload = _citizen_payload(request)
    if not payload:
        return Response({'error': 'Authentication required.'}, status=401)

    land_type  = request.data.get('land_type', '').strip()
    land_type  = re.sub(r'\s*-\s*', ' - ', land_type)
    documents  = DOCUMENTS.get(land_type, [])
    if not documents:
        return Response({'error': f'Unknown land type: {land_type}'}, status=400)

    ref        = f"NA-2026-{random.randint(100000, 999999)}"
    user_email = payload['user_email']

    app_result = insert('na_applications', {
        'user_email':   user_email,
        'land_type':    land_type,
        'reference_no': ref,
        'status':       'pending',
    })

    application_id = None
    if isinstance(app_result, list) and app_result:
        application_id = app_result[0].get('id')

    for i, doc_name in enumerate(documents, start=1):
        file = request.FILES.get(f'doc_{i}')
        if file and application_id:
            file_extension = file.name.split('.')[-1]
            file_path      = f"{application_id}/{i}_{doc_name.replace(' ', '_')}.{file_extension}"
            file_url       = upload_file(file, file_path)
            file.seek(0)

            general = extract_any_pdf(file)
            file.seek(0)

            specific = {}
            if '7/12' in doc_name or 'Satbara' in doc_name or 'Utara' in doc_name:
                specific = extract_712(file)
                file.seek(0)

            insert('extracted_documents', {
                'application_id': application_id,
                'document_name':  doc_name,
                'file_url':       file_url or '',
                'village':        specific.get('village', ''),
                'taluka':         specific.get('taluka', ''),
                'district':       specific.get('district', ''),
                'gat_no':         specific.get('gat_no', ''),
                'owner_names':    str(specific.get('owner_names', [])),
                'satbara_no':     specific.get('satbara_no', ''),
                'raw_json': {
                    'language':        specific.get('language', ''),
                    'khata_no':        specific.get('khata_no', ''),
                    'total_area':      specific.get('total_area', ''),
                    'assessment':      specific.get('assessment', ''),
                    'raw_text':        general.get('raw_text', ''),
                    'key_value_pairs': general.get('key_value_pairs', {}),
                },
            })

    return Response({
        'message':      'Application submitted successfully.',
        'reference_no': ref,
        'land_type':    land_type,
    }, status=201)


# ─────────────────────────────────────────────────────────────────────
# Tahsildar dashboard endpoints (Django JWT protected)
# ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def tahsildar_applications(request):
    status_filter = request.GET.get('status')
    from tahsildar.supabase_client import select_all, select_with_filter
    if status_filter:
        apps = select_with_filter('na_applications', 'status', status_filter)
    else:
        apps = select_all('na_applications')
    apps = apps if isinstance(apps, list) else []
    return Response({'applications': apps})


@api_view(['GET'])
def tahsildar_application_detail(request, app_id):
    from tahsildar.supabase_client import select, select_documents_for_application
    app_result = select('na_applications', {'id': app_id})
    app        = app_result[0] if isinstance(app_result, list) and app_result else None
    documents  = select_documents_for_application(app_id)
    documents  = documents if isinstance(documents, list) else []
    return Response({'application': app, 'documents': documents})


@api_view(['POST'])
def tahsildar_approve(request, app_id):
    from tahsildar.supabase_client import update as t_update
    t_update('na_applications', {'id': app_id}, {
        'status':      'approved',
        'reviewed_at': timezone.now().isoformat(),
    })
    return Response({'message': 'Application approved.'})


@api_view(['POST'])
def tahsildar_reject(request, app_id):
    from tahsildar.supabase_client import update as t_update
    reason = request.data.get('reason', '')
    t_update('na_applications', {'id': app_id}, {
        'status':           'rejected',
        'rejection_reason': reason,
        'reviewed_at':      timezone.now().isoformat(),
    })
    return Response({'message': 'Application rejected.'})


# ─────────────────────────────────────────────────────────────────────
# Collector dashboard endpoints (Django JWT protected)
# ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def collector_applications(request):
    status_filter = request.GET.get('status', 'approved')
    from collector.supabase_client import select_filter
    apps = select_filter('na_applications', 'status', status_filter)
    apps = apps if isinstance(apps, list) else []
    return Response({'applications': apps})


@api_view(['GET'])
def collector_application_detail(request, app_id):
    from collector.supabase_client import select_one, get_documents
    app  = select_one('na_applications', 'id', app_id)
    docs = get_documents(app_id)
    docs = docs if isinstance(docs, list) else []
    return Response({'application': app, 'documents': docs})


@api_view(['POST'])
def collector_approve(request, app_id):
    from collector.supabase_client import update as c_update
    c_update('na_applications', 'id', app_id, {
        'status':      'collector_approved',
        'reviewed_at': timezone.now().isoformat(),
    })
    return Response({'message': 'Application collector-approved.'})


@api_view(['POST'])
def collector_reject(request, app_id):
    from collector.supabase_client import update as c_update
    reason = request.data.get('reason', '')
    c_update('na_applications', 'id', app_id, {
        'status':           'collector_rejected',
        'rejection_reason': reason,
        'reviewed_at':      timezone.now().isoformat(),
    })
    return Response({'message': 'Application collector-rejected.'})
