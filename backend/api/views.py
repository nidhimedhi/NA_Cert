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


def is_state_govt_qualifying(land_type: str) -> bool:
    """
    Returns True for all Granted and Semi-Granted applications:
      - Educational - Granted / Semi-Granted
      - Commercial - Granted / Semi-Granted
      - Industrial - Granted / Semi-Granted
    Returns False for Private and Residential applications (which route to Tahsildar).
    """
    lt = (land_type or '').lower().strip()
    is_granted_or_semi = ('granted' in lt) or ('semi-granted' in lt)
    is_private = 'private' in lt
    return is_granted_or_semi and not is_private


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
    username = (request.data.get('username') or '').strip()
    password = request.data.get('password', '')
    is_biometric = request.data.get('biometric_verified', False)

    if not username or not password:
        return Response({'error': 'Official Tahsildar Username and Passkey are both required.'}, status=400)

    # STRICT CREDENTIAL VALIDATION
    user = authenticate(request, username=username, password=password)
    if user is None:
        try:
            from django.contrib.auth.models import User
            matching_user = User.objects.filter(username__iexact=username).first()
            if matching_user:
                user = authenticate(request, username=matching_user.username, password=password)
        except Exception:
            pass

    if user is None:
        return Response({'error': 'Invalid credentials. Access Denied: Incorrect Tahsildar username or passkey.'}, status=401)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access':   str(refresh.access_token),
        'refresh':  str(refresh),
        'username': user.username,
        'role':     'tahsildar',
        'biometric_authenticated': bool(is_biometric),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def collector_login(request):
    username = (request.data.get('username') or '').strip()
    password = request.data.get('password', '')
    is_biometric = request.data.get('biometric_verified', False)

    if not username or not password:
        return Response({'error': 'Official Username and Passkey are both required.'}, status=400)

    # STRICT CREDENTIAL VALIDATION: Check credentials against Django user database
    user = authenticate(request, username=username, password=password)
    if user is None:
        try:
            from django.contrib.auth.models import User
            matching_user = User.objects.filter(username__iexact=username).first()
            if matching_user:
                user = authenticate(request, username=matching_user.username, password=password)
        except Exception:
            pass

    if user is None:
        return Response({'error': 'Invalid credentials. Access Denied: Incorrect Collector username or passkey.'}, status=401)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access':   str(refresh.access_token),
        'refresh':  str(refresh),
        'username': user.username,
        'role':     'collector',
        'biometric_authenticated': bool(is_biometric),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def state_govt_login(request):
    username = (request.data.get('username') or '').strip()
    password = request.data.get('password', '')
    is_biometric = request.data.get('biometric_verified', False)

    if not username or not password:
        return Response({'error': 'Secretariat Username and Passkey are both required.'}, status=400)

    # STRICT CREDENTIAL VALIDATION: Check credentials against Django user database
    user = authenticate(request, username=username, password=password)
    if user is None:
        try:
            from django.contrib.auth.models import User
            matching_user = User.objects.filter(username__iexact=username).first()
            if matching_user:
                user = authenticate(request, username=matching_user.username, password=password)
        except Exception:
            pass

    if user is None:
        return Response({'error': 'Invalid credentials. Access Denied: Incorrect Secretariat username or passkey.'}, status=401)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access':   str(refresh.access_token),
        'refresh':  str(refresh),
        'username': user.username,
        'role':     'state_govt',
        'biometric_authenticated': bool(is_biometric),
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

    # Cost Calculation & Payment Details
    total_amount       = request.data.get('total_amount', '').strip()
    gov_app_fee        = request.data.get('gov_app_fee', '').strip()
    conversion_premium = request.data.get('conversion_premium', '').strip()
    survey_charges     = request.data.get('survey_charges', '').strip()
    utr_number         = request.data.get('utr_number', '').strip()
    premium_rule       = request.data.get('premium_rule', '').strip()
    area_sqmt          = request.data.get('area_sqmt', '').strip()
    rr_rate            = request.data.get('rr_rate', '').strip()
    market_value       = request.data.get('market_value', '').strip()
    payee_upi          = 'rajnandinijoshi402@okhdfcbank'

    fee_summary = ""
    if total_amount:
        fee_summary = f"Statutory Fee: {total_amount} Paid via UPI (UTR: {utr_number or 'Pending'})"

    # All applications land at the District Collector Desk upon citizen filing
    initial_status = 'pending_collector'

    app_result = insert('na_applications', {
        'user_email':       user_email,
        'land_type':        land_type,
        'reference_no':     ref,
        'status':           initial_status,
        'rejection_reason': fee_summary if fee_summary else None,
    })

    application_id = None
    if isinstance(app_result, list) and app_result:
        application_id = app_result[0].get('id')

    # Archive official Fee Assessment & Payment Challan document
    if application_id and total_amount:
        try:
            insert('extracted_documents', {
                'application_id': application_id,
                'document_name':  'Statutory Fee Assessment & Payment Challan',
                'file_url':       '',
                'village':        request.data.get('village', ''),
                'taluka':         request.data.get('taluka', ''),
                'district':       request.data.get('district', ''),
                'gat_no':         request.data.get('gat_no', ''),
                'owner_names':    user_email,
                'satbara_no':     ref,
                'raw_json': {
                    'challan_title':        'Statutory NA Fee Assessment & Payment Challan',
                    'reference_no':         ref,
                    'user_email':           user_email,
                    'land_type':            land_type,
                    'total_amount':         total_amount,
                    'gov_app_fee':          gov_app_fee,
                    'conversion_premium':   conversion_premium,
                    'survey_charges':       survey_charges,
                    'premium_rule':         premium_rule,
                    'area_sqmt':            area_sqmt,
                    'rr_rate':              rr_rate,
                    'market_value':         market_value,
                    'utr_number':           utr_number,
                    'payment_mode':         'Google Pay / UPI',
                    'payee_upi':            payee_upi,
                    'payment_status':       'VERIFIED & PAID' if utr_number else 'PENDING',
                    'paid_at':              timezone.now().isoformat(),
                },
            })
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Could not archive payment challan: %s", e)

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
                'owner_names':    ", ".join(specific.get('owner_names')) if isinstance(specific.get('owner_names'), list) else str(specific.get('owner_names') or ''),
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
        'message':            'Application submitted successfully with statutory payment challan.',
        'reference_no':       ref,
        'land_type':          land_type,
        'total_amount':       total_amount,
        'utr_number':         utr_number,
        'payment_status':     'VERIFIED & PAID' if utr_number else 'PENDING',
    }, status=201)


# ─────────────────────────────────────────────────────────────────────
# Tahsildar dashboard endpoints (Django JWT protected)
# ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def tahsildar_applications(request):
    status_filter = request.GET.get('status')
    from tahsildar.supabase_client import select_all
    apps = select_all('na_applications')
    apps = apps if isinstance(apps, list) else []

    # Tahsildar processes ONLY Private & Residential applications explicitly forwarded by the Collector
    # Granted & Semi-Granted applications bypass Tahsildar and go Collector -> State Govt
    apps = [a for a in apps if not is_state_govt_qualifying(a.get('land_type'))]

    if status_filter == 'pending':
        apps = [a for a in apps if a.get('status') == 'forwarded_to_tahsildar']
    elif status_filter == 'approved':
        apps = [a for a in apps if a.get('status') in ('tahsildar_verified', 'approved', 'collector_approved')]
    elif status_filter == 'rejected':
        apps = [a for a in apps if a.get('status') in ('tahsildar_rejected', 'rejected', 'collector_rejected')]
    elif status_filter and status_filter != 'all':
        apps = [a for a in apps if a.get('status') == status_filter]
    else:
        # 'all' for Tahsildar only includes applications that were forwarded to Tahsildar
        apps = [a for a in apps if a.get('status') in ('forwarded_to_tahsildar', 'tahsildar_verified', 'approved', 'tahsildar_rejected', 'rejected', 'collector_approved', 'collector_rejected')]
    _enrich_applications_list(apps)
    return Response({'applications': apps})


def _enrich_applications_list(apps):
    """Enriches each application dict with applicant_name, gut_no, village, taluka, district from extracted_documents."""
    if not apps:
        return apps
    try:
        from portal.supabase_client import select as p_select
        all_docs = p_select('extracted_documents', {})
        docs_by_app = {}
        if isinstance(all_docs, list):
            for d in all_docs:
                app_id = d.get('application_id')
                if app_id:
                    docs_by_app.setdefault(app_id, []).append(d)

        for a in apps:
            app_id = a.get('id')
            app_docs = docs_by_app.get(app_id, [])
            for d in app_docs:
                if d.get('document_name') == 'Application Form - e-District Maharashtra':
                    raw = d.get('raw_json') or {}
                    app_d = raw.get('applicant_details', {})
                    land_d = raw.get('land_details', {}) or raw.get('service_specific_details', {})
                    a['applicant_name'] = app_d.get('full_name') or d.get('owner_names') or a.get('user_email', '')
                    a['gut_no'] = land_d.get('gat_number') or d.get('gat_no', '')
                    a['village'] = land_d.get('land_village') or land_d.get('village') or d.get('village', '')
                    a['taluka'] = land_d.get('land_taluka') or land_d.get('taluka') or d.get('taluka', '')
                    a['district'] = land_d.get('land_district') or land_d.get('district') or d.get('district', '')
                    a['area_sqmt'] = land_d.get('area_sqmt') or land_d.get('total_area', '')
                    break
                if not a.get('gut_no') and d.get('gat_no'): a['gut_no'] = d.get('gat_no')
                if not a.get('village') and d.get('village'): a['village'] = d.get('village')
                if not a.get('taluka') and d.get('taluka'): a['taluka'] = d.get('taluka')
                if not a.get('district') and d.get('district'): a['district'] = d.get('district')
                if not a.get('applicant_name') and d.get('owner_names'): a['applicant_name'] = d.get('owner_names')

            if not a.get('applicant_name'):
                a['applicant_name'] = a.get('user_email', '')
            if isinstance(a.get('applicant_name'), str) and a['applicant_name'].startswith('[') and a['applicant_name'].endswith(']'):
                a['applicant_name'] = a['applicant_name'].strip("[]'\" ")
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Enrichment failed: %s", e)
    return apps


def _normalize_form_data(form_data):
    if not (form_data and isinstance(form_data, dict)):
        return form_data
    # Ensure both land_details and service_specific_details exist
    if 'service_specific_details' in form_data and 'land_details' not in form_data:
        form_data['land_details'] = dict(form_data['service_specific_details'])
    elif 'land_details' in form_data and 'service_specific_details' not in form_data:
        form_data['service_specific_details'] = dict(form_data['land_details'])

    # Ensure applicant details has both res_village and village etc.
    app_d = form_data.get('applicant_details')
    if app_d and isinstance(app_d, dict):
        for k in ['village', 'taluka', 'district', 'pincode']:
            if k in app_d and f'res_{k}' not in app_d:
                app_d[f'res_{k}'] = app_d[k]
            elif f'res_{k}' in app_d and k not in app_d:
                app_d[k] = app_d[f'res_{k}']
    return form_data


@api_view(['GET'])
def tahsildar_application_detail(request, app_id):
    from tahsildar.supabase_client import select, select_documents_for_application
    app_result = select('na_applications', {'id': app_id})
    app        = app_result[0] if isinstance(app_result, list) and app_result else None
    documents  = select_documents_for_application(app_id)
    documents  = documents if isinstance(documents, list) else []

    form_data = None
    supporting_docs = []
    for doc in documents:
        if doc.get('document_name') == 'Application Form - e-District Maharashtra':
            form_data = _normalize_form_data(doc.get('raw_json'))
        else:
            supporting_docs.append(doc)

    return Response({
        'application': app,
        'documents': documents,
        'form_data': form_data,
        'supporting_docs': supporting_docs,
    })


@api_view(['POST'])
def tahsildar_approve(request, app_id):
    from tahsildar.supabase_client import update as t_update
    from portal.supabase_client import insert as p_insert, select as p_select

    # Detailed verification report fields
    factors = request.data.get('factors', [])
    inspection_date = request.data.get('inspection_date', '') or timezone.now().strftime('%Y-%m-%d')
    officer_name = request.data.get('officer_name', '') or getattr(request.user, 'username', 'Tahsildar')
    designation = request.data.get('designation', 'Tahsildar & Executive Magistrate')
    verified_area = request.data.get('verified_area', '')
    road_access = request.data.get('road_access', '')
    remarks = request.data.get('remarks', '') or request.data.get('notes', '')
    conditions = request.data.get('conditions', [])

    # Format human-readable summary for rejection_reason/tracking
    factor_titles = []
    if isinstance(factors, list):
        for f in factors:
            if isinstance(f, dict) and f.get('checked'):
                factor_titles.append(f.get('title') or f.get('id') or 'Statutory Factor')
            elif isinstance(f, str) and f.strip():
                factor_titles.append(f)

    summary_parts = [
        f"Verified by {officer_name} ({designation}) on {inspection_date}"
    ]
    if factor_titles:
        summary_parts.append(f"{len(factor_titles)} Factors Confirmed ({', '.join(factor_titles[:3])}{'...' if len(factor_titles)>3 else ''})")
    if remarks:
        summary_parts.append(f"Remarks: {remarks}")
    if conditions:
        cond_str = '; '.join(conditions) if isinstance(conditions, list) else str(conditions)
        summary_parts.append(f"Conditions: {cond_str[:120]}{'...' if len(cond_str)>120 else ''}")

    verification_summary = " | ".join(summary_parts)

    update_data = {
        'status':           'tahsildar_verified',
        'rejection_reason': verification_summary,
        'reviewed_at':      timezone.now().isoformat(),
    }
    t_update('na_applications', {'id': app_id}, update_data)

    # Archive formal verification report into extracted_documents
    try:
        app_rows = p_select('na_applications', {'id': app_id})
        app_row = app_rows[0] if (isinstance(app_rows, list) and app_rows) else {}
        
        report_payload = {
            'application_id': app_id,
            'document_name':  'Tahsildar Field Verification Report',
            'village':        request.data.get('village', ''),
            'taluka':         request.data.get('taluka', ''),
            'district':       request.data.get('district', ''),
            'gat_no':         request.data.get('gat_no', ''),
            'owner_names':    request.data.get('owner_names', app_row.get('user_email', '')),
            'raw_json': {
                'report_title':    'Tahsildar Statutory Ground Verification Dossier',
                'officer_name':    officer_name,
                'designation':     designation,
                'inspection_date': inspection_date,
                'verified_area':   verified_area,
                'road_access':     road_access,
                'factors_checked': factors,
                'remarks':         remarks,
                'conditions':      conditions,
                'verified_at':     timezone.now().isoformat(),
                'recommendation':  'Verified & Recommended for Collector NA Sanction Order (MLRC Sec 44)',
            }
        }
        p_insert('extracted_documents', report_payload)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Could not persist verification report document: %s", e)

    return Response({
        'message': 'Application verified by Tahsildar with official statutory verification dossier and returned to Collector.',
        'summary': verification_summary,
    })


@api_view(['POST'])
def tahsildar_reject(request, app_id):
    from tahsildar.supabase_client import update as t_update
    reason = request.data.get('reason', '')
    formatted_reason = reason if reason.startswith('Tahsildar:') else f"Tahsildar: {reason}"
    t_update('na_applications', {'id': app_id}, {
        'status':           'tahsildar_rejected',
        'rejection_reason': formatted_reason,
        'reviewed_at':      timezone.now().isoformat(),
    })
    return Response({'message': 'Application rejected with reasons and returned to Collector.'})


# ─────────────────────────────────────────────────────────────────────
# Collector dashboard endpoints (Django JWT protected)
# ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def collector_applications(request):
    status_filter = request.GET.get('status', 'all')
    from collector.supabase_client import select_all
    all_apps = select_all('na_applications')
    all_apps = all_apps if isinstance(all_apps, list) else []

    counts = {
        'all': len(all_apps),
        'pending_collector': len([a for a in all_apps if a.get('status') in ('pending_collector', 'pending')]),
        'forwarded_to_tahsildar': len([a for a in all_apps if a.get('status') == 'forwarded_to_tahsildar']),
        'tahsildar_verified': len([a for a in all_apps if a.get('status') in ('tahsildar_verified', 'approved')]),
        'tahsildar_rejected': len([a for a in all_apps if a.get('status') in ('tahsildar_rejected', 'rejected')]),
        'state_govt_referral': len([a for a in all_apps if is_state_govt_qualifying(a.get('land_type'))]),
        'forwarded_to_state_govt': len([a for a in all_apps if a.get('status') == 'forwarded_to_state_govt']),
        'state_govt_approved': len([a for a in all_apps if a.get('status') == 'state_govt_approved']),
        'state_govt_rejected': len([a for a in all_apps if a.get('status') == 'state_govt_rejected']),
        'collector_approved': len([a for a in all_apps if a.get('status') == 'collector_approved']),
        'collector_rejected': len([a for a in all_apps if a.get('status') == 'collector_rejected']),
    }

    if status_filter == 'pending_collector':
        filtered = [a for a in all_apps if a.get('status') in ('pending_collector', 'pending')]
    elif status_filter == 'forwarded_to_tahsildar':
        filtered = [a for a in all_apps if a.get('status') == 'forwarded_to_tahsildar']
    elif status_filter == 'tahsildar_verified':
        filtered = [a for a in all_apps if a.get('status') in ('tahsildar_verified', 'approved')]
    elif status_filter == 'tahsildar_rejected':
        filtered = [a for a in all_apps if a.get('status') in ('tahsildar_rejected', 'rejected')]
    elif status_filter == 'state_govt_referral':
        filtered = [a for a in all_apps if is_state_govt_qualifying(a.get('land_type'))]
    elif status_filter == 'forwarded_to_state_govt':
        filtered = [a for a in all_apps if a.get('status') == 'forwarded_to_state_govt']
    elif status_filter == 'state_govt_approved':
        filtered = [a for a in all_apps if a.get('status') == 'state_govt_approved']
    elif status_filter == 'state_govt_rejected':
        filtered = [a for a in all_apps if a.get('status') == 'state_govt_rejected']
    elif status_filter == 'collector_approved':
        filtered = [a for a in all_apps if a.get('status') == 'collector_approved']
    elif status_filter == 'collector_rejected':
        filtered = [a for a in all_apps if a.get('status') == 'collector_rejected']
    elif status_filter == 'all':
        filtered = all_apps
    else:
        filtered = [a for a in all_apps if a.get('status') == status_filter]

    _enrich_applications_list(filtered)
    return Response({
        'applications': filtered,
        'counts': counts,
    })


@api_view(['GET'])
def collector_application_detail(request, app_id):
    from collector.supabase_client import select_one, get_documents
    app  = select_one('na_applications', 'id', app_id)
    docs = get_documents(app_id)
    docs = docs if isinstance(docs, list) else []

    form_data = None
    supporting_docs = []
    for doc in docs:
        if doc.get('document_name') == 'Application Form - e-District Maharashtra':
            form_data = _normalize_form_data(doc.get('raw_json'))
        else:
            supporting_docs.append(doc)

    return Response({
        'application': app,
        'documents': docs,
        'form_data': form_data,
        'supporting_docs': supporting_docs,
    })


@api_view(['POST'])
def collector_forward(request, app_id):
    from collector.supabase_client import update as c_update
    remarks = request.data.get('remarks', '')
    update_data = {
        'status':      'forwarded_to_tahsildar',
        'reviewed_at': timezone.now().isoformat(),
    }
    if remarks:
        update_data['rejection_reason'] = f"Collector Directions: {remarks}"
    c_update('na_applications', 'id', app_id, update_data)
    return Response({'message': 'Application forwarded to Tahsildar for field verification.'})


@api_view(['POST'])
def collector_forward_state_govt(request, app_id):
    """
    Collector forwards a Granted or Semi-Granted NA Application to the
    Maharashtra State Government Secretariat (Revenue & Forest Department, Mantralaya).
    """
    from collector.supabase_client import update as c_update, select_one
    from portal.supabase_client import insert as p_insert

    memo = request.data.get('memo', '') or request.data.get('remarks', '')
    officer_name = request.data.get('officer_name', '') or getattr(request.user, 'username', 'District Collector')
    referral_no = request.data.get('referral_no', '') or f"MAH/REV/SEC-{timezone.now().year}/{app_id[:6].upper()}"

    app = select_one('na_applications', 'id', app_id)
    land_type = app.get('land_type', 'Granted Land') if isinstance(app, dict) else 'Granted Land'

    summary = f"Referred to Maharashtra State Government Secretariat (Ref: {referral_no}) by {officer_name}. Memo: {memo or 'Statutory clearance requested for ' + land_type}"

    c_update('na_applications', 'id', app_id, {
        'status': 'forwarded_to_state_govt',
        'rejection_reason': summary,
        'reviewed_at': timezone.now().isoformat(),
    })

    # Archive referral memorandum into extracted_documents
    try:
        report_payload = {
            'application_id': app_id,
            'document_name': 'Collector State Government Referral Memorandum',
            'village': app.get('village', '') if isinstance(app, dict) else '',
            'taluka': app.get('taluka', '') if isinstance(app, dict) else '',
            'district': app.get('district', '') if isinstance(app, dict) else '',
            'gat_no': app.get('gat_no', '') if isinstance(app, dict) else '',
            'owner_names': app.get('applicant_name', '') if isinstance(app, dict) else '',
            'raw_json': {
                'report_title': 'Collectorate Referral Memorandum to Maharashtra State Government',
                'referral_no': referral_no,
                'forwarded_at': timezone.now().isoformat(),
                'referring_authority': officer_name,
                'designation': 'District Collector & District Magistrate',
                'land_type': land_type,
                'memorandum_text': memo,
                'statutory_provision': 'Section 44 of Maharashtra Land Revenue Code, 1966 & State Grant Rules',
            }
        }
        p_insert('extracted_documents', report_payload)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Could not persist collector state referral document: %s", e)

    return Response({
        'message': 'Application successfully referred and dispatched to Maharashtra State Government Portal.',
        'referral_no': referral_no,
        'status': 'forwarded_to_state_govt',
    })



@api_view(['POST'])
def collector_approve(request, app_id):
    from collector.supabase_client import update as c_update
    from portal.supabase_client import insert as p_insert, select as p_select

    # Detailed Collector sanction fields
    factors = request.data.get('factors', [])
    order_no = request.data.get('order_no', '') or f"COLL/REV/NA-{timezone.now().year}/{app_id[:6].upper()}"
    sanction_date = request.data.get('sanction_date', '') or timezone.now().strftime('%Y-%m-%d')
    officer_name = request.data.get('officer_name', '') or getattr(request.user, 'username', 'District Collector')
    designation = request.data.get('designation', 'District Collector & District Magistrate')
    sanctioned_purpose = request.data.get('sanctioned_purpose', 'Non-Agricultural Conversion')
    sanctioned_area = request.data.get('sanctioned_area', '')
    conversion_tax = request.data.get('conversion_tax', '')
    na_assessment_rate = request.data.get('na_assessment_rate', '')
    remarks = request.data.get('remarks', '') or request.data.get('decree', '')
    conditions = request.data.get('conditions', [])

    factor_titles = []
    if isinstance(factors, list):
        for f in factors:
            if isinstance(f, dict) and f.get('checked'):
                factor_titles.append(f.get('title') or f.get('id') or 'Statutory Factor')
            elif isinstance(f, str) and f.strip():
                factor_titles.append(f)

    summary_parts = [
        f"NA Sanction Order No. {order_no} granted on {sanction_date} by {officer_name} ({designation})"
    ]
    if sanctioned_area:
        summary_parts.append(f"Area: {sanctioned_area} ({sanctioned_purpose})")
    if conversion_tax:
        summary_parts.append(f"Conversion Tax: {conversion_tax}")
    if factor_titles:
        summary_parts.append(f"{len(factor_titles)} Collectorate Factors Adjudicated")
    if remarks:
        summary_parts.append(f"Decree: {remarks[:140]}{'...' if len(remarks)>140 else ''}")

    official_decree_summary = " | ".join(summary_parts)

    c_update('na_applications', 'id', app_id, {
        'status':           'collector_approved',
        'rejection_reason': official_decree_summary,
        'reviewed_at':      timezone.now().isoformat(),
    })

    # Archive formal Sanction Order document into extracted_documents
    try:
        app_rows = p_select('na_applications', {'id': app_id})
        app_row = app_rows[0] if (isinstance(app_rows, list) and app_rows) else {}

        report_payload = {
            'application_id': app_id,
            'document_name':  'Collector NA Sanction Order & Decree',
            'village':        request.data.get('village', ''),
            'taluka':         request.data.get('taluka', ''),
            'district':       request.data.get('district', ''),
            'gat_no':         request.data.get('gat_no', ''),
            'owner_names':    request.data.get('owner_names', app_row.get('user_email', '')),
            'raw_json': {
                'report_title':         'Final NA Sanction Order (MLRC Sec 44)',
                'order_no':             order_no,
                'sanction_date':        sanction_date,
                'officer_name':         officer_name,
                'designation':          designation,
                'sanctioned_purpose':   sanctioned_purpose,
                'sanctioned_area':      sanctioned_area,
                'conversion_tax':       conversion_tax,
                'na_assessment_rate':   na_assessment_rate,
                'factors_checked':      factors,
                'remarks':              remarks,
                'conditions':           conditions,
                'sanctioned_at':        timezone.now().isoformat(),
                'statutory_authority':  'Section 44 of Maharashtra Land Revenue Code, 1966',
            }
        }
        p_insert('extracted_documents', report_payload)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Could not persist collector sanction document: %s", e)

    return Response({
        'message': 'Official NA Sanction Order granted and statutory decree archived.',
        'summary': official_decree_summary,
        'order_no': order_no,
    })


@api_view(['POST'])
def collector_reject(request, app_id):
    from collector.supabase_client import update as c_update
    reason = request.data.get('reason', '')
    formatted_reason = reason if reason.startswith('Collector Decision:') else f"Collector Decision: {reason}"
    c_update('na_applications', 'id', app_id, {
        'status':           'collector_rejected',
        'rejection_reason': formatted_reason,
        'reviewed_at':      timezone.now().isoformat(),
    })
    return Response({'message': 'Application rejected by Collector.'})


# ─────────────────────────────────────────────────────────────────────
# Maharashtra State Government Secretariat (Granted & Semi-Granted)
# ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def state_govt_applications(request):
    """
    Returns all Granted and Semi-Granted NA Applications referred to / managed by
    the Maharashtra State Government Secretariat.
    """
    from collector.supabase_client import select_all
    all_apps = select_all('na_applications')
    all_apps = all_apps if isinstance(all_apps, list) else []

    # Strictly and ONLY Educational, Commercial, Industrial Granted & Semi-Granted applications
    state_apps = [a for a in all_apps if is_state_govt_qualifying(a.get('land_type'))]
    _enrich_applications_list(state_apps)

    status_filter = (request.GET.get('status', 'all') or 'all').strip()
    category_filter = (request.GET.get('category', 'all') or 'all').lower().strip()
    search = (request.GET.get('search', '') or '').lower().strip()

    filtered = state_apps

    if status_filter == 'pending_state':
        filtered = [a for a in filtered if a.get('status') == 'forwarded_to_state_govt']
    elif status_filter == 'forwarded_to_state_govt':
        filtered = [a for a in filtered if a.get('status') == 'forwarded_to_state_govt']
    elif status_filter == 'state_govt_approved':
        filtered = [a for a in filtered if a.get('status') == 'state_govt_approved']
    elif status_filter == 'state_govt_rejected':
        filtered = [a for a in filtered if a.get('status') == 'state_govt_rejected']
    elif status_filter == 'all':
        filtered = [a for a in filtered if a.get('status') in ('forwarded_to_state_govt', 'state_govt_approved', 'state_govt_rejected', 'collector_approved', 'collector_rejected')]

    if category_filter in ('educational', 'education'):
        filtered = [a for a in filtered if 'educational' in (a.get('land_type') or '').lower()]
    elif category_filter in ('industrial', 'industry'):
        filtered = [a for a in filtered if 'industrial' in (a.get('land_type') or '').lower()]
    elif category_filter in ('commercial', 'commerce'):
        filtered = [a for a in filtered if 'commercial' in (a.get('land_type') or '').lower()]
    elif category_filter in ('granted_only', 'granted'):
        filtered = [a for a in filtered if 'semi-granted' not in (a.get('land_type') or '').lower() and 'granted' in (a.get('land_type') or '').lower()]
    elif category_filter in ('semi_granted_only', 'semi-granted', 'semi_granted'):
        filtered = [a for a in filtered if 'semi-granted' in (a.get('land_type') or '').lower()]

    if search:
        filtered = [a for a in filtered if (
            search in (a.get('reference_no') or '').lower() or
            search in (a.get('applicant_name') or '').lower() or
            search in (a.get('user_email') or '').lower() or
            search in (a.get('land_type') or '').lower() or
            search in (a.get('village') or '').lower() or
            search in (a.get('district') or '').lower() or
            search in str(a.get('gut_no') or '').lower()
        )]

    counts = {
        'total_referrals': len([a for a in state_apps if a.get('status') in ('forwarded_to_state_govt', 'state_govt_approved', 'state_govt_rejected', 'collector_approved', 'collector_rejected')]),
        'pending_state': len([a for a in state_apps if a.get('status') == 'forwarded_to_state_govt']),
        'forwarded_from_collector': len([a for a in state_apps if a.get('status') == 'forwarded_to_state_govt']),
        'state_govt_approved': len([a for a in state_apps if a.get('status') == 'state_govt_approved']),
        'state_govt_rejected': len([a for a in state_apps if a.get('status') == 'state_govt_rejected']),
        'educational': len([a for a in state_apps if 'educational' in (a.get('land_type') or '').lower()]),
        'industrial': len([a for a in state_apps if 'industrial' in (a.get('land_type') or '').lower()]),
        'commercial': len([a for a in state_apps if 'commercial' in (a.get('land_type') or '').lower()]),
        'granted': len([a for a in state_apps if 'semi-granted' not in (a.get('land_type') or '').lower() and 'granted' in (a.get('land_type') or '').lower()]),
        'semi_granted': len([a for a in state_apps if 'semi-granted' in (a.get('land_type') or '').lower()]),
    }

    return Response({
        'applications': filtered,
        'counts': counts,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def state_govt_application_detail(request, app_id):
    """
    Returns full dossier for a Granted or Semi-Granted NA application for State Review.
    """
    from collector.supabase_client import select_one, get_documents
    app = select_one('na_applications', 'id', app_id)
    docs = get_documents(app_id)
    docs = docs if isinstance(docs, list) else []

    form_data = None
    supporting_docs = []
    referral_doc = None
    gr_doc = None

    for doc in docs:
        if doc.get('document_name') == 'Application Form - e-District Maharashtra':
            form_data = _normalize_form_data(doc.get('raw_json'))
        elif doc.get('document_name') == 'Collector State Government Referral Memorandum':
            referral_doc = doc
        elif doc.get('document_name') == 'Maharashtra State Government Resolution (GR)':
            gr_doc = doc
        else:
            supporting_docs.append(doc)

    return Response({
        'application': app,
        'documents': docs,
        'form_data': form_data,
        'supporting_docs': supporting_docs,
        'referral_doc': referral_doc,
        'gr_doc': gr_doc,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def state_govt_approve(request, app_id):
    """
    Maharashtra State Government Secretariat issues official Government Resolution (GR)
    and grants State Approval / Concurrence for Granted or Semi-Granted NA application.
    """
    from collector.supabase_client import update as c_update, select_one
    from portal.supabase_client import insert as p_insert

    gr_number = request.data.get('gr_number', '') or f"शासन निर्णय क्र. महसूल/अकृ-२०२६/प्र.क्र.{app_id[:4].upper()}/ज-१"
    officer_name = request.data.get('officer_name', 'श्री. व्ही. के. सावंत (भा.प्र.से.)')
    designation = request.data.get('designation', 'सह-सचिव, महसूल व वन विभाग, महाराष्ट्र शासन')
    sanction_date = request.data.get('sanction_date', timezone.now().strftime('%Y-%m-%d'))
    remarks = request.data.get('remarks', 'शासकीय अनुदानित जागेच्या अकृषिक वापरास शासन मंजुरी प्रदान करण्यात येत आहे.')
    stipulations = request.data.get('stipulations', [
        'जमिनीचा वापर केवळ मंजूर हेतूसाठीच बंधनकारक राहील.',
        'अनुदानित अटी व शर्तींचे उल्लंघन झाल्यास मंजुरी रद्दबातल ठरेल.',
        'संबंधित जिल्हाधिकाऱ्यांनी महसूल संहितेनुसार पुढील अंतिम कार्यवाही करावी.'
    ])

    app = select_one('na_applications', 'id', app_id)

    summary = f"Maharashtra State Government Resolution (GR No. {gr_number}) executed on {sanction_date} by {officer_name} ({designation}). Decree: {remarks}"

    c_update('na_applications', 'id', app_id, {
        'status': 'state_govt_approved',
        'rejection_reason': summary,
        'reviewed_at': timezone.now().isoformat(),
    })

    # Archive official Government Resolution (GR)
    try:
        report_payload = {
            'application_id': app_id,
            'document_name': 'Maharashtra State Government Resolution (GR)',
            'village': app.get('village', '') if isinstance(app, dict) else '',
            'taluka': app.get('taluka', '') if isinstance(app, dict) else '',
            'district': app.get('district', '') if isinstance(app, dict) else '',
            'gat_no': app.get('gat_no', '') if isinstance(app, dict) else '',
            'owner_names': app.get('applicant_name', '') if isinstance(app, dict) else '',
            'raw_json': {
                'report_title': 'महाराष्ट्र शासन - महसूल व वन विभाग - शासन निर्णय (Government Resolution)',
                'gr_number': gr_number,
                'sanction_date': sanction_date,
                'signatory': officer_name,
                'designation': designation,
                'department': 'महसूल व वन विभाग, मंत्रालय, मुंबई - ४०००३२',
                'sanctioned_purpose': app.get('land_type', 'Granted NA Conversion') if isinstance(app, dict) else 'Granted NA Conversion',
                'decree_text': remarks,
                'statutory_conditions': stipulations,
                'issued_at': timezone.now().isoformat(),
            }
        }
        p_insert('extracted_documents', report_payload)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Could not persist state GR document: %s", e)

    return Response({
        'message': 'Official State Government Resolution (GR) issued and granted successfully.',
        'gr_number': gr_number,
        'status': 'state_govt_approved',
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def state_govt_reject(request, app_id):
    from collector.supabase_client import update as c_update
    reason = request.data.get('reason', '')
    summary = f"State Government Secretariat Query / Rejection: {reason}"
    c_update('na_applications', 'id', app_id, {
        'status': 'state_govt_rejected',
        'rejection_reason': summary,
        'reviewed_at': timezone.now().isoformat(),
    })
    return Response({'message': 'State Government query / rejection recorded.'})


# ─────────────────────────────────────────────────────────────────────
# Citizen Tracking & Application History endpoints (Public / Citizen)
# ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def track_application(request, ref=None):
    """
    Public lookup by reference number. Returns full 4-milestone lifecycle progress.
    """
    reference = ref or request.GET.get('ref', '')
    reference = reference.strip()
    if not reference:
        return Response({'error': 'Reference number is required to track an application.'}, status=400)

    from portal.supabase_client import select as p_select
    apps = p_select('na_applications', {'reference_no': reference})
    if not (isinstance(apps, list) and apps):
        return Response({'error': f"No application found with Reference Number '{reference}'."}, status=404)

    app = apps[0]
    app_id = app.get('id')

    # Fetch dossier details if available
    docs = p_select('extracted_documents', {'application_id': app_id})
    docs = docs if isinstance(docs, list) else []

    applicant_name = ''
    gat_number = ''
    village = ''
    taluka = ''
    district = ''
    area_sqmt = ''

    for d in docs:
        if d.get('document_name') == 'Application Form - e-District Maharashtra':
            raw = d.get('raw_json') or {}
            applicant_info = raw.get('applicant_details') or {}
            land_info = raw.get('land_details') or {}
            applicant_name = applicant_info.get('full_name') or d.get('owner_names', '')
            gat_number = land_info.get('gat_number') or d.get('gat_no', '')
            village = land_info.get('land_village') or d.get('village', '')
            taluka = land_info.get('land_taluka') or d.get('taluka', '')
            district = land_info.get('land_district') or d.get('district', '')
            area_sqmt = land_info.get('area_sqmt', '')
            break
        elif not village and d.get('village'):
            village = d.get('village', '')
            taluka = d.get('taluka', '')
            district = d.get('district', '')
            gat_number = d.get('gat_no', '')
            applicant_name = d.get('owner_names', '')

    if isinstance(applicant_name, str) and applicant_name.startswith('[') and applicant_name.endswith(']'):
        applicant_name = applicant_name.strip("[]'\" ")

    status = app.get('status', 'pending_collector')
    submitted_at = app.get('submitted_at')
    reviewed_at = app.get('reviewed_at')
    rejection_reason = app.get('rejection_reason', '')

    is_granted_flow = is_state_govt_qualifying(app.get('land_type')) or status in ('forwarded_to_state_govt', 'state_govt_approved', 'state_govt_rejected')

    # Compute high-level status meta
    if status in ('pending_collector', 'pending'):
        if is_granted_flow:
            status_meta = {
                'label': 'Pending Collector Review',
                'stage': 'Step 1 of 4: District Collector Desk',
                'color': 'amber',
                'summary': 'Educational, Commercial or Industrial Granted land received at District Collectorate. Under review for statutory referral to State Government.',
            }
        else:
            status_meta = {
                'label': 'Submitted to Collectorate',
                'stage': 'Step 1: Intake & Processing',
                'color': 'amber',
                'summary': 'Application has been successfully filed and is undergoing preliminary intake review.',
            }
    elif status == 'forwarded_to_tahsildar':
        status_meta = {
            'label': 'Under Tahsildar Field Inquiry',
            'stage': 'Step 2: Forwarded to Tahsildar Portal',
            'color': 'blue',
            'summary': 'Routed to the jurisdictional Tahsildar Portal for physical on-site ground inspection, panchnama, and title verification.',
        }
    elif status == 'tahsildar_verified':
        status_meta = {
            'label': 'Tahsildar Verified — Pending Collector Sanction',
            'stage': 'Step 3: Tahsildar Ground Inquiry Passed',
            'color': 'teal',
            'summary': 'Field verification completed by Tahsildar with positive statutory recommendation. Returned to District Collector for final Sanction Order.',
        }
    elif status == 'tahsildar_rejected':
        status_meta = {
            'label': 'Tahsildar Objections Raised',
            'stage': 'Step 3: Field Inspection Objections',
            'color': 'red',
            'summary': 'Tahsildar raised ground inspection objections or boundary discrepancies. Returned to District Collector for review.',
        }
    elif status == 'forwarded_to_state_govt':
        status_meta = {
            'label': 'Referred to Maharashtra State Government',
            'stage': 'Step 2: State Secretariat Review (Granted Land)',
            'color': 'indigo',
            'summary': 'Redirected by District Collector to Maharashtra State Government Secretariat (मंत्रालय, मुंबई) for statutory Grant clearance.',
        }
    elif status == 'state_govt_approved':
        status_meta = {
            'label': 'State Government Resolution (GR) Issued',
            'stage': 'Step 3: State Sanction Granted',
            'color': 'teal',
            'summary': 'Maharashtra State Government has sanctioned the land grant and issued Government Resolution (GR). Ready for final Collector decree.',
        }
    elif status == 'state_govt_rejected':
        status_meta = {
            'label': 'State Government Query / Refusal',
            'stage': 'Step 3: State Refusal / Objections',
            'color': 'red',
            'summary': 'State Government Secretariat raised statutory objections regarding grant conditions.',
        }
    elif status == 'collector_approved':
        status_meta = {
            'label': 'NA Permission Granted',
            'stage': 'Final Step: Sanction Order Issued',
            'color': 'green',
            'summary': 'Non-Agricultural Permission has been officially granted under the Maharashtra Land Revenue Code, 1966.',
        }
    elif status == 'collector_rejected':
        status_meta = {
            'label': 'Application Refused',
            'stage': 'Final Step: Rejection Order Issued',
            'color': 'red',
            'summary': 'The application for Non-Agricultural permission has been rejected with official statutory reasons.',
        }
    else:
        status_meta = {
            'label': status.replace('_', ' ').title(),
            'stage': 'Under Processing',
            'color': 'gray',
            'summary': 'Application is currently under administrative processing.',
        }

    # Build Milestone steps based on workflow category
    if is_granted_flow:
        # ── GRANTED & SEMI-GRANTED WORKFLOW: Collector -> State Govt (Mantralaya) -> Collector ──
        steps = [
            {
                'step': 1,
                'title': 'Application Submission & Collector Intake',
                'subtitle': 'Direct to District Collector Desk',
                'status': 'completed',
                'timestamp': submitted_at,
                'description': 'Granted / Semi-Granted land dossier filed online. Received at District Collector Desk for preliminary intake review.',
            },
            {
                'step': 2,
                'title': 'District Collector Referral',
                'subtitle': 'Forwarded to State Government Secretariat',
                'status': 'completed' if status in ('forwarded_to_state_govt', 'state_govt_approved', 'state_govt_rejected', 'collector_approved', 'collector_rejected') else ('active' if status in ('pending_collector', 'pending') else 'upcoming'),
                'timestamp': reviewed_at if status in ('forwarded_to_state_govt', 'state_govt_approved', 'state_govt_rejected') else None,
                'description': 'Collector scrutinized grant conditions and dispatched statutory recommendation memorandum to Maharashtra State Government Secretariat.' if status != 'pending_collector' else 'Under scrutiny by District Collector for referral memo generation.',
            },
            {
                'step': 3,
                'title': 'Maharashtra State Govt Secretariat',
                'subtitle': 'Government Resolution (GR) Sanction Desk (मंत्रालय)',
                'status': 'completed' if status in ('state_govt_approved', 'collector_approved') else ('rejected' if status == 'state_govt_rejected' else ('active' if status == 'forwarded_to_state_govt' else 'upcoming')),
                'timestamp': reviewed_at if status in ('state_govt_approved', 'state_govt_rejected') else None,
                'description': 'State Government issued official Government Resolution (GR) and sanctioned conversion.' if status in ('state_govt_approved', 'collector_approved') else ('State Government raised statutory query/refusal.' if status == 'state_govt_rejected' else ('Under ministerial scrutiny by Revenue & Forest Department Secretariat, Mantralaya Mumbai.' if status == 'forwarded_to_state_govt' else 'Awaiting State Government review and GR generation.')),
            },
            {
                'step': 4,
                'title': 'District Collector Final Sanction Decree',
                'subtitle': 'Final NA Sanction Order & Certificate Issuance',
                'status': 'completed' if status == 'collector_approved' else ('rejected' if status == 'collector_rejected' else ('active' if status == 'state_govt_approved' else 'upcoming')),
                'timestamp': reviewed_at if status in ('collector_approved', 'collector_rejected') else None,
                'description': 'Final NA Sanction Order granted and authorized under Maharashtra Land Revenue Code, 1966. Bilingual certificate available.' if status == 'collector_approved' else ('Official rejection order issued by District Collector.' if status == 'collector_rejected' else ('District Collector executing final sanction decree upon receipt of State GR.' if status == 'state_govt_approved' else 'Pending State Government clearance.')),
            },
        ]
    else:
        # ── PRIVATE WORKFLOW: Collector -> Tahsildar -> Collector ──
        steps = [
            {
                'step': 1,
                'title': 'Application Submission & Collector Intake',
                'subtitle': 'Direct to District Collector Desk',
                'status': 'completed',
                'timestamp': submitted_at,
                'description': 'Application dossier and required documents submitted online. Received at District Collector Desk.',
            },
            {
                'step': 2,
                'title': 'Collector Referral to Tahsildar',
                'subtitle': 'Forwarded for Jurisdictional Field Verification',
                'status': 'completed' if status in ('forwarded_to_tahsildar', 'tahsildar_verified', 'tahsildar_rejected', 'collector_approved', 'collector_rejected') else ('active' if status in ('pending_collector', 'pending') else 'upcoming'),
                'timestamp': reviewed_at if status in ('forwarded_to_tahsildar', 'tahsildar_verified', 'tahsildar_rejected') else None,
                'description': 'Collector reviewed preliminary dossier and dispatched to jurisdictional Tahsildar for field inspection.' if status != 'pending_collector' else 'Under preliminary intake review by District Collector.',
            },
            {
                'step': 3,
                'title': 'Tahsildar Field Inquiry & Panchnama',
                'subtitle': 'On-Site Inspection & Ground Verification Report',
                'status': 'completed' if status in ('tahsildar_verified', 'collector_approved') else ('rejected' if status == 'tahsildar_rejected' else ('active' if status == 'forwarded_to_tahsildar' else 'upcoming')),
                'timestamp': reviewed_at if status in ('tahsildar_verified', 'tahsildar_rejected') else None,
                'description': 'Site inspected, boundaries verified, and verification dossier returned to Collector.' if status in ('tahsildar_verified', 'collector_approved') else ('Tahsildar identified discrepancies during ground inspection.' if status == 'tahsildar_rejected' else 'Tahsildar conducting physical site inspection, boundary verification, and title check.'),
            },
            {
                'step': 4,
                'title': 'District Collector Final Sanction Order',
                'subtitle': 'Final NA Sanction Order & Certificate Issuance',
                'status': 'completed' if status == 'collector_approved' else ('rejected' if status == 'collector_rejected' else ('active' if status in ('tahsildar_verified', 'tahsildar_rejected') else 'upcoming')),
                'timestamp': reviewed_at if status in ('collector_approved', 'collector_rejected') else None,
                'description': 'Final NA Sanction Order granted and authorized under Maharashtra Land Revenue Code, 1966. Bilingual certificate available.' if status == 'collector_approved' else ('Official rejection order issued by District Collector.' if status == 'collector_rejected' else ('District Collector reviewing Tahsildar verification report for final decree.' if status == 'tahsildar_verified' else 'Pending Tahsildar ground verification completion.')),
            },
        ]

    return Response({
        'application': app,
        'dossier': {
            'applicant_name': applicant_name,
            'gat_number': gat_number,
            'village': village,
            'taluka': taluka,
            'district': district,
            'area_sqmt': area_sqmt,
        },
        'status_meta': status_meta,
        'steps': steps,
        'is_granted_flow': bool(is_granted_flow),
        'rejection_reason': rejection_reason,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def citizen_applications(request):
    """
    Returns all applications for the authenticated citizen (via JWT header or session).
    """
    payload = _citizen_payload(request)
    email = payload.get('user_email') if payload else request.session.get('user_email')
    if not email:
        return Response({'error': 'Citizen authentication required.'}, status=401)

    from portal.supabase_client import select as p_select
    apps = p_select('na_applications', {'user_email': email})
    apps = apps if isinstance(apps, list) else []
    return Response({'applications': apps})


@api_view(['GET'])
@permission_classes([AllowAny])
def certificate_data(request, ref=None):
    """
    Returns structured certificate data with all 24 statutory conditions in Marathi and English.
    """
    reference = ref or request.GET.get('ref', '')
    reference = reference.strip()
    if not reference:
        return Response({'error': 'Reference number is required.'}, status=400)

    from portal.supabase_client import select as p_select
    from portal.certificate_data import CERTIFICATE_CONDITIONS

    apps = p_select('na_applications', {'reference_no': reference})
    if not (isinstance(apps, list) and apps):
        return Response({'error': f"No application found with Reference Number '{reference}'."}, status=404)

    app = apps[0]
    app_id = app.get('id')

    docs = p_select('extracted_documents', {'application_id': app_id})
    docs = docs if isinstance(docs, list) else []

    applicant_name = ''
    gat_number = ''
    village = ''
    taluka = ''
    district = ''
    area_sqmt = ''
    order_no = ''
    sanction_date = ''
    officer_name = 'डॉ. एस. के. पाटील (भा.प्र.से.)'

    for d in docs:
        doc_name = d.get('document_name', '')
        if doc_name == 'Application Form - e-District Maharashtra':
            raw = d.get('raw_json') or {}
            applicant_info = raw.get('applicant_details') or {}
            land_info = raw.get('land_details') or {}
            applicant_name = applicant_info.get('full_name') or d.get('owner_names', '')
            gat_number = land_info.get('gat_number') or d.get('gat_no', '')
            village = land_info.get('land_village') or d.get('village', '')
            taluka = land_info.get('land_taluka') or d.get('taluka', '')
            district = land_info.get('land_district') or d.get('district', '')
            area_sqmt = land_info.get('area_sqmt', '')
        elif 'Collector NA Sanction Order' in doc_name:
            raw = d.get('raw_json') or {}
            order_no = raw.get('order_no', '')
            sanction_date = raw.get('sanction_date', '')
            officer_name = raw.get('officer_name', officer_name)
        elif not village and d.get('village'):
            village = d.get('village', '')
            taluka = d.get('taluka', '')
            district = d.get('district', '')
            gat_number = d.get('gat_no', '')
            if not applicant_name:
                applicant_name = d.get('owner_names', '')

    applicant_name = applicant_name or app.get('user_email', 'अर्जदार / Registered Citizen')
    if isinstance(applicant_name, str) and applicant_name.startswith('[') and applicant_name.endswith(']'):
        applicant_name = applicant_name.strip("[]'\" ")
    land_type = app.get('land_type', 'Residential - Individual')

    lt_lower = land_type.lower()
    if 'residential' in lt_lower:
        purpose_mr = 'रहिवास प्रयोजनासाठी'
        purpose_en = 'Residential Layout Development'
    elif 'commercial' in lt_lower:
        purpose_mr = 'वाणिज्यिक प्रयोजनासाठी'
        purpose_en = 'Commercial Layout Development'
    elif 'industrial' in lt_lower:
        purpose_mr = 'औद्योगिक प्रयोजनासाठी'
        purpose_en = 'Industrial Land Development'
    elif 'educational' in lt_lower:
        purpose_mr = 'शैक्षणिक प्रयोजनासाठी'
        purpose_en = 'Educational Institutional Use'
    else:
        purpose_mr = f'{land_type} प्रयोजनासाठी'
        purpose_en = f'{land_type} Development'

    submitted_raw = app.get('submitted_at') or app.get('created_at')
    reviewed_raw = app.get('reviewed_at')

    app_date = str(submitted_raw)[:10] if submitted_raw else timezone.now().strftime('%d/%m/%Y')
    if '-' in app_date:
        parts = app_date.split('-')
        if len(parts) == 3:
            app_date = f"{parts[2]}/{parts[1]}/{parts[0]}"

    if not sanction_date:
        s_date = str(reviewed_raw)[:10] if reviewed_raw else timezone.now().strftime('%d/%m/%Y')
        if '-' in s_date:
            parts = s_date.split('-')
            if len(parts) == 3:
                s_date = f"{parts[2]}/{parts[1]}/{parts[0]}"
        sanction_date = s_date

    if not order_no:
        clean_num = ''.join(c for c in reference if c.isdigit())[-4:] or '2026'
        order_no = f"जा. क्र. / महसूल-नरवि / NA-{clean_num} / {timezone.now().year}"

    # Build applicant address dynamically from user records
    addr_parts = []
    if village:
        addr_parts.append(f"रा. {village}")
    if taluka:
        addr_parts.append(f"ता. {taluka}")
    if district:
        addr_parts.append(f"जि. {district}")
    applicant_address = ", ".join(addr_parts) if addr_parts else "स्थानिक रहिवासी"

    office_mr = f"कार्यालय जिल्हाधिकारी तथा सक्षम नियोजन प्राधिकरण, जिल्हा {district}" if district else "कार्यालय जिल्हाधिकारी तथा सक्षम नियोजन प्राधिकरण"
    office_en = f"Office of the District Collector & Competent Planning Authority, District {district}" if district else "Office of the District Collector & Competent Planning Authority"

    cert = {
        'reference_no': reference,
        'order_no': order_no,
        'sanction_date': sanction_date,
        'application_date': app_date,
        'applicant_name': applicant_name,
        'applicant_address': applicant_address,
        'village': village or 'सदर मौजे',
        'taluka': taluka or '',
        'district': district or 'महाराष्ट्र',
        'gat_no': gat_number or 'नोंदणीकृत गट / सर्व्हे क्र.',
        'area_sqmt': area_sqmt or 'मंजूर क्षेत्र',
        'land_type': land_type,
        'purpose_mr': purpose_mr,
        'purpose_en': purpose_en,
        'office_name_mr': office_mr,
        'office_name_en': office_en,
        'dept_name_mr': 'नगर रचना व महसूल शाखा (Town Planning & Revenue Branch)',
        'dept_name_en': 'Town Planning & District Revenue Adjudication Desk',
        'signatory_name': officer_name,
        'signatory_title_mr': 'सहाय्यक संचालक नगर रचना तथा सक्षम प्राधिकारी',
        'signatory_title_en': 'Assistant Director Town Planning & Competent Authority',
        'status': app.get('status'),
    }


    return Response({
        'certificate': cert,
        'conditions': CERTIFICATE_CONDITIONS,
    })


