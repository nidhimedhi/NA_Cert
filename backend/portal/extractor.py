import pdfplumber
import re


def extract_any_pdf(pdf_file):
    """Extract all raw text from any PDF"""
    try:
        all_text = ""
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    all_text += page_text + "\n"

        key_value_pairs = {}
        for line in all_text.split('\n'):
            line = line.strip()
            if not line:
                continue
            match = re.match(r'^(.{2,60}?)\s*[:]\s*(.+)$', line)
            if match:
                key   = match.group(1).strip()
                value = match.group(2).strip()
                if key and value:
                    key_value_pairs[key] = value

        return {
            "success":         True,
            "raw_text":        all_text.strip(),
            "key_value_pairs": key_value_pairs,
        }
    except Exception as e:
        return {
            "success":         False,
            "error":           str(e),
            "raw_text":        "",
            "key_value_pairs": {},
        }


def extract_712_english(text):
    """
    Extract from English 7/12 PDF.
    Tested and verified on actual Maharashtra government English 7/12 PDF.
    """
    result = {}

    # Village and village code
    m = re.search(r'Village[:\s-]+([A-Za-z]+)\s*\(\s*(\d+)\s*\)', text)
    if m:
        result['village']      = m.group(1).strip()
        result['village_code'] = m.group(2).strip()
    else:
        result['village']      = ""
        result['village_code'] = ""

    # Taluka
    m = re.search(r'Taluka[:\s-]+([A-Za-z]+)', text)
    result['taluka'] = m.group(1).strip() if m else ""

    # District
    m = re.search(r'District[:\s-]+([A-Za-z]+)', text)
    result['district'] = m.group(1).strip() if m else ""

    # PU-ID
    m = re.search(r'PU-ID\s*:(\d+)', text)
    result['pu_id'] = m.group(1).strip() if m else ""

    # Gat/Group number
    m = re.search(r'Group number and subdivision\s+(\d+)', text)
    result['gat_no'] = m.group(1).strip() if m else ""

    # Khata number
    m = re.search(r'(\d{3})\s+Shridhar', text)
    if not m:
        m = re.search(r'account\s+(\d{3})\s', text)
    result['khata_no'] = m.group(1).strip() if m else ""

    # Owner names before (501)
    names = re.findall(r'([A-Za-z][A-Za-z\s]+?)\s*\(\s*501\s*\)', text)
    result['owner_names'] = [n.strip() for n in names if n.strip()]

    # Satbara number (16 digits)
    m = re.search(r'use this number\s+(\d{16})', text)
    if not m:
        m = re.search(r'(\d{16})', text)
    result['satbara_no'] = m.group(1) if m else ""

    # Total area
    m = re.search(r'Total area\s+([\d.]+)', text)
    result['total_area'] = m.group(1) if m else ""

    # Cultivable area
    m = re.search(r'A\)\s*Cultivable\s+([\d.]+)', text)
    result['cultivable_area'] = m.group(1) if m else ""

    # Assessment/Charged
    m = re.search(r'Charged\s+([\d.]+)', text)
    result['assessment'] = m.group(1) if m else ""

    # Last mutation number
    m = re.search(r'Last modification number:\s*(\d+)', text)
    result['last_mutation'] = m.group(1) if m else ""

    # Mutation date
    m = re.search(r'Date:(\d{2}/\d{2}/\d{4})', text)
    result['mutation_date'] = m.group(1) if m else ""

    # Download date
    m = re.search(r'7/12 Download Date:\s*([\d\-]+:\s*[\d:]+\s*(?:AM|PM)?)', text)
    result['download_date'] = m.group(1).strip() if m else ""

    # Crop records
    crop_records = []
    lines = text.split('\n')
    for line in lines:
        cm = re.match(
            r'(\d{4}-\d{2,4})\s+(Kharif|Rabi)\s+(\d+\*?)\s*(.*)',
            line.strip()
        )
        if cm:
            rest = cm.group(4).strip()
            parts = rest.split()
            crop_type = ""
            crop_name = ""
            area      = ""
            if parts:
                if parts[0] in ['Carefree', 'Current']:
                    crop_type = ' '.join(parts[:2]) if len(parts) > 1 and parts[1] == 'Fallow' else parts[0]
                    remaining = parts[2:] if len(parts) > 2 and parts[1] == 'Fallow' else parts[1:]
                    if remaining:
                        try:
                            float(remaining[0])
                            area = remaining[0]
                        except:
                            crop_name = remaining[0]
                            if len(remaining) > 1:
                                area = remaining[1]
                else:
                    crop_type = parts[0]
                    if len(parts) > 1:
                        try:
                            float(parts[1])
                            area = parts[1]
                        except:
                            crop_name = parts[1]
                            if len(parts) > 2:
                                area = parts[2]
            crop_records.append({
                "year":   cm.group(1),
                "season": cm.group(2),
                "khata":  cm.group(3),
                "type":   crop_type,
                "name":   crop_name,
                "area":   area,
            })
    result['crop_records'] = crop_records

    return result


def extract_712_marathi(text):
    """
    Extract from Marathi 7/12 PDF.
    Handles \x00 encoding issues in Maharashtra government Marathi PDFs.
    """
    result = {}

    # Village and village code — गाव :- बळसड ( 545947 )
    m = re.search(r'गाव\s*:-\s*([^\s(]+)\s*\(\s*(\d+)\s*\)', text)
    if m:
        result['village']      = m.group(1).strip()
        result['village_code'] = m.group(2).strip()
    else:
        result['village']      = ""
        result['village_code'] = ""

    # Taluka — तालुका :- \x00ह\x00गोली (strip \x00)
    m = re.search(r'तालुका\s*:-\s*([^\n]+?)(?:\s+\x00जल्हा|\s+जल्हा|$)', text)
    if m:
        result['taluka'] = re.sub(r'\x00', '', m.group(1)).strip()
    else:
        result['taluka'] = ""

    # District — \x00जल्हा:- \x00ह\x00गोली
    m = re.search(r'(?:\x00)?जल्हा\s*:-\s*([^\n]+)', text)
    if m:
        result['district'] = re.sub(r'\x00', '', m.group(1)).strip()
    else:
        result['district'] = ""

    # PU-ID
    m = re.search(r'PU-ID\s*:(\d+)', text)
    result['pu_id'] = m.group(1).strip() if m else ""

    # Gat number — गट मांक व उ\x00पवभाग 86
    m = re.search(r'गट मांक व उ\x00पवभाग\s+(\d+)', text)
    if not m:
        m = re.search(r'गट मांक[^\d]*(\d+)', text)
    result['gat_no'] = m.group(1).strip() if m else ""

    # Khata number
    m = re.search(r'(\d{3})\s+(?:\x00ीधर|\x00ीराम)', text)
    if not m:
        m = re.search(r'खाते\s*\.\s+(\d+)', text)
    result['khata_no'] = m.group(1).strip() if m else ""

    # Owner names before ( 501 ) — clean \x00 from names
    names = re.findall(r'([\u0900-\u097F\x00a-zA-Z\s]{3,40}?)\s*\(\s*501\s*\)', text)
    cleaned = []
    for n in names:
        n = re.sub(r'\x00', '', n).strip()
        if len(n) > 2:
            cleaned.append(n)
    result['owner_names'] = cleaned

    # Satbara number (16 digits)
    m = re.search(r'(\d{16})', text)
    result['satbara_no'] = m.group(1) if m else ""

    # Total area — एकुण \x00ेत्र (अ+ब)
    m = re.search(r'एकुण\s+(?:\x00ेत्र\s+)?\(अ\+ब\)\s*[\n\s-]+([\d.]+)', text)
    if not m:
        m = re.search(r'एकुण\s+\x00ेत्र\s+([\d.]+)', text)
    result['total_area'] = m.group(1) if m else ""

    # Cultivable area — िजरायत
    m = re.search(r'िजरायत\s+([\d.]+)', text)
    result['cultivable_area'] = m.group(1) if m else ""

    # Assessment — आकारणी
    m = re.search(r'आकारणी\s*\n\s*([\d.]+)', text)
    result['assessment'] = m.group(1) if m else ""

    # Last mutation number
    m = re.search(r'फेरफार मांक\s*:\s*(\d+)', text)
    result['last_mutation'] = m.group(1) if m else ""

    # Mutation date
    m = re.search(r'(\d{2}/\d{2}/\d{4})', text)
    result['mutation_date'] = m.group(1) if m else ""

    # Download date
    m = re.search(r'डाउनलोड\s+\x00दनांक\.\s*:\s*([\d\-]+\s*:\s*[\d:]+\s*(?:PM|AM)?)', text)
    result['download_date'] = m.group(1).strip() if m else ""

    # Crop records
    crop_records = []
    lines = text.split('\n')
    for line in lines:
        cm = re.match(r'(\d{4}-\d{2,4})\s+(खरीप|रबी)\s+(\d+\*?)\s*(.*)', line.strip())
        if cm:
            rest  = cm.group(4).strip()
            parts = rest.split()
            crop_type = parts[0] if parts else ""
            crop_name = parts[1] if len(parts) > 1 else ""
            area      = parts[2] if len(parts) > 2 else ""
            crop_records.append({
                "year":   cm.group(1),
                "season": cm.group(2),
                "khata":  cm.group(3),
                "type":   crop_type,
                "name":   crop_name,
                "area":   area,
            })
    result['crop_records'] = crop_records

    return result


def is_marathi(text):
    """Auto detect if PDF is Marathi or English"""
    devanagari = len(re.findall(r'[\u0900-\u097F]', text))
    english    = len(re.findall(r'[A-Za-z]', text))
    return devanagari > english


def extract_712(pdf_file):
    """
    Main function.
    Auto detects language and extracts all fields from 7/12 PDF.
    Works for both English and Marathi Maharashtra government 7/12 PDFs.
    """
    try:
        raw_text = ""
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    raw_text += page_text + "\n"

        if not raw_text.strip():
            return {
                "success":  False,
                "error":    "No text could be extracted from PDF",
                "raw_text": ""
            }

        if is_marathi(raw_text):
            extracted = extract_712_marathi(raw_text)
            language  = "Marathi"
        else:
            extracted = extract_712_english(raw_text)
            language  = "English"

        return {
            "success":  True,
            "language": language,
            "raw_text": raw_text.strip(),
            **extracted
        }

    except Exception as e:
        return {
            "success":  False,
            "error":    str(e),
            "raw_text": ""
        }