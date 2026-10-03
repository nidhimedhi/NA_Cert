from django.shortcuts import render, redirect
from django.contrib.auth.hashers import make_password, check_password
from .supabase_client import select, insert, update, upload_file
from .extractor import extract_712, extract_any_pdf
from django.shortcuts import render, redirect
from django.contrib import messages
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


def resources(request):
    return render(request, 'portal/resources.html')


def resource_pdf_redirect(request, filename):
    from django.conf import settings
    from django.http import Http404, HttpResponseRedirect
    import os

    docs_dir = settings.BASE_DIR / 'portal/static/docs'
    # Direct match
    target = docs_dir / filename
    if target.is_file():
        return HttpResponseRedirect(f"{settings.STATIC_URL}docs/{filename}")
    
    # Clean and match fuzzy filename
    clean_target = filename.lower().replace('_', ' ').replace('-', ' ').strip()
    if clean_target.endswith('.pdf'):
        clean_target = clean_target[:-4].strip()

    if os.path.exists(docs_dir):
        for f in os.listdir(docs_dir):
            f_clean = f.lower().replace('_', ' ').replace('-', ' ').strip()
            if f_clean.endswith('.pdf'):
                f_clean = f_clean[:-4].strip()
            if (clean_target in f_clean or f_clean in clean_target) and f.lower().endswith('.pdf'):
                return HttpResponseRedirect(f"{settings.STATIC_URL}docs/{f}")
                
    raise Http404("Document not found.")


def contact(request):
    return render(request, 'portal/contact.html')


def upload(request):
    if not request.session.get('user_email'):
        return redirect('/login/')
    return render(request, 'portal/upload.html')


def residential(request):
    return redirect('/upload/')


def commercial(request):
    return redirect('/upload/')


def industrial(request):
    return redirect('/upload/')


def educational(request):
    return redirect('/upload/')


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
        if isinstance(existing, list) and len(existing) > 0:
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
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')

        # Get user from Supabase (by email or username)
        result = select('users', {'email': username})
        if not result or isinstance(result, dict) or len(result) == 0:
            result = select('users', {'username': username})

        if result and not isinstance(result, dict) and check_password(password, result[0]['password']):
            user = result[0]
            display_name = (user.get('first_name') or '').strip()
            if not display_name:
                display_name = (user.get('username') or '').strip()
            if not display_name:
                display_name = user.get('email', '').split('@')[0].strip()

            request.session['user_id']    = str(user['id'])
            request.session['user_email'] = user['email']
            request.session['user_name']  = display_name
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
    if not request.session.get('user_email'):
        return redirect('/login/')

    user_email = request.session.get('user_email', '')
    user_name  = request.session.get('user_name', '')

    if request.method == 'POST':
        land_type  = request.POST.get('land_type', 'Residential - Individual').strip()
        ref        = f"NA-2026-{random.randint(100000, 999999)}"

        # 1. Gather all form inputs
        application_date = request.POST.get('application_date', '').strip()
        if not application_date:
            d_digits = [request.POST.get(f'app_date_{i}', '') for i in range(8)]
            if any(d_digits):
                application_date = f"{d_digits[0]}{d_digits[1]}/{d_digits[2]}{d_digits[3]}/{d_digits[4]}{d_digits[5]}{d_digits[6]}{d_digits[7]}"

        full_name       = request.POST.get('full_name', '').strip()
        aadhaar_number  = request.POST.get('aadhaar_number', '').strip()
        gender          = request.POST.get('gender', '').strip()
        dob_day         = request.POST.get('dob_day', '').strip()
        dob_month       = request.POST.get('dob_month', '').strip()
        dob_year        = request.POST.get('dob_year', '').strip()
        dob             = f"{dob_year}-{dob_month.zfill(2)}-{dob_day.zfill(2)}" if dob_year else ''
        residence_address = request.POST.get('residence_address', '').strip()
        res_village     = request.POST.get('res_village', '').strip()
        res_taluka      = request.POST.get('res_taluka', '').strip()
        res_district    = request.POST.get('res_district', '').strip()
        res_pincode     = request.POST.get('res_pincode', '').strip()
        mobile_no       = request.POST.get('mobile_no', '').strip()
        landline        = request.POST.get('landline', '').strip()
        email           = request.POST.get('email', user_email).strip()

        # Service specific details
        assessment_type = request.POST.get('assessment_type', '').strip()
        grant_type      = request.POST.get('grant_type', '').strip()
        grant_condition = request.POST.get('grant_condition_detail', '').strip()
        holder_type     = request.POST.get('holder_type', '').strip()
        land_village    = request.POST.get('land_village', '').strip()
        land_taluka     = request.POST.get('land_taluka', '').strip()
        land_district   = request.POST.get('land_district', '').strip()
        gat_number      = request.POST.get('gat_number', '').strip()
        area_sqmt       = request.POST.get('area_sqmt', '').strip()
        assessment_rent = request.POST.get('assessment_rent', '').strip()

        # Area breakdown
        area_residential   = request.POST.get('area_residential', '').strip()
        area_industrial    = request.POST.get('area_industrial', '').strip()
        area_commercial    = request.POST.get('area_commercial', '').strip()
        area_other_purpose = request.POST.get('area_other_purpose', '').strip()

        # Planning, jurisdiction & proximity
        jurisdiction_municipal     = request.POST.get('jurisdiction_municipal', 'No')
        city_survey_done           = request.POST.get('city_survey_done', 'No')
        cantonment_jurisdiction    = request.POST.get('cantonment_jurisdiction', 'No')
        regional_plan              = request.POST.get('regional_plan', 'No')
        near_railway               = request.POST.get('near_railway', 'No')
        near_airport               = request.POST.get('near_airport', 'No')
        near_jail                  = request.POST.get('near_jail', 'No')
        near_public_office         = request.POST.get('near_public_office', 'No')
        near_cemetery              = request.POST.get('near_cemetery', 'No')
        distance_from_proposed_land = request.POST.get('distance_from_proposed_land', '').strip()
        near_ht_line               = request.POST.get('near_ht_line', 'No')
        ht_line_distance           = request.POST.get('ht_line_distance', '').strip()
        land_under_acquisition     = request.POST.get('land_under_acquisition', 'No')
        present_land_use           = request.POST.get('present_land_use', '').strip()
        approach_road_provision    = request.POST.get('approach_road_provision', '').strip()
        prior_application_submitted = request.POST.get('prior_application_submitted', 'No')
        prior_rejection_reason     = request.POST.get('prior_rejection_reason', '').strip()

        # Declaration & signature
        decl_name           = request.POST.get('decl_name', full_name).strip()
        decl_parent_name    = request.POST.get('decl_parent_name', '').strip()
        decl_age            = request.POST.get('decl_age', '').strip()
        decl_occupation     = request.POST.get('decl_occupation', '').strip()
        decl_resident_of    = request.POST.get('decl_resident_of', '').strip()
        decl_place          = request.POST.get('decl_place', '').strip()
        decl_date           = request.POST.get('decl_date', '').strip()
        decl_applicant_name = request.POST.get('decl_applicant_name', full_name).strip()
        signature_data      = request.POST.get('signature_data', '').strip()

        # Documents attached checkboxes
        docs_checked = {
            'Site report (7/12 & mutation)': bool(request.POST.get('check_site_report')),
            'Certified copy of record of rights': bool(request.POST.get('check_record_of_rights')),
            'Proposed building & site layout drawing': bool(request.POST.get('check_site_layout')),
            'PWD NOC': bool(request.POST.get('check_noc_pwd')),
            'Approach road owner NOC': bool(request.POST.get('check_noc_owner')),
            'Tenant/occupant consent': bool(request.POST.get('check_tenant_consent')),
            'Urban Ceiling Act NOC': bool(request.POST.get('check_urban_ceiling_noc')),
        }

        # Cost Component & Payment Details
        total_amount       = request.POST.get('total_amount', '').strip()
        gov_app_fee        = request.POST.get('gov_app_fee', '').strip()
        conversion_premium = request.POST.get('conversion_premium', '').strip()
        survey_charges     = request.POST.get('survey_charges', '').strip()
        utr_number         = request.POST.get('utr_number', '').strip()
        premium_rule       = request.POST.get('premium_rule', '').strip()
        area_calc          = request.POST.get('area_calc', area_sqmt).strip()
        rr_rate            = request.POST.get('rr_rate', '').strip()
        market_val         = request.POST.get('market_val', '').strip()

        fee_summary = f"Statutory Fee: {total_amount} Paid via UPI (UTR: {utr_number or 'Pending'})" if total_amount else None

        # 2. Insert Application Record into Supabase na_applications
        app_result = insert('na_applications', {
            'user_email':       user_email,
            'land_type':        land_type,
            'reference_no':     ref,
            'status':           'pending_collector',
            'rejection_reason': fee_summary,
        })

        application_id = None
        if isinstance(app_result, list) and len(app_result) > 0:
            application_id = app_result[0].get('id')

        # 3. Insert Comprehensive Application Form into extracted_documents
        service_specific_data = {
            'assessment_type': assessment_type,
            'grant_type': grant_type,
            'grant_condition_detail': grant_condition,
            'holder_type': holder_type,
            'land_village': land_village,
            'land_taluka': land_taluka,
            'land_district': land_district,
            'gat_number': gat_number,
            'area_sqmt': area_sqmt,
            'assessment_rent': assessment_rent,
            'area_residential': area_residential,
            'area_industrial': area_industrial,
            'area_commercial': area_commercial,
            'area_other_purpose': area_other_purpose,
        }

        form_payload = {
            'application_date': application_date,
            'applicant_details': {
                'full_name': full_name,
                'aadhaar_number': aadhaar_number,
                'gender': gender,
                'dob': dob,
                'residence_address': residence_address,
                'village': res_village,
                'taluka': res_taluka,
                'district': res_district,
                'pincode': res_pincode,
                'res_village': res_village,
                'res_taluka': res_taluka,
                'res_district': res_district,
                'res_pincode': res_pincode,
                'mobile_no': mobile_no,
                'landline': landline,
                'email': email,
            },
            'service_specific_details': service_specific_data,
            'land_details': service_specific_data,
            'statutory_and_proximity_clearances': {
                'jurisdiction_municipal': jurisdiction_municipal,
                'city_survey_done': city_survey_done,
                'cantonment_jurisdiction': cantonment_jurisdiction,
                'regional_plan': regional_plan,
                'near_railway': near_railway,
                'near_airport': near_airport,
                'near_jail': near_jail,
                'near_public_office': near_public_office,
                'near_cemetery': near_cemetery,
                'distance_from_proposed_land': distance_from_proposed_land,
                'near_ht_line': near_ht_line,
                'ht_line_distance': ht_line_distance,
                'land_under_acquisition': land_under_acquisition,
                'present_land_use': present_land_use,
                'approach_road_provision': approach_road_provision,
                'prior_application_submitted': prior_application_submitted,
                'prior_rejection_reason': prior_rejection_reason,
            },
            'self_declaration': {
                'name': decl_name,
                'parent_name': decl_parent_name,
                'age': decl_age,
                'occupation': decl_occupation,
                'resident_of': decl_resident_of,
                'place': decl_place,
                'date': decl_date,
                'applicant_name': decl_applicant_name,
                'signature_data': signature_data,
            },
            'attached_documents_checklist': docs_checked,
        }

        if application_id:
            insert('extracted_documents', {
                'application_id': application_id,
                'document_name':  'Application Form - e-District Maharashtra',
                'file_url':       '',
                'village':        land_village,
                'taluka':         land_taluka,
                'district':       land_district,
                'gat_no':         gat_number,
                'owner_names':    full_name,
                'satbara_no':     aadhaar_number or ref,
                'raw_json':       form_payload,
            })

            # Archive Statutory Fee Assessment & Payment Challan
            if total_amount:
                from django.utils import timezone
                insert('extracted_documents', {
                    'application_id': application_id,
                    'document_name':  'Statutory Fee Assessment & Payment Challan',
                    'file_url':       '',
                    'village':        land_village,
                    'taluka':         land_taluka,
                    'district':       land_district,
                    'gat_no':         gat_number,
                    'owner_names':    full_name,
                    'satbara_no':     ref,
                    'raw_json': {
                        'challan_title':        'Statutory NA Fee Assessment & Payment Challan',
                        'reference_no':         ref,
                        'applicant_name':       full_name,
                        'land_type':            land_type,
                        'total_amount':         total_amount,
                        'gov_app_fee':          gov_app_fee,
                        'conversion_premium':   conversion_premium,
                        'survey_charges':       survey_charges,
                        'premium_rule':         premium_rule,
                        'area_sqmt':            area_calc,
                        'rr_rate':              rr_rate,
                        'market_value':         market_val,
                        'utr_number':           utr_number,
                        'payment_mode':         'Google Pay / UPI',
                        'payee_upi':            'rajnandinijoshi402@okhdfcbank',
                        'payment_status':       'VERIFIED & PAID' if utr_number else 'PENDING',
                        'paid_at':              timezone.now().isoformat(),
                    }
                })

            # 4. Handle file uploads for attached documents
            upload_configs = [
                ('doc_site_report', 'Site report including 7/12 Extract and mutation entries'),
                ('doc_record_of_rights', 'Certified copy of record of rights'),
                ('doc_site_layout', 'Proposed building and site layout drawing'),
                ('doc_noc_pwd', 'No objection Certificate (NOC) from PWD'),
                ('doc_noc_owner', 'NOC from other land owner for approach road'),
                ('doc_tenant_consent', 'Written consent of tenant/superior holder/occupant'),
                ('doc_urban_ceiling_noc', 'Urban Ceiling Act 1976 NOC'),
            ]

            for field_name, doc_label in upload_configs:
                file = request.FILES.get(field_name)
                if file:
                    ext = file.name.split('.')[-1]
                    safe_label = re.sub(r'[^a-zA-Z0-9_-]', '_', doc_label)[:40]
                    file_path = f"{application_id}/{safe_label}.{ext}"
                    file_url = upload_file(file, file_path)
                    file.seek(0)

                    general = extract_any_pdf(file)
                    file.seek(0)

                    specific = {}
                    if '7/12' in doc_label or 'mutation' in doc_label:
                        specific = extract_712(file)
                        file.seek(0)

                    insert('extracted_documents', {
                        'application_id': application_id,
                        'document_name':  doc_label,
                        'file_url':       file_url or '',
                        'village':        specific.get('village', land_village),
                        'taluka':         specific.get('taluka', land_taluka),
                        'district':       specific.get('district', land_district),
                        'gat_no':         specific.get('gat_no', gat_number),
                        'owner_names':    str(specific.get('owner_names', [full_name])),
                        'satbara_no':     specific.get('satbara_no', ''),
                        'raw_json': {
                            'language':        specific.get('language', ''),
                            'khata_no':        specific.get('khata_no', ''),
                            'total_area':      specific.get('total_area', area_sqmt),
                            'assessment':      specific.get('assessment', assessment_rent),
                            'raw_text':        general.get('raw_text', ''),
                            'key_value_pairs': general.get('key_value_pairs', {}),
                        },
                    })

            # Extra uploaded files
            extra_files = request.FILES.getlist('doc_extra_files')
            for idx, extra_file in enumerate(extra_files, start=1):
                ext = extra_file.name.split('.')[-1]
                safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', extra_file.name)[:40]
                file_path = f"{application_id}/extra_{idx}_{safe_name}.{ext}"
                file_url = upload_file(extra_file, file_path)
                extra_file.seek(0)
                general = extract_any_pdf(extra_file)
                extra_file.seek(0)

                insert('extracted_documents', {
                    'application_id': application_id,
                    'document_name':  f'Additional Document: {extra_file.name}',
                    'file_url':       file_url or '',
                    'village':        land_village,
                    'taluka':         land_taluka,
                    'district':       land_district,
                    'gat_no':         gat_number,
                    'owner_names':    full_name,
                    'satbara_no':     '',
                    'raw_json': {
                        'raw_text': general.get('raw_text', ''),
                        'key_value_pairs': general.get('key_value_pairs', {}),
                    }
                })

        return render(request, 'portal/apply.html', {
            'land_type':          land_type,
            'success':            True,
            'reference':          ref,
            'applicant_name':     full_name,
            'total_amount':       total_amount,
            'gov_app_fee':        gov_app_fee,
            'conversion_premium': conversion_premium,
            'survey_charges':     survey_charges,
            'utr_number':         utr_number,
            'premium_rule':       premium_rule,
        })

    # GET
    from django.utils import timezone
    now_dt = timezone.now()
    date_digits = list(now_dt.strftime('%d%m%Y'))
    today_formatted = now_dt.strftime('%d/%m/%Y')

    land_type = request.GET.get('type', 'Residential - Individual').strip()
    land_type = land_type.replace('–', '-').replace('—', '-')
    land_type = re.sub(r'\s*-\s*', ' - ', land_type)
    if not land_type:
        land_type = 'Residential - Individual'
    documents = DOCUMENTS.get(land_type, [])

    return render(request, 'portal/apply.html', {
        'land_type':       land_type,
        'documents':       documents,
        'user_email':      user_email,
        'user_name':       user_name,
        'date_digits':     date_digits,
        'today_formatted': today_formatted,
    })


def track_view(request):
    user_email = request.session.get('user_email', '')
    user_name = request.session.get('user_name', '')
    query_ref = request.GET.get('ref', '').strip()

    app = None
    dossier = {}
    steps = []
    status_meta = None
    error = None
    user_apps = []

    if user_email:
        user_apps = select('na_applications', {'user_email': user_email})
        user_apps = user_apps if isinstance(user_apps, list) else []

    if query_ref:
        apps = select('na_applications', {'reference_no': query_ref})
        if isinstance(apps, list) and apps:
            app = apps[0]
            app_id = app.get('id')
            docs = select('extracted_documents', {'application_id': app_id})
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

            dossier = {
                'applicant_name': applicant_name,
                'gat_number': gat_number,
                'village': village,
                'taluka': taluka,
                'district': district,
                'area_sqmt': area_sqmt,
            }

            status = app.get('status', 'pending_collector')
            submitted_at = app.get('submitted_at')
            reviewed_at = app.get('reviewed_at')

            if status in ('pending_collector', 'pending'):
                status_meta = {
                    'label': 'Submitted to Collectorate',
                    'stage': 'Step 1 of 4: Received at Collectorate',
                    'badge_class': 'status-pending_collector',
                    'summary': 'Application has been successfully filed and is undergoing preliminary intake review at the District Collectorate.',
                }
            elif status == 'forwarded_to_tahsildar':
                status_meta = {
                    'label': 'Under Tahsildar Field Inquiry',
                    'stage': 'Step 2 of 4: Forwarded for Ground Inspection',
                    'badge_class': 'status-forwarded_to_tahsildar',
                    'summary': 'Forwarded by District Collector to the jurisdictional Tahsildar for on-site boundary verification and title check.',
                }
            elif status == 'tahsildar_verified':
                status_meta = {
                    'label': 'Tahsildar Verified — Pending Sanction',
                    'stage': 'Step 3 of 4: Field Inquiry Passed',
                    'badge_class': 'status-tahsildar_verified',
                    'summary': 'Field verification completed by Tahsildar with positive recommendation. Returned to District Collector for final Sanction Order.',
                }
            elif status == 'tahsildar_rejected':
                status_meta = {
                    'label': 'Tahsildar Objections — Under Review',
                    'stage': 'Step 3 of 4: Field Objections Raised',
                    'badge_class': 'status-tahsildar_rejected',
                    'summary': 'Tahsildar raised ground inspection objections. Application returned to District Collector for official determination.',
                }
            elif status == 'collector_approved':
                status_meta = {
                    'label': 'NA Permission Granted',
                    'stage': 'Step 4 of 4: Final Sanction Order Issued',
                    'badge_class': 'status-collector_approved',
                    'summary': 'Congratulations! Non-Agricultural Permission has been officially granted under the Maharashtra Land Revenue Code, 1966.',
                }
            elif status == 'collector_rejected':
                status_meta = {
                    'label': 'Application Refused',
                    'stage': 'Step 4 of 4: Final Rejection Order Issued',
                    'badge_class': 'status-collector_rejected',
                    'summary': 'The application for Non-Agricultural permission has been rejected with official statutory reasons.',
                }
            else:
                status_meta = {
                    'label': status.replace('_', ' ').title(),
                    'stage': 'Under Processing',
                    'badge_class': 'status-pending',
                    'summary': 'Application is currently under administrative processing.',
                }

            steps = [
                {
                    'step': 1,
                    'title': 'Application Submission',
                    'subtitle': 'Citizen Filing & Collectorate Intake',
                    'status': 'completed',
                    'timestamp': submitted_at,
                    'desc': 'Application dossier and required documents filed online. Registered at District Collectorate.',
                },
                {
                    'step': 2,
                    'title': 'Collector Intake & Referral',
                    'subtitle': 'Forwarded to Local Revenue Office',
                    'status': 'completed' if status in ('forwarded_to_tahsildar', 'tahsildar_verified', 'tahsildar_rejected', 'collector_approved', 'collector_rejected') else 'active',
                    'timestamp': reviewed_at if status in ('forwarded_to_tahsildar', 'tahsildar_verified', 'tahsildar_rejected', 'collector_approved', 'collector_rejected') else None,
                    'desc': 'Collector scrutinized documents and referred the case to the jurisdictional Tahsildar for field inspection.' if status in ('forwarded_to_tahsildar', 'tahsildar_verified', 'tahsildar_rejected', 'collector_approved', 'collector_rejected') else 'Under preliminary review by District Collectorate for dispatch to Tahsildar.',
                },
                {
                    'step': 3,
                    'title': 'Tahsildar Field Inquiry',
                    'subtitle': 'Ground Verification & Boundary Demarcation',
                    'status': 'completed' if status in ('tahsildar_verified', 'collector_approved') else ('rejected' if status == 'tahsildar_rejected' else ('active' if status == 'forwarded_to_tahsildar' else 'upcoming')),
                    'timestamp': reviewed_at if status in ('tahsildar_verified', 'tahsildar_rejected') else None,
                    'desc': 'Site inspected, boundaries verified, and verification report submitted to Collector.' if status in ('tahsildar_verified', 'collector_approved') else ('Tahsildar identified discrepancies or statutory objections during site inspection.' if status == 'tahsildar_rejected' else ('Tahsildar conducting physical site inspection, boundary verification, and title check.' if status == 'forwarded_to_tahsildar' else 'Awaiting local site verification by Tahsildar.')),
                },
                {
                    'step': 4,
                    'title': 'District Collector Final Determination',
                    'subtitle': 'NA Sanction Order Issuance',
                    'status': 'completed' if status == 'collector_approved' else ('rejected' if status == 'collector_rejected' else ('active' if status in ('tahsildar_verified', 'tahsildar_rejected') else 'upcoming')),
                    'timestamp': reviewed_at if status in ('collector_approved', 'collector_rejected') else None,
                    'desc': 'Final NA Sanction Order granted and authorized under Maharashtra Land Revenue Code, 1966.' if status == 'collector_approved' else ('Official rejection order issued by District Collector.' if status == 'collector_rejected' else ('Returned from Tahsildar. District Collector reviewing file for final order.' if status in ('tahsildar_verified', 'tahsildar_rejected') else 'Final order pending completion of field verification.')),
                },
            ]
        else:
            error = f"No application found with Reference Number '{query_ref}'."

    return render(request, 'portal/track.html', {
        'user_email': user_email,
        'user_name': user_name,
        'query_ref': query_ref,
        'app': app,
        'dossier': dossier,
        'status_meta': status_meta,
        'steps': steps,
        'error': error,
        'user_apps': user_apps,
    })
