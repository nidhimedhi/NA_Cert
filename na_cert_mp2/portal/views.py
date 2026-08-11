from django.shortcuts import render, redirect
from django.contrib.auth.hashers import make_password, check_password
from .supabase_client import select, insert, update, upload_file
from .extractor import extract_712, extract_any_pdf
import random
import re

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


def home(request):
    return render(request, 'portal/home.html')


def about(request):
    return render(request, 'portal/about.html')


def upload(request):
    return render(request, 'portal/upload.html')


def residential(request):
    return render(request, 'portal/residential.html')


def commercial(request):
    return render(request, 'portal/commercial.html')


def industrial(request):
    return render(request, 'portal/industrial.html')


def educational(request):
    return render(request, 'portal/educational.html')


def register(request):
    if request.method == "POST":
        first_name       = request.POST.get('first_name', '')
        last_name        = request.POST.get('last_name', '')
        email            = request.POST.get('email', '')
        password         = request.POST.get('password', '')
        confirm_password = request.POST.get('confirm_password', '')
        phone            = request.POST.get('phone', '')
        address          = request.POST.get('address', '')

        if password != confirm_password:
            return render(request, 'portal/register.html', {
                'error': 'Passwords do not match.'
            })

        # Check if email already exists
        existing = select('users', {'email': email})
        if existing and not isinstance(existing, dict):
            return render(request, 'portal/register.html', {
                'error': 'Email already registered. Please login.'
            })

        # Save to Supabase
        insert('users', {
            'username':   email,
            'email':      email,
            'password':   make_password(password),
            'first_name': first_name,
            'last_name':  last_name,
            'phone':      phone,
            'address':    address,
        })

        return redirect('/login/')

    return render(request, 'portal/register.html')


def login_user(request):
    if request.method == "POST":
        username = request.POST.get('username', '')
        password = request.POST.get('password', '')

        # Get user from Supabase
        result = select('users', {'username': username})

        if result and not isinstance(result, dict) and check_password(password, result[0]['password']):
            user = result[0]
            request.session['user_id']    = str(user['id'])
            request.session['user_email'] = user['email']
            request.session['user_name']  = user['first_name']
            return redirect('/')
        else:
            return render(request, 'portal/login.html', {
                'error': 'Invalid username or password.'
            })

    return render(request, 'portal/login.html')


def logout_user(request):
    request.session.flush()
    return redirect('/')


def apply_na(request):
    if request.method == 'POST':
        land_type  = request.POST.get('land_type', '').strip()
        documents  = DOCUMENTS.get(land_type, [])
        ref        = f"NA-2026-{random.randint(100000, 999999)}"
        user_email = request.session.get('user_email', 'guest@example.com')

        # Save application to Supabase
        app_result = insert('na_applications', {
            'user_email':   user_email,
            'land_type':    land_type,
            'reference_no': ref,
            'status':       'pending',
        })

        # Get application ID
        application_id = None
        if isinstance(app_result, list) and len(app_result) > 0:
            application_id = app_result[0].get('id')

        # Process each uploaded file
        for i, doc_name in enumerate(documents, start=1):
            file = request.FILES.get(f'doc_{i}')
            if file and application_id:

                # Upload to Supabase Storage
                file_extension = file.name.split('.')[-1]
                file_path = f"{application_id}/{i}_{doc_name.replace(' ', '_')}.{file_extension}"
                file_url = upload_file(file, file_path)
                file.seek(0)

                # Extract all text from every document
                general = extract_any_pdf(file)
                file.seek(0)

                # Specific 7/12 extraction
                specific = {}
                if '7/12' in doc_name or 'Satbara' in doc_name or 'Utara' in doc_name:
                    specific = extract_712(file)
                    file.seek(0)

                # Save to Supabase
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

        return render(request, 'portal/apply.html', {
            'land_type': land_type,
            'documents': documents,
            'success':   True,
            'reference': ref,
        })

    # GET
    land_type = request.GET.get('type', '').strip()
    land_type = land_type.replace('–', '-').replace('—', '-')
    land_type = re.sub(r'\s*-\s*', ' - ', land_type)
    documents = DOCUMENTS.get(land_type, [])

    return render(request, 'portal/apply.html', {
        'land_type': land_type,
        'documents': documents,
    })