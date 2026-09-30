import os
from fpdf import FPDF
from datetime import datetime

class GovPDF(FPDF):
    def header(self):
        self.set_font("Times", "B", 18)
        self.cell(0, 10, "GOVERNMENT OF MAHARASHTRA", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Times", "B", 14)
        self.cell(0, 8, "Revenue and Forest Department", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Times", "", 12)
        self.cell(0, 6, "Mantralaya, Mumbai - 400 032", align="C", new_x="LMARGIN", new_y="NEXT")
        
        self.ln(5)
        self.set_line_width(0.5)
        self.line(20, self.get_y(), 190, self.get_y())
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("Times", "I", 10)
        self.cell(0, 10, f"Page {self.page_no()} of {{nb}}", align="C")

files = [
    {
        "filename": "circular_premium_rates.pdf",
        "title": "Revised Premium Rates for Commercial NA Conversion in Tier-2 Cities",
        "date": "12-Aug-2026",
        "type": "CIRCULAR",
        "ref": "No. LND-1026/C.R.45/J-4",
        "body": "In exercise of the powers conferred by the Maharashtra Land Revenue Code, 1966, the Government of Maharashtra hereby revises the premium rates applicable for Non-Agricultural (NA) conversion of land for commercial purposes in all Tier-2 cities across the state.\n\n1. The revised premium shall be calculated at 40% of the Ready Reckoner rate for the respective zone.\n2. This order shall come into force with immediate effect.\n3. All pending applications shall be processed as per the new rates.\n\nAll District Collectors, Tahsildars, and Sub-Divisional Officers are directed to ensure strict compliance with these revised guidelines."
    },
    {
        "filename": "notification_online_processing.pdf",
        "title": "Notification regarding mandatory online processing of NA Certificates",
        "date": "05-Jun-2026",
        "type": "NOTIFICATION",
        "ref": "No. LND-2026/C.R.12/J-1",
        "body": "As part of the Digital Maharashtra initiative and to enhance transparency and efficiency in revenue administration, it is hereby notified that the entire process of applying for, processing, and issuing Non-Agricultural (NA) Certificates shall be conducted strictly through the LandScope online portal.\n\nNo physical applications shall be accepted by any revenue office after the date of this notification.\n\nThe system features automatic integration with the Mahabhulekh database (7/12 Extract) and ensures a transparent trackable workflow."
    },
    {
        "filename": "amendments_educational_trusts.pdf",
        "title": "Amendments in the Maharashtra Land Revenue Code for Educational Trusts",
        "date": "22-Mar-2026",
        "type": "RESOLUTION",
        "ref": "No. REV-2026/C.R.88/L-3",
        "body": "The Government has considered the representations from various educational institutions regarding the difficulties faced during land conversion.\n\nAccordingly, it has been resolved to amend the guidelines under the Maharashtra Land Revenue Code, 1966.\n\nRegistered educational trusts will now benefit from an expedited process (clearance within 15 days) and a subsidized NA conversion premium rate of 15% for establishing schools and colleges in rural and semi-urban districts."
    },
    {
        "filename": "guidelines_expedited_industrial.pdf",
        "title": "Guidelines for Expedited Industrial NA Clearance",
        "date": "10-Jan-2026",
        "type": "CIRCULAR",
        "ref": "No. IND-1026/C.R.05/M-2",
        "body": "To promote industrial growth and improve the Ease of Doing Business in the state, the Department of Revenue issues the following guidelines for expedited NA clearance for industrial zones:\n\n1. Applications for industrial NA conversion located within designated MIDC areas or approved industrial parks shall be processed on a 'Deemed Approval' basis if not objected to within 30 days.\n2. All requisite NOCs (Pollution, Town Planning) must be integrated into the single-window system.\n3. Strict penalties apply for misuse of industrial NA lands for commercial or residential purposes."
    },
    {
        "filename": "mlrc_1966_updated.pdf",
        "title": "Maharashtra Land Revenue Code, 1966 (Updated 2026)",
        "date": "01-Jan-2026",
        "type": "ACT",
        "ref": "MAHARASHTRA ACT No. XLI OF 1966",
        "body": "An Act to unify and amend the law relating to land and land revenue in the State of Maharashtra.\n\nWHEREAS it is expedient to unify and amend the law relating to land and land revenue in the State of Maharashtra and to provide for matters connected therewith;\n\nIt is hereby enacted in the Seventeenth Year of the Republic of India as follows:...\n[This is a summary document. The complete codified act is maintained by the Law and Judiciary Department.]"
    },
    {
        "filename": "gunthewari_act.pdf",
        "title": "Maharashtra Gunthewari Developments Act",
        "date": "15-May-2014",
        "type": "ACT",
        "ref": "MAHARASHTRA ACT No. XXVII OF 2001",
        "body": "An Act to provide for the regularization of Gunthewari developments in the State of Maharashtra.\n\nGunthewari development means any plot formed by unauthorized subdivision of privately owned land, with or without any building.\n\nThis act lays down the procedure for declaring such areas as Gunthewari developments and the framework for regularizing them upon payment of the prescribed compounding fee and adherence to basic town planning norms."
    },
    {
        "filename": "udcpr_2020.pdf",
        "title": "Unified Comprehensive Development Control Regulations (UDCPR)",
        "date": "02-Dec-2020",
        "type": "REGULATION",
        "ref": "No. TPS-1818/CR-236/18",
        "body": "The Unified Comprehensive Development Control and Promotion Regulations (UDCPR) for Maharashtra State.\n\nThese regulations shall apply to the building activities and development works on lands within the jurisdiction of all Municipal Corporations, Municipal Councils, Nagar Panchayats, and Regional Plan areas in Maharashtra.\n\nKey provisions include Floor Space Index (FSI) regulations, marginal distances, parking norms, and special provisions for high-rise buildings."
    },
    {
        "filename": "manual_online_application.pdf",
        "title": "Step-by-step Guide for Online NA Certificate Application",
        "date": "15-Aug-2026",
        "type": "USER MANUAL",
        "ref": "LandScope Portal Documentation",
        "body": "Welcome to the LandScope portal user manual.\n\nSteps to Apply:\n1. Log in to the LandScope portal using your credentials.\n2. Navigate to 'Apply for NA'.\n3. Select your Land Type (Residential, Commercial, Industrial, etc.).\n4. Upload the required documents, including the 7/12 Extract.\n5. The system will automatically extract details using OCR.\n6. Verify the details, calculate the fee using the integrated calculator, and submit.\n7. Track your application using the provided Reference Number."
    },
    {
        "filename": "manual_712_extract.pdf",
        "title": "How to check your 7/12 Extract details online",
        "date": "20-Aug-2026",
        "type": "USER MANUAL",
        "ref": "Mahabhulekh Integration Guide",
        "body": "The 7/12 Extract (Satbara Utara) is an extract from the land register maintained by the revenue department.\n\nTo view your extract online:\n1. Visit the Mahabhulekh portal or use the integrated viewer in LandScope.\n2. Select your District, Taluka, and Village.\n3. Enter your Survey Number / Gat Number or Name.\n4. Click 'Search' to view the digitally signed 7/12 document.\n\nEnsure that the document is digitally signed before uploading it for the NA application process."
    },
    {
        "filename": "manual_fee_calculation.pdf",
        "title": "Fee Calculation Reference Manual",
        "date": "25-Aug-2026",
        "type": "USER MANUAL",
        "ref": "Finance & Revenue Dept.",
        "body": "This manual provides the formulae and reference tables for calculating the NA Conversion Premium.\n\nFormula:\nPremium = (Total Area in sq.m) x (Ready Reckoner Rate per sq.m) x (Conversion Factor)\n\nConversion Factors:\n- Residential: 15%\n- Commercial: 40%\n- Industrial: 20%\n- Educational/Charitable: 15%\n\nNote: An additional 10% surcharge is applicable for properties located within 500 meters of a National Highway."
    }
]

os.makedirs(os.path.join("portal", "static", "docs"), exist_ok=True)

for item in files:
    pdf = GovPDF()
    pdf.add_page()
    
    # Ref and Date
    pdf.set_font("Times", "", 12)
    pdf.cell(95, 10, item["ref"], align="L")
    pdf.cell(95, 10, f"Date: {item['date']}", align="R", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(10)
    
    # Type
    pdf.set_font("Times", "B", 14)
    pdf.cell(0, 10, item["type"], align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)
    
    # Title
    pdf.set_font("Times", "BU", 16)
    pdf.multi_cell(0, 10, item["title"], align="C")
    pdf.ln(10)
    
    # Body
    pdf.set_font("Times", "", 12)
    pdf.multi_cell(0, 8, item["body"])
    pdf.ln(20)
    
    # Signature block for official documents
    if item["type"] in ["CIRCULAR", "NOTIFICATION", "RESOLUTION", "ACT"]:
        pdf.set_font("Times", "I", 12)
        pdf.cell(0, 8, "By order and in the name of the Governor of Maharashtra,", align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(15)
        pdf.set_font("Times", "B", 12)
        pdf.cell(0, 8, "Principal Secretary (Revenue)", align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Times", "", 12)
        pdf.cell(0, 8, "Revenue & Forest Department", align="R", new_x="LMARGIN", new_y="NEXT")
    
    filepath = os.path.join("portal", "static", "docs", item["filename"])
    pdf.output(filepath)
    print(f"Generated Government Format PDF: {filepath}")
