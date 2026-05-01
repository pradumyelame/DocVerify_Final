import os
import json
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

from core.preprocessor import preprocess_image
from core.feature_extractor import get_extracted_features
from core.verifier import verify_document
from core.blockchain import Blockchain

app = Flask(__name__)
CORS(app)

blockchain = Blockchain()

import hashlib

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

IPFS_FOLDER = 'ipfs_storage'
os.makedirs(IPFS_FOLDER, exist_ok=True)

def mock_ipfs_upload(text):
    if not text:
        return None
    hash_key = hashlib.sha256(text.encode('utf-8')).hexdigest()
    with open(os.path.join(IPFS_FOLDER, f"{hash_key}.txt"), "w", encoding='utf-8') as f:
        f.write(text)
    return hash_key

def mock_ipfs_download(hash_key):
    try:
        with open(os.path.join(IPFS_FOLDER, f"{hash_key}.txt"), "r", encoding='utf-8') as f:
            return f.read()
    except Exception:
        return ""

USERS_FILE = 'instance/users.json'

def load_users():
    if not os.path.exists(USERS_FILE):
        return {}
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_users(users_dict):
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
    with open(USERS_FILE, 'w') as f:
        json.dump(users_dict, f, indent=4)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data or not data.get('username') or not data.get('password') or not data.get('role'):
        return jsonify({"error": "Missing credentials or role selection"}), 400
    
    username = data.get('username').lower()
    password = data.get('password')
    requested_role = data.get('role')
    
    users = load_users()
    if username not in users:
        return jsonify({"error": "User account not found."}), 404
        
    user_record = users[username]
    if user_record['password'] != password:
        return jsonify({"error": "Invalid password."}), 401
        
    if user_record['role'] != requested_role:
        return jsonify({"error": f"Access denied. Registered as '{user_record['role']}', not '{requested_role}'."}), 403
    
    return jsonify({
        "status": "success",
        "user": {
            "username": username,
            "role": user_record['role'],
            "id": hash(username) % 10000
        }
    })

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if not data or not data.get('username') or not data.get('password') or not data.get('role'):
        return jsonify({"error": "Missing information"}), 400
        
    username = data.get('username').lower()
    password = data.get('password')
    role = data.get('role')
    
    users = load_users()
    if username in users:
        return jsonify({"error": "Username already taken."}), 409
        
    users[username] = {
        "password": password,
        "role": role
    }
    save_users(users)
    
    return jsonify({"status": "success"})


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "document-verification-api"})

@app.route('/api/verify', methods=['POST'])
def verify():
    if 'document' not in request.files:
        return jsonify({"status": "error", "message": "No document uploaded"}), 400
    
    file = request.files['document']
    if file.filename == '':
        return jsonify({"status": "error", "message": "No selected file"}), 400

    try:
        techniques = json.loads(request.form.get('techniques', '["resizing", "grayscale"]'))
        feature_techniques = json.loads(request.form.get('feature_techniques', '["CNN", "SIFT", "HOG", "LBP", "ORB"]'))
    except:
        techniques = ["resizing", "grayscale"]
        feature_techniques = ["CNN", "SIFT", "HOG", "LBP", "ORB"]

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    try:
        processed_img = preprocess_image(filepath, techniques)
        
        features = get_extracted_features(processed_img, feature_techniques)
        
        role = request.form.get('role', 'user')
        extracted_text = features.get('extracted_text', '')
        ipfs_hash = mock_ipfs_upload(extracted_text)

        if role == 'admin':
            v_res = verify_document(features)
            try:
                from core.digital_verifier import call_affinda_api, enrich_extracted_data
                from pymongo import MongoClient
                import uuid
                affinda_res = call_affinda_api(filepath)
                if affinda_res.get("status") == "success":
                    data = affinda_res.get("data", {})
                    if data:
                        data = enrich_extracted_data(data)
                        client = MongoClient("mongodb://localhost:27017/digitaldoc", serverSelectionTimeoutMS=2000)
                        db = client["digitaldoc"]
                        collection = db.trusted_documents
                        record = {
                            "document_id": data.get("document_id", str(uuid.uuid4())[:8]),
                            "name": data.get("name", "Unknown Admin Document"),
                            "mothersName": data.get("mothersName", "N/A"),
                            "percentage": data.get("percentage", "N/A"),
                            "totalMarksWords": data.get("totalMarksWords", "N/A"),
                            "status": "Verified",
                            "source": "Admin Upload",
                            "raw_data": data
                        }
                        collection.insert_one(record)
            except Exception as e:
                print(f"Error: {e}")
            blockchain_record = {
                "role": "admin",
                "file": filename,
                "ipfs_hash": ipfs_hash,
                "cnn_vector_size": features.get('cnn_vector_size', 0),
                "sift_keypoints": features.get('sift_keypoints', 0),
                "image_hash": features.get('image_hash', ""),
                "spatial_hashes": features.get('spatial_hashes', []),
                "status": True
            }
            new_block = blockchain.add_block(blockchain_record)
            
            final_report = {
                **features,
                **v_res,
                "blockchain_proof": {
                    "block_index": new_block.index,
                    "block_hash": new_block.hash,
                    "timestamp": new_block.timestamp,
                    "is_valid": blockchain.is_chain_valid()
                },
                "ipfs_hash": ipfs_hash
            }
        else:
            from difflib import SequenceMatcher
            best_score = 0.0
            best_text_sim = 0.0
            best_sift_sim = 0.0
            best_image_sim = 0.0
            best_tampered_quadrants = []
            best_tamper_boxes = []
            
            current_text = features.get('extracted_text', '')
            curr_sift = features.get('sift_keypoints', 0)
            curr_hash = features.get('image_hash', '')
            
            for block in blockchain.chain:
                if isinstance(block.data, dict) and block.data.get('role') == 'admin':
                    admin_ipfs_hash = block.data.get('ipfs_hash')
                    admin_text = mock_ipfs_download(admin_ipfs_hash) if admin_ipfs_hash else ""
                    
                    import re
                    clean_curr = re.sub(r'[^A-Za-z0-9]', '', current_text).lower()
                    clean_admin = re.sub(r'[^A-Za-z0-9]', '', admin_text).lower()
                    
                    if not clean_admin and not clean_curr:
                        text_sim = 1.0
                    elif clean_admin and clean_curr:
                        sm = SequenceMatcher(None, clean_curr, clean_admin)
                        base_ratio = sm.ratio()
                        
                        matched_chars = sum(t.size for t in sm.get_matching_blocks())
                        min_len = min(len(clean_admin), len(clean_curr))
                        subset_ratio = matched_chars / min_len if min_len > 0 else 0
                        
                        text_sim = max(base_ratio, subset_ratio)
                    else:
                        text_sim = 0.0
                    
                    from core.preprocessor import preprocess_image as admin_preprocess
                    from core.feature_extractor import extract_sift_features, extract_orb_features
                    
                    admin_filename = block.data.get('file')
                    admin_filepath = os.path.join(app.config['UPLOAD_FOLDER'], admin_filename)
                    sift_sim = 0.0
                    
                    if os.path.exists(admin_filepath):
                        admin_img_dict = {"original": cv2.imread(admin_filepath)}
                        if admin_img_dict["original"] is not None:
                            admin_img_dict["gray"] = cv2.cvtColor(admin_img_dict["original"], cv2.COLOR_BGR2GRAY)
                            _, admin_descriptors = extract_sift_features(admin_img_dict["gray"])
                            
                            uploaded_descriptors = np.array(features.get('sift_descriptors', []), dtype=np.float32)
                            
                            if admin_descriptors is not None and len(uploaded_descriptors) > 0:
                                bf = cv2.BFMatcher()
                                matches = bf.knnMatch(uploaded_descriptors, admin_descriptors, k=2)
                                
                                good_matches = []
                                for m, n in matches:
                                    if m.distance < 0.75 * n.distance:
                                        good_matches.append(m)
                                
                                sift_sim = (2.0 * len(good_matches)) / (len(uploaded_descriptors) + len(admin_descriptors) + 1e-7)
                            else:
                                sift_sim = text_sim
                        else:
                            sift_sim = text_sim
                    else:
                        sift_sim = text_sim
                        
                    admin_hash = block.data.get('image_hash', '')
                    admin_spatial = block.data.get('spatial_hashes', [])
                    curr_spatial = features.get('spatial_hashes', [])
                    
                    tamper_boxes = []
                    tampered_quadrants = []
                    image_sim = 1.0
                    
                    if os.path.exists(admin_filepath):
                        admin_img = cv2.imread(admin_filepath)
                        uploaded_img = cv2.imread(filepath)
                        if admin_img is not None and uploaded_img is not None:
                            try:
                                # Advanced Feature-based alignment (Registration) using SIFT
                                sift = cv2.SIFT_create(nfeatures=2000)
                                kp1, des1 = sift.detectAndCompute(admin_img, None)
                                kp2, des2 = sift.detectAndCompute(uploaded_img, None)
                                
                                if des1 is not None and des2 is not None:
                                    # FLANN matcher
                                    FLANN_INDEX_KDTREE = 1
                                    index_params = dict(algorithm = FLANN_INDEX_KDTREE, trees = 5)
                                    search_params = dict(checks = 50)
                                    flann = cv2.FlannBasedMatcher(index_params, search_params)
                                    matches = flann.knnMatch(des1, des2, k=2)
                                    
                                    # Lowe's ratio test
                                    good_matches = []
                                    for m, n in matches:
                                        if m.distance < 0.75 * n.distance:
                                            good_matches.append(m)
                                    
                                    if len(good_matches) > 15:
                                        src_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                                        dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                                        
                                        # Use LMEDS or RANSAC. LMEDS can sometimes be more robust for documents
                                        M, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
                                        if M is not None:
                                            admin_aligned = cv2.warpPerspective(admin_img, M, (uploaded_img.shape[1], uploaded_img.shape[0]))
                                        else:
                                            admin_aligned = cv2.resize(admin_img, (uploaded_img.shape[1], uploaded_img.shape[0]))
                                    else:
                                        admin_aligned = cv2.resize(admin_img, (uploaded_img.shape[1], uploaded_img.shape[0]))
                                else:
                                    admin_aligned = cv2.resize(admin_img, (uploaded_img.shape[1], uploaded_img.shape[0]))
                            except Exception as e:
                                print(f"DEBUG: Registration failed: {e}")
                                admin_aligned = cv2.resize(admin_img, (uploaded_img.shape[1], uploaded_img.shape[0]))

                            # Difference detection
                            # 1. Blur images to mitigate sub-pixel misalignment and scanning noise
                            admin_blur = cv2.GaussianBlur(admin_aligned, (11, 11), 0)
                            uploaded_blur = cv2.GaussianBlur(uploaded_img, (11, 11), 0)
                            
                            diff = cv2.absdiff(admin_blur, uploaded_blur)
                            gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
                            
                            # 2. Adaptive thresholding or low global threshold
                            _, thresh_diff = cv2.threshold(gray_diff, 35, 255, cv2.THRESH_BINARY)
                            
                            # 3. Aggressive Morphological cleaning & grouping
                            # This merges small disconnected dots (like within a photo) into a single solid block
                            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
                            thresh_diff = cv2.morphologyEx(thresh_diff, cv2.MORPH_CLOSE, kernel)
                            thresh_diff = cv2.dilate(thresh_diff, kernel, iterations=3)
                            
                            diff_percentage = (np.sum(thresh_diff > 0) / thresh_diff.size)
                            
                            # Precision detection using contours
                            contours, _ = cv2.findContours(thresh_diff, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                            for cnt in contours:
                                if cv2.contourArea(cnt) > 800: # Focus on significant grouped changes (e.g. photos, blocks of text)
                                    x, y, w_box, h_box = cv2.boundingRect(cnt)
                                    
                                    # Add some padding to the bounding box
                                    pad = 10
                                    x = max(0, x - pad)
                                    y = max(0, y - pad)
                                    w_box = min(uploaded_img.shape[1] - x, w_box + 2*pad)
                                    h_box = min(uploaded_img.shape[0] - y, h_box + 2*pad)
                                    
                                    # Store original coordinates and dimensions
                                    tamper_boxes.append({
                                        'box': [int(x), int(y), int(w_box), int(h_box)],
                                        'orig_res': [uploaded_img.shape[1], uploaded_img.shape[0]]
                                    })

                            h_diff, w_diff = thresh_diff.shape
                            grid_size = 8
                            dh_cell = h_diff // grid_size
                            dw_cell = w_diff // grid_size
                            for r in range(grid_size):
                                for c in range(grid_size):
                                    cell_diff = thresh_diff[r*dh_cell:(r+1)*dh_cell, c*dw_cell:(c+1)*dw_cell]
                                    if np.sum(cell_diff > 0) > (cell_diff.size * 0.005):
                                        tampered_quadrants.append(r * grid_size + c)

                            abs_diff_sim = 1.0 - diff_percentage
                            image_sim = min(image_sim, abs_diff_sim)

                    if admin_spatial and curr_spatial and len(admin_spatial) == len(curr_spatial):
                        min_cell_sim = 1.0
                        for idx, (a_hash, c_hash) in enumerate(zip(admin_spatial, curr_spatial)):
                            if len(a_hash) > 0 and len(a_hash) == len(c_hash):
                                hamming = sum(c1 != c2 for c1, c2 in zip(a_hash, c_hash))
                                sim = 1.0 - (hamming / len(a_hash))
                                if sim < min_cell_sim:
                                    min_cell_sim = sim
                                if sim < 0.99:
                                    tampered_quadrants.append(idx)
                        image_sim = min(image_sim, min_cell_sim)
                    elif admin_hash and curr_hash and len(admin_hash) == len(curr_hash):
                        hamming = sum(c1 != c2 for c1, c2 in zip(admin_hash, curr_hash))
                        image_sim = min(image_sim, 1.0 - (hamming / len(admin_hash)))
                    
                    if image_sim < 0.998:
                        print(f"DEBUG: Tampering detected! Image similarity: {image_sim}")
                        image_sim = min(image_sim, 0.80)
                        
                    if text_sim > 0.50:
                        if image_sim < 0.998:
                            combined_score = image_sim * 0.50 
                        else:
                            combined_score = text_sim
                    else:
                        combined_score = (text_sim * 0.7) + (sift_sim * 0.3)
                        
                    if combined_score > best_score:
                        best_score = combined_score
                        best_text_sim = text_sim
                        best_sift_sim = sift_sim
                        best_image_sim = image_sim
                        best_tampered_quadrants = tampered_quadrants
                        best_tamper_boxes = tamper_boxes
            
            is_verified = best_score >= 0.65
            
            tamper_analysis = None
            if not is_verified:
                tamper_analysis = {
                    "algorithms_used": feature_techniques + ["OCR Similarity Matching", "Perceptual Image Hashing", "Blockchain Verification"],
                    "best_text_match": round(float(best_text_sim) * 100, 2),
                    "best_structure_match": round(float(best_sift_sim) * 100, 2),
                    "visual_similarity": round(float(best_image_sim) * 100, 2),
                    "tampered_parts": [],
                    "tampered_quadrants": locals().get('best_tampered_quadrants', []),
                    "tamper_boxes": locals().get('best_tamper_boxes', []),
                    "failure_reasons": []
                }
                
                if best_text_sim < 0.65:
                    tamper_analysis["tampered_parts"].append("Text Fields / Document Content")
                    tamper_analysis["failure_reasons"].append(f"Text similarity ({round(best_text_sim*100, 2)}%) is below acceptable threshold. Potential textual forgery.")
                if best_image_sim < 0.90 and best_text_sim >= 0.65:
                    tamper_analysis["tampered_parts"].append("Localized Image Region / Facial Area")
                    tamper_analysis["failure_reasons"].append(f"Visual discrepancy detected. Text matches but a specific corner/region structurally differs. Possible photo replacement.")
                if best_sift_sim < 0.65 and best_text_sim < 0.65:
                    tamper_analysis["tampered_parts"].append("Structural Elements / Layout / Signatures")
                    tamper_analysis["failure_reasons"].append(f"Structural matching ({round(best_sift_sim*100, 2)}%) indicates physical tampering or document replacement.")
                
                admin_docs_exist = any(isinstance(block.data, dict) and block.data.get('role') == 'admin' for block in blockchain.chain)
                if not admin_docs_exist:
                    tamper_analysis["failure_reasons"].append("No verified ground-truth documents available in the decentralized ledger to compare against.")

                if not tamper_analysis["tampered_parts"]:
                    tamper_analysis["tampered_parts"].append("Unidentified Anomalies")
                    tamper_analysis["failure_reasons"].append("Overall confidence score is too low.")
            
            final_report = {
                **features,
                "verified": is_verified,
                "similarity_score": round(float(best_score), 3),
                "confidence_percentage": round(float(best_score) * 100, 2),
                "blockchain_proof": None,
                "ipfs_hash": ipfs_hash,
                "tamper_analysis": tamper_analysis
            }

        final_img = processed_img['final']
        
        if role == 'user' and not final_report.get('verified', True):
            if len(final_img.shape) == 2:
                final_img = cv2.cvtColor(final_img, cv2.COLOR_GRAY2BGR)
            else:
                final_img = final_img.copy()
            
            h, w = final_img.shape[:2]
            color = (0, 0, 255)
            thickness = max(2, int(h * 0.005))
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = max(0.5, w * 0.001)

            tamper_data = final_report.get('tamper_analysis') or {}
            boxes = tamper_data.get('tamper_boxes', [])
            quadrants = tamper_data.get('tampered_quadrants', [])
            
            if boxes:
                for box_item in boxes:
                    # Scale coordinates from original to final_img resolution
                    orig_x, orig_y, orig_w, orig_h = box_item['box']
                    res_w, res_h = box_item['orig_res']
                    
                    x = int(orig_x * w / res_w)
                    y = int(orig_y * h / res_h)
                    w_box = int(orig_w * w / res_w)
                    h_box = int(orig_h * h / res_h)
                    
                    start_point = (x, y)
                    end_point = (x + w_box, y + h_box)
                    cv2.rectangle(final_img, start_point, end_point, color, thickness + 2)
                    
                    # Draw a semi-transparent overlay
                    overlay = final_img.copy()
                    cv2.rectangle(overlay, start_point, end_point, color, -1)
                    cv2.addWeighted(overlay, 0.3, final_img, 0.7, 0, final_img)
                    
                    # Larger label
                    cv2.putText(final_img, 'TAMPERED', (x, y - 10 if y > 30 else y + 30), font, font_scale * 0.7, color, 2)
            elif quadrants:
                num_hashes = len(features.get('spatial_hashes', []))
                grid_dim = int(np.sqrt(num_hashes)) if num_hashes > 0 else 8
                
                dh = h // grid_dim
                dw = w // grid_dim
                for idx in quadrants:
                    row = idx // grid_dim
                    col = idx % grid_dim
                    start_point = (col * dw, row * dh)
                    end_point = ((col + 1) * dw, (row + 1) * dh)
                    cv2.rectangle(final_img, start_point, end_point, color, thickness + 2)
                    
                    overlay = final_img.copy()
                    cv2.rectangle(overlay, start_point, end_point, color, -1)
                    cv2.addWeighted(overlay, 0.2, final_img, 0.8, 0, final_img)
                    
                    cv2.putText(final_img, 'TAMPERED', (col * dw + 5, row * dh + 25), font, font_scale * 0.7, color, 2)
            else:
                # Default indicator if no specific boxes found but verification failed
                cv2.rectangle(final_img, (int(w*0.05), int(h*0.05)), (int(w*0.95), int(h*0.95)), color, thickness)
                cv2.putText(final_img, 'GENERAL TAMPERING DETECTED', (int(w * 0.1), int(h * 0.5)), font, font_scale * 1.5, color, 3)

        _, buffer = cv2.imencode('.jpg', final_img)
        import base64
        encoded_image = base64.b64encode(buffer).decode('utf-8')
        final_report['processed_image_base64'] = f"data:image/jpeg;base64,{encoded_image}"

        return jsonify({
            "status": "success",
            "data": final_report
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"INTERNAL ERROR: {str(e)}"
        }), 500

@app.route('/api/blockchain', methods=['GET'])
def get_blockchain():
    chain_data = []
    for block in blockchain.chain:
        chain_data.append({
            "index": block.index,
            "timestamp": block.timestamp,
            "data": block.data,
            "previous_hash": block.previous_hash,
            "hash": block.hash
        })
    return jsonify({
        "status": "success",
        "data": chain_data,
        "is_valid": blockchain.is_chain_valid()
    })

@app.route('/api/ipfs/<hash_key>', methods=['GET'])
def get_ipfs_data(hash_key):
    text = mock_ipfs_download(hash_key)
    if text:
        return jsonify({"status": "success", "data": text})
    return jsonify({"status": "error", "message": "Not found"}), 404

from core.digital_verifier import process_digital_document

@app.route('/api/verify_digital', methods=['POST'])
def verify_digital():
    if 'document' not in request.files:
        return jsonify({"status": "error", "message": "No document uploaded"}), 400
    
    file = request.files['document']
    if file.filename == '':
        return jsonify({"status": "error", "message": "No selected file"}), 400

    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # We need OpenCV image for QR code reading
        image = cv2.imread(filepath)
        
        # Run digital verification pipeline
        report = process_digital_document(filepath, image)
        
        return jsonify({
            "status": "success",
            "data": report
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"INTERNAL ERROR: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
