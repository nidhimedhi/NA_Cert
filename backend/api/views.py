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

    app_result = insert('na_applications', {
        'user_email':       user_email,
        'land_type':        land_type,
        'reference_no':     ref,
        'status':           'pending_collector',
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

    if status_filter == 'pending':
        apps = [a for a in apps if a.get('status') in ('forwarded_to_tahsildar', 'pending')]
    elif status_filter == 'approved':
        apps = [a for a in apps if a.get('status') in ('tahsildar_verified', 'approved', 'collector_approved')]
    elif status_filter == 'rejected':
        apps = [a for a in apps if a.get('status') in ('tahsildar_rejected', 'rejected', 'collector_rejected')]
    elif status_filter:
        apps = [a for a in apps if a.get('status') == status_filter]
    return Response({'applications': apps})


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
    elif status_filter == 'collector_approved':
        filtered = [a for a in all_apps if a.get('status') == 'collector_approved']
    elif status_filter == 'collector_rejected':
        filtered = [a for a in all_apps if a.get('status') == 'collector_rejected']
    elif status_filter == 'all':
        filtered = all_apps
    else:
        filtered = [a for a in all_apps if a.get('status') == status_filter]

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

    status = app.get('status', 'pending_collector')
    submitted_at = app.get('submitted_at')
    reviewed_at = app.get('reviewed_at')
    rejection_reason = app.get('rejection_reason', '')

    # Compute high-level status meta
    if status in ('pending_collector', 'pending'):
        status_meta = {
            'label': 'Submitted to Collectorate',
            'stage': 'Step 1 of 4: Received at Collectorate',
            'color': 'amber',
            'summary': 'Application has been successfully filed and is undergoing preliminary intake review at the District Collectorate.',
        }
    elif status == 'forwarded_to_tahsildar':
        status_meta = {
            'label': 'Under Tahsildar Field Inquiry',
            'stage': 'Step 2 of 4: Forwarded for Ground Inspection',
            'color': 'blue',
            'summary': 'Forwarded by District Collector to the jurisdictional Tahsildar for on-site boundary verification and title check.',
        }
    elif status == 'tahsildar_verified':
        status_meta = {
            'label': 'Tahsildar Verified — Pending Sanction',
            'stage': 'Step 3 of 4: Field Inquiry Passed',
            'color': 'teal',
            'summary': 'Field verification completed by Tahsildar with positive recommendation. Returned to District Collector for final Sanction Order.',
        }
    elif status == 'tahsildar_rejected':
        status_meta = {
            'label': 'Tahsildar Objections — Under Review',
            'stage': 'Step 3 of 4: Field Objections Raised',
            'color': 'red',
            'summary': 'Tahsildar raised ground inspection objections. Application returned to District Collector for official determination.',
        }
    elif status == 'collector_approved':
        status_meta = {
            'label': 'NA Permission Granted',
            'stage': 'Step 4 of 4: Final Sanction Order Issued',
            'color': 'green',
            'summary': 'Congratulations! Non-Agricultural Permission has been officially granted under the Maharashtra Land Revenue Code, 1966.',
        }
    elif status == 'collector_rejected':
        status_meta = {
            'label': 'Application Refused',
            'stage': 'Step 4 of 4: Final Rejection Order Issued',
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

    # Build 4 Milestone steps
    steps = [
        {
            'step': 1,
            'title': 'Application Submission',
            'subtitle': 'Citizen Filing & Collectorate Intake',
            'status': 'completed',
            'timestamp': submitted_at,
            'description': 'Application dossier and required documents filed online. Registered at District Collectorate.',
        },
        {
            'step': 2,
            'title': 'Collector Intake & Referral',
            'subtitle': 'Forwarded to Local Revenue Office',
            'status': 'completed' if status in ('forwarded_to_tahsildar', 'tahsildar_verified', 'tahsildar_rejected', 'collector_approved', 'collector_rejected') else 'active',
            'timestamp': reviewed_at if status in ('forwarded_to_tahsildar', 'tahsildar_verified', 'tahsildar_rejected', 'collector_approved', 'collector_rejected') else None,
            'description': 'Collector scrutinized documents and referred the case to the jurisdictional Tahsildar for field inspection.' if status in ('forwarded_to_tahsildar', 'tahsildar_verified', 'tahsildar_rejected', 'collector_approved', 'collector_rejected') else 'Under preliminary review by District Collectorate for dispatch to Tahsildar.',
        },
        {
            'step': 3,
            'title': 'Tahsildar Field Inquiry',
            'subtitle': 'Ground Verification & Boundary Demarcation',
            'status': 'completed' if status in ('tahsildar_verified', 'collector_approved') else ('rejected' if status == 'tahsildar_rejected' else ('active' if status == 'forwarded_to_tahsildar' else 'upcoming')),
            'timestamp': reviewed_at if status in ('tahsildar_verified', 'tahsildar_rejected') else None,
            'description': 'Site inspected, boundaries verified, and verification report submitted to Collector.' if status in ('tahsildar_verified', 'collector_approved') else ('Tahsildar identified discrepancies or statutory objections during site inspection.' if status == 'tahsildar_rejected' else ('Tahsildar conducting physical site inspection, boundary verification, and title check.' if status == 'forwarded_to_tahsildar' else 'Awaiting local site verification by Tahsildar.')),
        },
        {
            'step': 4,
            'title': 'District Collector Final Determination',
            'subtitle': 'NA Sanction Order Issuance',
            'status': 'completed' if status == 'collector_approved' else ('rejected' if status == 'collector_rejected' else ('active' if status in ('tahsildar_verified', 'tahsildar_rejected') else 'upcoming')),
            'timestamp': reviewed_at if status in ('collector_approved', 'collector_rejected') else None,
            'description': 'Final NA Sanction Order granted and authorized under Maharashtra Land Revenue Code, 1966.' if status == 'collector_approved' else ('Official rejection order issued by District Collector.' if status == 'collector_rejected' else ('Returned from Tahsildar. District Collector reviewing file for final order.' if status in ('tahsildar_verified', 'tahsildar_rejected') else 'Final order pending completion of field verification.')),
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

