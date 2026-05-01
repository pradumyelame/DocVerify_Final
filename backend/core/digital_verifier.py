import os
import json
import hashlib
import cv2
import requests
from PyPDF2 import PdfReader
from PIL import Image, ExifTags
from pymongo import MongoClient

AFFINDA_API_KEY = "aff_0137439bc98d9dc0ca5a1754147da4f480244450"
AFFINDA_API_URL = "https://api.affinda.com/v3/documents"

# MongoDB Configuration
MONGO_URI = "mongodb://localhost:27017/digitaldoc"
DB_NAME = "digitaldoc"

# Mock Trusted Database (Fallback)
TRUSTED_DB = [
    {
        "document_id": "DOC123",
        "name": "John Doe",
        "dob": "1990-01-01",
        "issuer": "UIDAI",
        "status": "Verified"
    },
    {
        "document_id": "CBSE456",
        "name": "Alice Smith",
        "dob": "2005-05-15",
        "issuer": "CBSE",
        "status": "Verified"
    }
]

def extract_metadata(filepath):
    metadata = {
        "creation_date": "Unknown",
        "modification_date": "Unknown",
        "software": "Unknown",
        "suspicious_edits_detected": False
    }
    ext = filepath.lower().split('.')[-1]
    
    try:
        if ext == 'pdf':
            reader = PdfReader(filepath)
            info = reader.metadata
            if info:
                metadata["creation_date"] = info.get('/CreationDate', 'Unknown')
                metadata["modification_date"] = info.get('/ModDate', 'Unknown')
                metadata["software"] = info.get('/Producer', info.get('/Creator', 'Unknown'))
                
                # Simple check for common editing software
                suspicious_tools = ['photoshop', 'illustrator', 'gimp', 'acrobat', 'pdfedit']
                for tool in suspicious_tools:
                    if tool in str(metadata["software"]).lower():
                        metadata["suspicious_edits_detected"] = True
                        
        elif ext in ['jpg', 'jpeg', 'png']:
            image = Image.open(filepath)
            exifdata = image.getexif()
            if exifdata:
                for tag_id in exifdata:
                    tag = ExifTags.TAGS.get(tag_id, tag_id)
                    data = exifdata.get(tag_id)
                    if tag == 'Software':
                        metadata["software"] = str(data)
                        suspicious_tools = ['photoshop', 'illustrator', 'gimp', 'canva']
                        for tool in suspicious_tools:
                            if tool in metadata["software"].lower():
                                metadata["suspicious_edits_detected"] = True
                    elif tag == 'DateTime':
                        metadata["modification_date"] = str(data)
                    elif tag == 'DateTimeOriginal':
                        metadata["creation_date"] = str(data)
    except Exception as e:
        print(f"Metadata extraction error: {e}")
        
    return metadata

def call_affinda_api(filepath):
    try:
        headers = {
            "Authorization": f"Bearer {AFFINDA_API_KEY}"
        }
        workspace_identifier = "VVHwKJZi"
        
        with open(filepath, 'rb') as f:
            files = {'file': (os.path.basename(filepath), f)}
            data = {}
            if workspace_identifier: data["workspace"] = workspace_identifier
            
            response = requests.post(AFFINDA_API_URL, headers=headers, files=files, data=data)
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                extracted_data = {}
                if "data" in result:
                    data_obj = result["data"]
                    for key, val in data_obj.items():
                        if isinstance(val, dict) and "raw" in val:
                            if val["raw"]: extracted_data[key] = val["raw"]
                        elif isinstance(val, list) and len(val) > 0:
                            if isinstance(val[0], dict) and "raw" in val[0]:
                                extracted_data[key] = ", ".join([v.get("raw", "") for v in val if "raw" in v])
                            else: extracted_data[key] = str(val)
                        elif isinstance(val, str) or isinstance(val, int):
                            extracted_data[key] = val
                            
                    if "name" not in extracted_data:
                        for possible_name in ["person_name", "customerName", "supplierName", "first_name", "fullName", "candidateName"]:
                            if possible_name in extracted_data:
                                extracted_data["name"] = extracted_data[possible_name]
                                break

                    extracted_data["raw_text"] = result.get("meta", {}).get("rawText", "")
                    return {"status": "success", "data": extracted_data}
            else:
                return {"status": "error", "message": f"Affinda API Error: {response.status_code}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    return {"status": "error", "message": "Unknown error"}

def generate_fingerprint(text, visual_hash):
    raw_data = f"{text}_{visual_hash}"
    return hashlib.sha256(raw_data.encode('utf-8')).hexdigest()

def check_trusted_db(extracted_data):
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        client.admin.command('ismaster')
        db = client[DB_NAME]
        collection = db.trusted_documents
        
        admin_docs = list(collection.find({"source": "Admin Upload"}))
        
        high_priority = {
            "name": ["name", "candidate_name", "full_name"],
            "percentage": ["percentage", "aggregate_percentage", "total_percentage", "percent"],
            "totalMarks": ["totalmarks", "total_marks", "marks_obtained", "marksfigures"]
        }
        secondary = {
            "result": ["result", "status", "pass_fail"]
        }

        norm_user = {k.lower().replace("_", "").replace(" ", ""): str(v).lower().replace(" ", "") for k, v in extracted_data.items()}
        
        for doc in admin_docs:
            raw_admin_data = doc.get("raw_data", {})
            # Enrich admin record on the fly for old data
            enriched_admin = enrich_extracted_data(raw_admin_data.copy())
            norm_admin = {k.lower().replace("_", "").replace(" ", ""): str(v).lower().replace(" ", "") for k, v in enriched_admin.items()}
            raw_text_admin = str(raw_admin_data.get("raw_text", "")).lower().replace(" ", "").replace("_", "")
            
            field_analysis = {}
            critical_fail = False
            critical_field = ""
            
            # 1. Check HIGH PRIORITY
            for req_field, variations in high_priority.items():
                # Find admin value
                a_val = None
                for var in variations:
                    v_norm = var.lower().replace("_", "").replace(" ", "")
                    if v_norm in norm_admin: a_val = norm_admin[v_norm]; break
                
                # Find user value
                u_val = None
                for var in variations:
                    v_norm = var.lower().replace("_", "").replace(" ", "")
                    if v_norm in norm_user: u_val = norm_user[v_norm]; break
                
                # Double-check fallback in Admin raw text
                if not a_val and u_val and u_val in raw_text_admin:
                    a_val = u_val
                
                if not u_val:
                    critical_fail = True
                    critical_field = req_field
                    field_analysis[req_field] = {"status": "Missing", "found": "NOT PRESENT", "priority": "High"}
                elif a_val and u_val and a_val == u_val:
                    field_analysis[req_field] = {"status": "Verified", "value": a_val, "priority": "High"}
                elif req_field == "name" and a_val and u_val:
                    # Lenient matching for Name: check if one is a substring of the other
                    if (a_val in u_val or u_val in a_val) and len(a_val) > 10:
                        field_analysis[req_field] = {"status": "Verified", "value": u_val, "priority": "High", "note": "Lenient Substring Match"}
                    else:
                        critical_fail = True
                        critical_field = req_field
                        field_analysis[req_field] = {"status": "Mismatch", "expected": a_val if a_val else "N/A", "found": u_val, "priority": "High"}
                else:
                    critical_fail = True
                    critical_field = req_field
                    field_analysis[req_field] = {"status": "Mismatch", "expected": a_val if a_val else "N/A", "found": u_val, "priority": "High"}

            # 2. Check SECONDARY
            secondary_matches = 0
            for req_field, variations in secondary.items():
                a_val = None
                for var in variations:
                    v_norm = var.lower().replace("_", "").replace(" ", "")
                    if v_norm in norm_admin: a_val = norm_admin[v_norm]; break
                
                u_val = None
                for var in variations:
                    v_norm = var.lower().replace("_", "").replace(" ", "")
                    if v_norm in norm_user: u_val = norm_user[v_norm]; break
                
                if a_val and u_val and a_val == u_val:
                    secondary_matches += 1
                    field_analysis[req_field] = {"status": "Verified", "value": a_val, "priority": "Secondary"}
                else:
                    field_analysis[req_field] = {"status": "Mismatch", "expected": a_val if a_val else "N/A", "found": u_val, "priority": "Secondary"}

            clean_doc = {k: v for k, v in doc.items() if k != '_id'}
            if critical_fail:
                return {"status": "Tampered", "matched_record": clean_doc, "reason": f"High Priority Mismatch: {critical_field}", "field_analysis": field_analysis}
            
            if secondary_matches == len(secondary):
                return {"status": "Verified", "matched_record": clean_doc, "field_analysis": field_analysis}
            else:
                return {"status": "Tampered", "matched_record": clean_doc, "reason": "Secondary mismatch", "field_analysis": field_analysis}

    except Exception as e: print(f"DB Error: {e}")
    return {"status": "Unverified", "matched_record": None}

def enrich_extracted_data(data):
    """
    Ensures mandatory fields are present in the data by searching raw_text 
    if the API missed them during extraction.
    """
    raw_text = str(data.get("raw_text", "")).lower()
    if not raw_text: return data

    import re
    
    # 1. Candidate Name & Mother's Name Cleaning
    mother_name = ""
    # More flexible mother's name search
    mother_match = re.search(r"mother[ 's]*name\s*[:\-]?\s*([a-z\s]+)", raw_text)
    if mother_match:
        mother_name = mother_match.group(1).strip().split('\n')[0].strip().lower()

    if not data.get("name"):
        m = re.search(r"(?:full\s*name|candidate[ 's]*name)\s*(?:\([^)]*\))?\s*[:\-]?\s*([a-z\s]+?)(?=\s*(?:mother|father|division|marks|harka|subject|code|result|aggregate)|$)", raw_text)
        if m:
            name_raw = m.group(1).strip().split('\n')[0].strip()
            # AGGRESSIVE STRIP: Remove mother's name if it appears at the end
            if mother_name:
                name_lower = name_raw.lower()
                # If name ends with mother's name or mother's name is the last word
                if name_lower.endswith(mother_name):
                    name_raw = name_raw[:-(len(mother_name))].strip()
                elif mother_name in name_lower.split()[-1]:
                    # Handle cases like "DeodasMangala"
                    last_word = name_raw.split()[-1]
                    if mother_name in last_word.lower():
                        new_last_word = re.sub(re.escape(mother_name), '', last_word, flags=re.IGNORECASE)
                        name_raw = " ".join(name_raw.split()[:-1] + [new_last_word]).strip()
            data["name"] = name_raw

    # 2. Total Marks (Numerical/Integer) Fallback
    if not data.get("totalMarks"):
        # Look for "Marks Obtained" or "{xxx+xx}"
        # We try to find the smaller number or the one with a plus sign
        m_plus = re.search(r"\{?\$?(\d{2,3})\+(\d{1,3})\}?", raw_text)
        if m_plus:
            data["totalMarks"] = str(int(m_plus.group(1)) + int(m_plus.group(2)))
        else:
            # Look for number near "obtained" or "figures"
            m = re.search(r"(?:obtained|figures|harka)\s*[:\-]?\s*\{?\$?(\d{2,3})\}?", raw_text)
            if m:
                val = m.group(1).strip()
                # If we found 650, it might be the 'Out Of' marks. Look for another one.
                if val == "650" or val == "600":
                    # Try a more specific search for the actual obtained marks
                    m2 = re.search(r"(\d{2,3})\s*/\s*(?:650|600)", raw_text)
                    if m2: data["totalMarks"] = m2.group(1)
                    else: data["totalMarks"] = val
                else:
                    data["totalMarks"] = val

    # 3. Percentage Fallback
    if not data.get("percentage"):
        m = re.search(r"(?:percentage|percent|result|percentage\s*[:\-]?)\s*(\d{1,2}\.\d{1,2})", raw_text)
        if m:
            data["percentage"] = m.group(1).strip()
            
    return data

def process_digital_document(filepath, image):
    report = {"metadata_analysis": {}, "affinda_extraction": {}, "db_verification": {}, "fingerprint": "", "decision": "PENDING", "confidence": 0.0, "explainable_reasons": []}
    score = 100.0
    meta = extract_metadata(filepath)
    report["metadata_analysis"] = meta
    if meta.get("suspicious_edits_detected"):
        score -= 30
        report["explainable_reasons"].append("Metadata Analysis: Suspicious edits.")
        
    affinda_res = call_affinda_api(filepath)
    report["affinda_extraction"] = affinda_res
    aff_data = affinda_res.get("data", {}) if affinda_res.get("status") == "success" else {}
    
    # Enrich the user's data too!
    aff_data = enrich_extracted_data(aff_data)
    
    db_res = check_trusted_db(aff_data)
    report["db_verification"] = db_res
    
    if db_res["status"] == "Verified":
        report["explainable_reasons"].append("Verification Success: All fields match original record.")
        report["decision"] = "DOCUMENT IS OKAY"
    elif db_res["status"] == "Tampered":
        report["explainable_reasons"].append(f"CRITICAL TAMPER: {db_res.get('reason')}")
        report["decision"] = "TAMPERED"
    else:
        report["explainable_reasons"].append("Trusted DB: No record found.")
        report["decision"] = "TAMPERED"
        
    report["fingerprint"] = generate_fingerprint(aff_data.get("raw_text", ""), "visual_hash")
    return report
