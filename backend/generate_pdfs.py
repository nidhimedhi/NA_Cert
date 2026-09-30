import os

pdf_template = """%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 18 Tf
50 700 Td
({title}) Tj
/F1 12 Tf
0 -30 Td
({content1}) Tj
0 -20 Td
({content2}) Tj
0 -20 Td
({content3}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000236 00000 n 
0000000450 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
538
%%EOF
"""

files = [
    {
        "filename": "circular_premium_rates.pdf",
        "title": "Revised Premium Rates for NA Conversion",
        "content1": "Official Circular - Government of Maharashtra",
        "content2": "This document outlines the revised premium rates",
        "content3": "applicable for commercial NA conversions in Tier-2 cities."
    },
    {
        "filename": "notification_online_processing.pdf",
        "title": "Mandatory Online Processing Notification",
        "content1": "Notification No. 1234/2026",
        "content2": "Effective immediately, all NA certificate applications",
        "content3": "must be submitted and processed through the LandScope portal."
    },
    {
        "filename": "amendments_educational_trusts.pdf",
        "title": "MLRC Amendments for Educational Trusts",
        "content1": "Amendment to Maharashtra Land Revenue Code, 1966",
        "content2": "Educational trusts now benefit from an expedited process",
        "content3": "and subsidized rates for Non-Agricultural conversion."
    },
    {
        "filename": "guidelines_expedited_industrial.pdf",
        "title": "Guidelines for Expedited Industrial NA",
        "content1": "Industry Department Guidelines",
        "content2": "Special provisions have been made to fast-track",
        "content3": "NA clearance for large-scale industrial projects."
    },
    {
        "filename": "mlrc_1966_updated.pdf",
        "title": "Maharashtra Land Revenue Code, 1966",
        "content1": "Consolidated Bare Act",
        "content2": "This document contains the full text of the MLRC, 1966",
        "content3": "updated with all amendments up to the year 2026."
    },
    {
        "filename": "gunthewari_act.pdf",
        "title": "Maharashtra Gunthewari Developments Act",
        "content1": "Act for Regularization of Gunthewari Developments",
        "content2": "Provides the legal framework and procedures for",
        "content3": "regularizing unauthorized subdivisions of land."
    },
    {
        "filename": "udcpr_2020.pdf",
        "title": "UDCPR 2020",
        "content1": "Unified Comprehensive Development Control Regulations",
        "content2": "Standardized building rules and development control",
        "content3": "regulations applicable across Maharashtra."
    },
    {
        "filename": "manual_online_application.pdf",
        "title": "User Manual: Online NA Application",
        "content1": "Step-by-Step Guide",
        "content2": "Learn how to register, fill out the form, upload documents",
        "content3": "and track the status of your NA certificate application."
    },
    {
        "filename": "manual_712_extract.pdf",
        "title": "User Manual: Checking 7/12 Extract",
        "content1": "Mahabhulekh Integration Guide",
        "content2": "Instructions on how to view and verify your land records",
        "content3": "using the Mahabhulekh system integration."
    },
    {
        "filename": "manual_fee_calculation.pdf",
        "title": "Fee Calculation Reference Manual",
        "content1": "Premium and Fee Calculator",
        "content2": "Detailed examples and tables for calculating the correct",
        "content3": "premium amount based on land type and area size."
    }
]

os.makedirs(os.path.join("portal", "static", "docs"), exist_ok=True)

for item in files:
    filepath = os.path.join("portal", "static", "docs", item["filename"])
    content = pdf_template.format(
        title=item["title"],
        content1=item["content1"],
        content2=item["content2"],
        content3=item["content3"]
    )
    with open(filepath, "wb") as f:
        f.write(content.encode('utf-8'))
    print(f"Generated {filepath}")
