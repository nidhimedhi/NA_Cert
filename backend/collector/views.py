from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from .supabase_client import (
    select_all, select_filter, select_one, update, get_documents
)


def collector_login(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect('/collector/dashboard/')
        return render(request, 'collector/login.html', {
            'error': 'Invalid username or password.'
        })
    return render(request, 'collector/login.html')


def collector_logout(request):
    logout(request)
    return redirect('/collector/login/')


@login_required(login_url='/collector/login/')
def dashboard(request):
    all_apps  = select_all('na_applications')
    all_apps  = all_apps if isinstance(all_apps, list) else []

    total        = len(all_apps)
    pending_tah  = len([a for a in all_apps if a.get('status') == 'pending'])
    approved_tah = len([a for a in all_apps if a.get('status') == 'approved'])
    col_approved = len([a for a in all_apps if a.get('status') == 'collector_approved'])
    col_rejected = len([a for a in all_apps if a.get('status') == 'collector_rejected'])
    recent       = all_apps[:5]

    return render(request, 'collector/dashboard.html', {
        'total':        total,
        'pending_tah':  pending_tah,
        'approved_tah': approved_tah,
        'col_approved': col_approved,
        'col_rejected': col_rejected,
        'recent':       recent,
    })


@login_required(login_url='/collector/login/')
def applications(request):
    # Collector sees only Tahsildar-approved applications
    apps = select_filter('na_applications', 'status', 'approved')
    apps = apps if isinstance(apps, list) else []
    return render(request, 'collector/applications.html', {
        'applications': apps
    })


@login_required(login_url='/collector/login/')
def application_detail(request, app_id):
    app  = select_one('na_applications', 'id', app_id)
    all_docs = get_documents(app_id)
    all_docs = all_docs if isinstance(all_docs, list) else []

    form_doc = None
    supporting_docs = []
    for doc in all_docs:
        if doc.get('document_name') == 'Application Form - e-District Maharashtra':
            form_doc = doc
        else:
            supporting_docs.append(doc)

    return render(request, 'collector/application_detail.html', {
        'app':       app,
        'form_doc':  form_doc,
        'form_data': form_doc.get('raw_json') if (form_doc and isinstance(form_doc.get('raw_json'), dict)) else None,
        'documents': supporting_docs,
    })


@login_required(login_url='/collector/login/')
def approve_application(request, app_id):
    if request.method == 'POST':
        remarks = request.POST.get('remarks', '') or request.POST.get('notes', '')
        officer_name = request.POST.get('officer_name', '') or request.user.username
        order_no = request.POST.get('order_no', '') or f"COLL/REV/NA-{timezone.now().year}/{app_id[:6].upper()}"
        sanction_date = request.POST.get('sanction_date', timezone.now().strftime('%Y-%m-%d'))
        factors = request.POST.getlist('factors')
        conditions = request.POST.getlist('conditions')

        summary_parts = [f"NA Sanction Order No. {order_no} issued on {sanction_date} by {officer_name}"]
        if factors:
            summary_parts.append(f"{len(factors)} Factors Adjudicated")
        if remarks:
            summary_parts.append(f"Decree: {remarks}")
        if conditions:
            summary_parts.append(f"Conditions: {'; '.join(conditions)}")

        update('na_applications', 'id', app_id, {
            'status':           'collector_approved',
            'rejection_reason': " | ".join(summary_parts),
            'reviewed_at':      timezone.now().isoformat(),
        })
    return redirect('/collector/applications/')


@login_required(login_url='/collector/login/')
def reject_application(request, app_id):
    if request.method == 'POST':
        reason = request.POST.get('reason', '')
        update('na_applications', 'id', app_id, {
            'status':           'collector_rejected',
            'rejection_reason': reason,
            'reviewed_at':      timezone.now().isoformat(),
        })
    return redirect('/collector/applications/')


@login_required(login_url='/collector/login/')
def approved(request):
    apps = select_filter('na_applications', 'status', 'collector_approved')
    apps = apps if isinstance(apps, list) else []
    return render(request, 'collector/approved.html', {
        'applications': apps
    })


@login_required(login_url='/collector/login/')
def rejected(request):
    apps = select_filter('na_applications', 'status', 'collector_rejected')
    apps = apps if isinstance(apps, list) else []
    return render(request, 'collector/approved.html', {
        'applications': apps,
        'is_rejected':  True,
    })
