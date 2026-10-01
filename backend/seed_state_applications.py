import os
import sys
import django
import uuid
from datetime import datetime, timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'na_cert_mp2.settings')
django.setup()

from portal.supabase_client import insert, select

print("Checking and seeding realistic Granted & Semi-Granted applications...")

apps_to_seed = [
    {
        "applicant_name": "Maharashtra Technical Education Society (MTES)",
        "user_email": "mtes.pune@edu.gov.in",
        "land_type": "Educational - Granted",
        "reference_no": "MAH-NA-2026-EDU-8819",
        "status": "pending_collector",
        "district": "Pune",
        "taluka": "Haveli",
        "village": "Wagholi",
        "gat_no": "142/A",
        "area": "4,500 Sq. Mt.",
        "trust_reg": "F-45892/Pune",
        "remarks": "Application filed for institutional expansion of Poly-technic College on State-aided granted land."
    },
    {
        "applicant_name": "Dr. D. Y. Patil Vidya Pratishthan",
        "user_email": "secretary.dypp@ac.in",
        "land_type": "Educational - Semi-Granted",
        "reference_no": "MAH-NA-2026-EDU-7421",
        "status": "tahsildar_verified",
        "district": "Kolhapur",
        "taluka": "Karveer",
        "village": "Uchgaon",
        "gat_no": "208/3",
        "area": "6,200 Sq. Mt.",
        "trust_reg": "E-11204/Kolhapur",
        "remarks": "Tahsildar verified site boundaries and confirmed clear title. Ready for State Government Concurrence."
    },
    {
        "applicant_name": "Maharashtra Agro-Industrial Cooperative Federation",
        "user_email": "agro.fed@maharashtra.gov.in",
        "land_type": "Industrial - Granted",
        "reference_no": "MAH-NA-2026-IND-5502",
        "status": "forwarded_to_state_govt",
        "district": "Chhatrapati Sambhajinagar",
        "taluka": "Paithan",
        "village": "Bidkin",
        "gat_no": "88/B",
        "area": "12,000 Sq. Mt.",
        "trust_reg": "MAH/AGRO/IND-2022",
        "remarks": "Collector referred file to State Secretariat for agro-cold storage conversion on state-leased granted parcel."
    },
    {
        "applicant_name": "Vidarbha Medical Research & Hospital Trust",
        "user_email": "director@vidarbharesearch.org",
        "land_type": "Commercial - Semi-Granted",
        "reference_no": "MAH-NA-2026-COM-3391",
        "status": "state_govt_approved",
        "district": "Nagpur",
        "taluka": "Nagpur Rural",
        "village": "Besa",
        "gat_no": "64/1",
        "area": "3,800 Sq. Mt.",
        "trust_reg": "F-8921/Nagpur",
        "remarks": "State Cabinet Resolution GR No. MAH-REV-GR-2026/CR-3391/J1 executed on 28-Sep-2026."
    },
    {
        "applicant_name": "Sahyadri Agro-Logistics & Trade Terminal",
        "user_email": "logistics@sahyadriagro.in",
        "land_type": "Commercial - Granted",
        "reference_no": "MAH-NA-2026-COM-1104",
        "status": "forwarded_to_state_govt",
        "district": "Nashik",
        "taluka": "Niphad",
        "village": "Pimpalgaon",
        "gat_no": "312/2",
        "area": "8,500 Sq. Mt.",
        "trust_reg": "COM-NSK-2021",
        "remarks": "Referred by Collector to State Government for cold-chain commercial terminal on granted plot."
    },
    {
        "applicant_name": "Western Maharashtra Precision Tooling Works",
        "user_email": "works@precisiontooling.co.in",
        "land_type": "Industrial - Semi-Granted",
        "reference_no": "MAH-NA-2026-IND-9920",
        "status": "pending_collector",
        "district": "Satara",
        "taluka": "Khandala",
        "village": "Shirwal",
        "gat_no": "194/1",
        "area": "5,800 Sq. Mt.",
        "trust_reg": "IND-STR-2024",
        "remarks": "Application at Collectorate awaiting state secretariat referral for precision tool manufacturing expansion."
    },
    {
        "applicant_name": "Smt. Sunita Ramesh Kulkarni",
        "user_email": "sunita.kulkarni@gmail.com",
        "land_type": "Residential - Individual",
        "reference_no": "MAH-NA-2026-RES-1011",
        "status": "forwarded_to_tahsildar",
        "district": "Pune",
        "taluka": "Haveli",
        "village": "Khed Shivapur",
        "gat_no": "55/3",
        "area": "450 Sq. Mt.",
        "trust_reg": "Individual",
        "remarks": "Routine private residential NA conversion. Dispatched directly to Tahsildar for boundary panchnama."
    }
]

for item in apps_to_seed:
    existing = select('na_applications', {'reference_no': item['reference_no']})
    if existing and isinstance(existing, list) and len(existing) > 0:
        print(f"Already exists: {item['reference_no']}")
        continue

    app_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    
    app_data = {
        "id": app_id,
        "user_email": item["user_email"],
        "land_type": item["land_type"],
        "reference_no": item["reference_no"],
        "status": item["status"],
        "submitted_at": now_iso,
        "reviewed_at": now_iso,
        "rejection_reason": item["remarks"]
    }
    
    res = insert('na_applications', app_data)
    print(f"Created application: {item['reference_no']} -> {res}")

    # Add Application Form dossier in extracted_documents
    doc_form = {
        "application_id": app_id,
        "document_name": "Application Form - e-District Maharashtra",
        "village": item["village"],
        "taluka": item["taluka"],
        "district": item["district"],
        "gat_no": item["gat_no"],
        "satbara_no": item["gat_no"],
        "owner_names": item["applicant_name"],
        "raw_json": {
            "applicant_details": {
                "full_name": item["applicant_name"],
                "mobile": "9822014589",
                "email": item["user_email"],
                "aadhaar_number": "XXXX-XXXX-4589",
                "address": f"{item['village']}, Taluka {item['taluka']}, District {item['district']}, Maharashtra",
                "organization_type": "Registered Educational / Industrial Trust",
                "trust_reg_no": item["trust_reg"]
            },
            "land_details": {
                "land_district": item["district"],
                "land_taluka": item["taluka"],
                "land_village": item["village"],
                "gat_number": item["gat_no"],
                "area_sqmt": item["area"],
                "land_occupant_class": "Class-II (State Aided / Granted Tenure)",
                "holding_tenure": "Government Leasehold & Grant-in-aid",
                "current_use": "Agricultural / Fallow Institution Ground",
                "proposed_use": f"Non-Agricultural ({item['land_type']})"
            },
            "statutory_and_proximity_clearances": {
                "regional_plan_zone": "Institutional / Industrial Growth Zone",
                "water_body_setback": "Beyond 50m statutory irrigation flood limit",
                "road_width": "18.00 Meters Public DP Road",
                "fire_safety_noc": "Clearance applied under Maharashtra Fire Act",
                "state_grant_reference": "Govt Grant Sanction G.R. No. REV-4890/LAND"
            },
            "self_declaration": {
                "accepted_terms": True,
                "verified_date": now_iso
            }
        }
    }
    insert('extracted_documents', doc_form)

    # Add statutory documents required for Granted & Semi-Granted
    statutory_docs = [
        "Town Pleasure Reservation Declaration",
        "Reservation Report (for Collector)",
        "State Government Referral (via Collector)",
        "Solving Conditions Proof - Educational Use" if "Educational" in item["land_type"] else "Solving Conditions Proof - Industrial Use",
        "Street Government Document (Collector Signed)"
    ]
    for s_doc in statutory_docs:
        insert('extracted_documents', {
            "application_id": app_id,
            "document_name": s_doc,
            "village": item["village"],
            "taluka": item["taluka"],
            "district": item["district"],
            "gat_no": item["gat_no"],
            "satbara_no": item["gat_no"],
            "owner_names": item["applicant_name"],
            "raw_json": {
                "statutory_document": s_doc,
                "verification_status": "Duly Certified by Competent Revenue Authority",
                "date_of_attestation": now_iso
            }
        })

    # If forwarded or approved, add referral memorandum or GR
    if item["status"] in ("forwarded_to_state_govt", "state_govt_approved"):
        insert('extracted_documents', {
            "application_id": app_id,
            "document_name": "Collector State Government Referral Memorandum",
            "village": item["village"],
            "taluka": item["taluka"],
            "district": item["district"],
            "gat_no": item["gat_no"],
            "owner_names": item["applicant_name"],
            "raw_json": {
                "report_title": "Collectorate Referral Memorandum to Maharashtra State Government",
                "referral_no": f"MAH/REV/SEC-2026/{item['reference_no'][-6:]}",
                "forwarded_at": now_iso,
                "referring_authority": f"Collector & District Magistrate, {item['district']}",
                "designation": "District Collector",
                "land_type": item["land_type"],
                "memorandum_text": f"Scrutinized ground verification report submitted by Tahsildar. Found in accordance with MLRC Section 44 and UDCPR 2020. Forwarded with positive recommendation to State Secretariat for Grant-in-aid concurrence.",
                "statutory_provision": "Section 44 of Maharashtra Land Revenue Code, 1966 & State Grant Rules",
            }
        })

    if item["status"] == "state_govt_approved":
        insert('extracted_documents', {
            "application_id": app_id,
            "document_name": "Maharashtra State Government Resolution (GR)",
            "village": item["village"],
            "taluka": item["taluka"],
            "district": item["district"],
            "gat_no": item["gat_no"],
            "owner_names": item["applicant_name"],
            "raw_json": {
                "report_title": "महाराष्ट्र शासन - महसूल व वन विभाग - शासन निर्णय (Government Resolution)",
                "gr_number": "शासन निर्णय क्र. महसूल/अकृ-२०२६/प्र.क्र.०८२/ज-१",
                "sanction_date": "2026-09-28",
                "signatory": "श्री. व्ही. के. सावंत (भा.प्र.से.)",
                "designation": "सह-सचिव, महसूल व वन विभाग, महाराष्ट्र शासन",
                "department": "महसूल व वन विभाग, मंत्रालय, मुंबई - ४०००३२",
                "sanctioned_purpose": item["land_type"],
                "decree_text": "महाराष्ट्र जमीन महसूल संहिता १९६६ चे कलम ४४ अन्वये मौजे बेसा, ता. नागपूर ग्रामीण येथील शासकीय अनुदानित जागेच्या अकृषिक वापरास शासन सहमती प्रदान करण्यात येत आहे.",
                "statutory_conditions": [
                    "जमिनीचा वापर केवळ वैद्यकीय संशोधन व रुग्णालय प्रयोजनासाठीच बंधनकारक राहील.",
                    "अनुदानित जागेचे कोणतेही हस्तांतरण किंवा पोटभाडेपट्टा शासन परवानगीशिवाय करता येणार नाही.",
                    "संबंधित जिल्हाधिकारी, नागपूर यांनी रूपांतर कराची वसुली करून अंतिम आदेश निर्गमित करावा."
                ],
                "issued_at": now_iso,
            }
        })

print("Seeding complete.")
