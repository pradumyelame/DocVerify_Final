import React, { useState, useCallback } from 'react';
import './DocumentLinkChecker.css';
import { useAuth } from '../context/AuthContext';
import {
    UploadCloud, Loader2, CheckCircle2, XCircle,
    Building2, LinkIcon, Trash2, History,
    ShieldCheck, AlertTriangle, RotateCcw, File
} from 'lucide-react';

/* ─── DRAG & DROP UPLOAD ZONE ──────────────────────────────── */
const UploadArea = ({ onFile }) => {
    const [dragging, setDragging] = useState(false);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
    }, [onFile]);

    const handleChange = (e) => {
        if (e.target.files[0]) onFile(e.target.files[0]);
    };

    return (
        <div
            className={`dlc-upload-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
        >
            <input type="file" accept="image/*,.pdf" onChange={handleChange} id="dlc-file-input" />
            <label htmlFor="dlc-file-input" className="dlc-upload-label">
                <div className="dlc-upload-icon">
                    <UploadCloud size={48} />
                </div>
                <h3>Upload Your Document</h3>
                <p>Drag & drop or <span className="dlc-browse-link">browse</span> to check where it's linked</p>
                <span className="dlc-file-types">Supports: JPG, PNG, PDF</span>
            </label>
        </div>
    );
};

/* ─── PROCESSING STATE ──────────────────────────────────────── */
const ProcessingState = ({ fileName }) => (
    <div className="dlc-processing fade-in">
        <div className="dlc-scan-ring">
            <div className="dlc-scan-pulse" />
            <File size={40} className="dlc-file-icon" />
        </div>
        <h3>Computing Document Hash…</h3>
        <p className="dlc-processing-file">{fileName}</p>
        <div className="dlc-steps">
            {[
                'Computing SHA-256 fingerprint…',
                'Looking up hash in master registry…',
                'Fetching linked banks & services…'
            ].map((s, i) => (
                <div key={i} className="dlc-step">
                    <Loader2 size={14} className="animate-spin" />
                    <span>{s}</span>
                </div>
            ))}
        </div>
    </div>
);

/* ─── RESULT: LINKED SERVICES PANEL ────────────────────────── */
const LinkedPanel = ({ result, userId, onReset }) => {
    const { document_type, linked_services = [] } = result;
    const [localLinked] = useState(linked_services);
    const [showHistory, setShowHistory] = useState(false);
    const [logs, setLogs] = useState([]);

    const fetchLogs = async () => {
        if (!showHistory && userId) {
            try {
                const res = await fetch(`http://localhost:5000/api/user/activity-logs/${userId}`);
                const data = await res.json();
                if (data.status === 'success') setLogs(data.data);
            } catch { /* silent */ }
        }
        setShowHistory(p => !p);
    };

    return (
        <div className="dlc-result fade-in">
            {/* ── Header Banner ── */}
            <div className="dlc-result-banner">
                <div className="dlc-banner-icon">
                    <ShieldCheck size={28} />
                </div>
                <div>
                    <h3 className="dlc-banner-title">Document Recognized ✅</h3>
                    <p className="dlc-banner-sub">
                        Your <strong>{document_type?.name}</strong> matched an admin-registered master document and is mapped to active services.
                    </p>
                </div>
            </div>

            {/* ── Active Links ── */}
            <div className="dlc-section">
                <div className="dlc-section-header">
                    <LinkIcon size={18} />
                    <span>Active Links ({localLinked.length})</span>
                </div>

                {localLinked.length > 0 ? (
                    <div className="dlc-services-grid">
                        {localLinked.map(s => (
                            <div key={s.id} className="dlc-service-card linked">
                                <div className="dlc-service-info">
                                    <Building2 size={22} className="dlc-service-icon" />
                                    <div>
                                        <strong>{s.name}</strong>
                                        <span className="dlc-service-status">✅ Active</span>
                                    </div>
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>Verified Link</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="dlc-empty">
                        <CheckCircle2 size={20} />
                        <span>This document is not currently linked to any services.</span>
                    </div>
                )}
            </div>

            {/* ── Activity Log ── */}
            <div className="dlc-history">
                <button className="dlc-history-btn" onClick={fetchLogs}>
                    <History size={16} />
                    {showHistory ? 'Hide Activity Log' : 'View Activity Log'}
                </button>
                {showHistory && (
                    <div className="dlc-logs fade-in">
                        {logs.length > 0 ? logs.map((log, i) => (
                            <div key={i} className="dlc-log-row">
                                <span className={`dlc-log-badge ${log.action}`}>{log.action.toUpperCase()}</span>
                                <span className="dlc-log-detail">Service Ref: {log.details?.service_id}</span>
                            </div>
                        )) : (
                            <p className="dlc-logs-empty">No activity recorded yet.</p>
                        )}
                    </div>
                )}
            </div>

            {/* ── Reset Button ── */}
            <button className="dlc-reset-btn" onClick={onReset}>
                <RotateCcw size={16} /> Check Another Document
            </button>
        </div>
    );
};

/* ─── RESULT: NOT FOUND ─────────────────────────────────────── */
const NotFoundPanel = ({ onReset }) => (
    <div className="dlc-notfound fade-in">
        <div className="dlc-notfound-icon">
            <XCircle size={56} />
        </div>
        <h3>Document Not Recognized</h3>
        <p>This document doesn't match any registered master document or has not been linked to any bank or service.</p>
        <ul className="dlc-notfound-tips">
            <li>Ensure the admin has uploaded and linked this document type.</li>
            <li>Try uploading a clearer scan or photo.</li>
            <li>Make sure the document is the same type that was registered.</li>
        </ul>
        <button className="dlc-reset-btn" onClick={onReset}>
            <RotateCcw size={16} /> Try Another Document
        </button>
    </div>
);

/* ─── MAIN COMPONENT ────────────────────────────────────────── */
const DocumentLinkChecker = () => {
    const { user } = useAuth();
    const [step, setStep] = useState('UPLOAD'); // UPLOAD | PROCESSING | LINKED | NOTFOUND
    const [result, setResult] = useState(null);
    const [fileName, setFileName] = useState('');

    const handleFile = async (file) => {
        setFileName(file.name);
        setStep('PROCESSING');

        const formData = new FormData();
        formData.append('document', file);
        if (user?.id) formData.append('user_id', user.id);

        try {
            // ── Hash-based lookup: fast & deterministic ──
            const res = await fetch('http://localhost:5000/api/user/verify-by-hash', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.status === 'success' && data.found) {
                setResult(data);
                setStep('LINKED');
            } else {
                setStep('NOTFOUND');
            }
        } catch {
            setStep('NOTFOUND');
        }
    };

    const reset = () => {
        setStep('UPLOAD');
        setResult(null);
        setFileName('');
    };

    return (
        <div className="dlc-container">
            {step === 'UPLOAD' && <UploadArea onFile={handleFile} />}
            {step === 'PROCESSING' && <ProcessingState fileName={fileName} />}
            {step === 'LINKED' && result && (
                <LinkedPanel
                    result={result}
                    userId={user?.id}
                    onReset={reset}
                />
            )}
            {step === 'NOTFOUND' && <NotFoundPanel onReset={reset} />}
        </div>
    );
};

export default DocumentLinkChecker;
