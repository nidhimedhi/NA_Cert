from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.views.decorators.http import require_POST
from .supabase_client import (
    select, select_all, update,
    select_with_filter, select_documents_for_application
)


def tahsildar_login(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('/tahsildar/dashboard/')
        else:
            return render(request, 'tahsildar/login.html', {
                'error': 'Invalid username or password.'
            })
    return render(request, 'tahsildar/login.html')


def tahsildar_logout(request):
    logout(request)
    return redirect('/tahsildar/login/')


@login_required(login_url='/tahsildar/login/')
def dashboard(request):
    all_apps  = select_all('na_applications')
    all_apps  = all_apps if isinstance(all_apps, list) else []

    total    = len(all_apps)
    pending  = len([a for a in all_apps if a.get('status') in ('forwarded_to_tahsildar', 'pending')])
    approved = len([a for a in all_apps if a.get('status') in ('tahsildar_verified', 'approved', 'collector_approved')])
    rejected = len([a for a in all_apps if a.get('status') in ('tahsildar_rejected', 'rejected', 'collector_rejected')])
    recent   = [a for a in all_apps if a.get('status') in ('forwarded_to_tahsildar', 'pending')][:5]

    return render(request, 'tahsildar/dashboard.html', {
        'total':    total,
        'pending':  pending,
        'approved': approved,
        'rejected': rejected,
        'recent':   recent,
    })


@login_required(login_url='/tahsildar/login/')
def upcoming(request):
    all_apps = select_all('na_applications')
    applications = [a for a in (all_apps if isinstance(all_apps, list) else []) if a.get('status') in ('forwarded_to_tahsildar', 'pending')]
    return render(request, 'tahsildar/upcoming.html', {
        'applications': applications
    })


@login_required(login_url='/tahsildar/login/')
def application_detail(request, app_id):
    # Get application
    app_result = select('na_applications', {'id': app_id})
    app = app_result[0] if isinstance(app_result, list) and app_result else None

    # Get all uploaded documents for this application
    all_documents = select_documents_for_application(app_id)
    all_documents = all_documents if isinstance(all_documents, list) else []

    form_doc = None
    supporting_docs = []
    for doc in all_documents:
        if doc.get('document_name') == 'Application Form - e-District Maharashtra':
            form_doc = doc
        else:
            supporting_docs.append(doc)

    return render(request, 'tahsildar/application_detail.html', {
        'app':       app,
        'form_doc':  form_doc,
        'form_data': form_doc.get('raw_json') if (form_doc and isinstance(form_doc.get('raw_json'), dict)) else None,
        'documents': supporting_docs,
    })


@login_required(login_url='/tahsildar/login/')
def approve_application(request, app_id):
    if request.method == 'POST':
        remarks = request.POST.get('remarks', '') or request.POST.get('notes', '')
        officer_name = request.POST.get('officer_name', '') or request.user.username
        inspection_date = request.POST.get('inspection_date', timezone.now().strftime('%Y-%m-%d'))
        factors = request.POST.getlist('factors')
        conditions = request.POST.getlist('conditions')

        summary_parts = [f"Verified by {officer_name} on {inspection_date}"]
        if factors:
            summary_parts.append(f"{len(factors)} Factors Confirmed ({', '.join(factors[:3])}{'...' if len(factors)>3 else ''})")
        if remarks:
            summary_parts.append(f"Remarks: {remarks}")
        if conditions:
            summary_parts.append(f"Conditions: {'; '.join(conditions)}")

        update('na_applications', {'id': app_id}, {
            'status':           'tahsildar_verified',
            'rejection_reason': " | ".join(summary_parts),
            'reviewed_at':      timezone.now().isoformat(),
        })
    return redirect('/tahsildar/upcoming/')


@login_required(login_url='/tahsildar/login/')
def reject_application(request, app_id):
    if request.method == 'POST':
        reason = request.POST.get('reason', '')
        update('na_applications', {'id': app_id}, {
            'status':           'tahsildar_rejected',
            'rejection_reason': f"Tahsildar: {reason}" if not reason.startswith('Tahsildar:') else reason,
            'reviewed_at':      timezone.now().isoformat(),
        })
    return redirect('/tahsildar/upcoming/')


@login_required(login_url='/tahsildar/login/')
def approved(request):
    all_apps = select_all('na_applications')
    applications = [a for a in (all_apps if isinstance(all_apps, list) else []) if a.get('status') in ('tahsildar_verified', 'approved', 'collector_approved')]
    return render(request, 'tahsildar/approved.html', {
        'applications': applications
    })


@login_required(login_url='/tahsildar/login/')
def rejected(request):
    all_apps = select_all('na_applications')
    applications = [a for a in (all_apps if isinstance(all_apps, list) else []) if a.get('status') in ('tahsildar_rejected', 'rejected', 'collector_rejected')]
    return render(request, 'tahsildar/rejected.html', {
        'applications': applications
    })
