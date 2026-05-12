import React, { useState, useEffect } from 'react';
import {
    Plus, Trash2, Link as LinkIcon, Upload, Check, X,
    FileText, Building2, Pencil, Save, Users, AlertTriangle,
    ChevronDown, ChevronUp, RefreshCw, CheckCircle2, AlertCircle,
    LayoutDashboard, Settings, Layers
} from 'lucide-react';

const API = 'http://localhost:5000/api';

const AdminManagement = () => {
    const [activeTab, setActiveTab] = useState('DOC_TYPES');
    const [docTypes, setDocTypes] = useState([]);
    const [services, setServices] = useState([]);
    const [masterDocs, setMasterDocs] = useState([]);

    // Form states
    const [newDocType, setNewDocType] = useState({ name: '', description: '' });
    const [newService, setNewService] = useState({ name: '' });
    const [masterForm, setMasterForm] = useState({ doc_type_id: '', file: null, linked_service_ids: [] });

    // Edit state for master docs
    const [editingId, setEditingId] = useState(null);
    const [editServices, setEditServices] = useState([]);

    // Unlink stats per doc
    const [unlinkStats, setUnlinkStats] = useState({});    // { docId: { total, service_unlink_counts } }
    const [expandedDoc, setExpandedDoc] = useState(null);

    // Notifications
    const [toast, setToast] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchData = async () => {
        try {
            const [dtRes, sRes, mdRes] = await Promise.all([
                fetch(`${API}/admin/document-types`),
                fetch(`${API}/admin/services`),
                fetch(`${API}/admin/master-documents`)
            ]);
            const [dt, s, md] = await Promise.all([dtRes.json(), sRes.json(), mdRes.json()]);
            if (dt.status === 'success') setDocTypes(dt.data);
            if (s.status === 'success') setServices(s.data);
            if (md.status === 'success') setMasterDocs(md.data);
        } catch (e) { console.error(e); }
    };

    const fetchUnlinkStats = async (docId) => {
        if (unlinkStats[docId]) return; // already loaded
        try {
            const res = await fetch(`${API}/admin/master-documents/${docId}/unlink-stats`);
            const data = await res.json();
            if (data.status === 'success') {
                setUnlinkStats(prev => ({ ...prev, [docId]: data.data }));
            }
        } catch (e) { console.error(e); }
    };

    // ── Doc Types ─────────────────────────────────────────────────
    const handleAddDocType = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API}/admin/document-types`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDocType)
            });
            const data = await res.json();
            if (data.status === 'success') {
                setDocTypes([...docTypes, data.data]);
                setNewDocType({ name: '', description: '' });
                showToast('Document type added!');
            }
        } catch { showToast('Failed to add document type', 'error'); }
    };

    // ── Services ──────────────────────────────────────────────────
    const handleAddService = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API}/admin/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newService)
            });
            const data = await res.json();
            if (data.status === 'success') {
                setServices([...services, data.data]);
                setNewService({ name: '' });
                showToast('Service added!');
            }
        } catch { showToast('Failed to add service', 'error'); }
    };

    // ── Master Docs: Upload ───────────────────────────────────────
    const handleMasterUpload = async (e) => {
        e.preventDefault();
        if (!masterForm.file || !masterForm.doc_type_id)
            return showToast('Please select a file and document type', 'error');

        const formData = new FormData();
        formData.append('document', masterForm.file);
        formData.append('doc_type_id', masterForm.doc_type_id);
        formData.append('linked_service_ids', JSON.stringify(masterForm.linked_service_ids));

        try {
            const res = await fetch(`${API}/admin/master-documents`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.status === 'success') {
                showToast('Master document uploaded and linked!');
                setMasterForm({ doc_type_id: '', file: null, linked_service_ids: [] });
                // Immediately refresh all data to sync the UI
                await fetchData();
            }
        } catch { showToast('Failed to upload master document', 'error'); }
    };

    // ── Master Docs: Edit (update linked services) ────────────────
    const startEdit = (md) => {
        setEditingId(md.id);
        setEditServices([...md.linked_service_ids]);
    };

    const cancelEdit = () => { setEditingId(null); setEditServices([]); };

    const saveEdit = async (docId) => {
        try {
            const res = await fetch(`${API}/admin/master-documents/${docId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ linked_service_ids: editServices })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setMasterDocs(prev => prev.map(md => md.id === docId ? data.data : md));
                cancelEdit();
                showToast('Document updated successfully!');
            }
        } catch { showToast('Failed to update document', 'error'); }
    };

    // ── Master Docs: Delete ───────────────────────────────────────
    const handleDelete = async (docId) => {
        if (!window.confirm('Delete this master document? This cannot be undone.')) return;
        try {
            const res = await fetch(`${API}/admin/master-documents/${docId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.status === 'success') {
                setMasterDocs(prev => prev.filter(md => md.id !== docId));
                showToast('Document deleted.');
            }
        } catch { showToast('Failed to delete document', 'error'); }
    };

    const toggleServiceInEdit = (sid) => {
        setEditServices(prev =>
            prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
        );
    };

    const toggleUploadService = (sid) => {
        setMasterForm(prev => ({
            ...prev,
            linked_service_ids: prev.linked_service_ids.includes(sid)
                ? prev.linked_service_ids.filter(id => id !== sid)
                : [...prev.linked_service_ids, sid]
        }));
    };

    const toggleExpand = async (docId) => {
        if (expandedDoc === docId) {
            setExpandedDoc(null);
        } else {
            setExpandedDoc(docId);
            await fetchUnlinkStats(docId);
        }
    };

    return (
        <div className="admin-mgmt-container fade-in">
            {/* ── Toast ── */}
            {toast && (
                <div className={`mgmt-toast ${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {toast.msg}
                </div>
            )}

            {/* ── Header ── */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--enterprise-text-main)', marginBottom: '0.5rem' }}>
                    Admin Console
                </h1>
                <p style={{ color: 'var(--enterprise-text-muted)', fontSize: '1rem' }}>
                    Manage document specifications, service integrations, and cross-platform linking.
                </p>
            </div>

            {/* ── Tabs ── */}
            <div className="mgmt-tabs">
                <button className={`mgmt-tab ${activeTab === 'DOC_TYPES' ? 'active' : ''}`} onClick={() => setActiveTab('DOC_TYPES')}>
                    <Layers size={18} /> Document Types
                </button>
                <button className={`mgmt-tab ${activeTab === 'SERVICES' ? 'active' : ''}`} onClick={() => setActiveTab('SERVICES')}>
                    <Building2 size={18} /> Registered Services
                </button>
                <button className={`mgmt-tab ${activeTab === 'LINKING' ? 'active' : ''}`} onClick={() => setActiveTab('LINKING')}>
                    <LinkIcon size={18} /> Service Linking
                </button>
            </div>

            <div className="mgmt-content">

                {/* ── DOC TYPES TAB ── */}
                {activeTab === 'DOC_TYPES' && (
                    <div className="mgmt-section fade-in">
                        <h3>Manage Document Types</h3>
                        <form onSubmit={handleAddDocType} className="mgmt-form">
                            <input type="text" placeholder="e.g. Aadhaar Card"
                                value={newDocType.name}
                                onChange={e => setNewDocType({ ...newDocType, name: e.target.value })}
                                required />
                            <input type="text" placeholder="Description"
                                value={newDocType.description}
                                onChange={e => setNewDocType({ ...newDocType, description: e.target.value })} />
                            <button type="submit" className="btn btn-primary"><Plus size={18} /> Add Type</button>
                        </form>
                        <div className="item-list">
                            {docTypes.map(dt => (
                                <div key={dt.id} className="item-card">
                                    <div>
                                        <strong>{dt.name}</strong>
                                        <p>{dt.description}</p>
                                    </div>
                                    <span className="item-id">ID: {dt.id}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── SERVICES TAB ── */}
                {activeTab === 'SERVICES' && (
                    <div className="mgmt-section fade-in">
                        <h3>Manage Banks & Services</h3>
                        <form onSubmit={handleAddService} className="mgmt-form">
                            <input type="text" placeholder="e.g. SBI Bank"
                                value={newService.name}
                                onChange={e => setNewService({ name: e.target.value })}
                                required />
                            <button type="submit" className="btn btn-primary"><Plus size={18} /> Add Service</button>
                        </form>
                        <div className="item-list grid">
                            {services.map(s => (
                                <div key={s.id} className="item-card compact">
                                    <strong>{s.name}</strong>
                                    <span className="item-id">{s.id}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── LINKING TAB ── */}
                {activeTab === 'LINKING' && (
                    <div className="mgmt-section fade-in">
                        <h3>Link Document Type to Services</h3>

                        {/* ── Summary Widget ── */}
                        <div className="mgmt-summary-grid">
                            <div className="summary-card">
                                <div className="summary-icon docs"><Layers size={24} /></div>
                                <div className="summary-info">
                                    <span className="summary-value">{masterDocs.length}</span>
                                    <span className="summary-label">Master Records</span>
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="summary-icon links"><LinkIcon size={24} /></div>
                                <div className="summary-info">
                                    <span className="summary-value">
                                        {masterDocs.reduce((acc, md) => acc + md.linked_service_ids.length, 0)}
                                    </span>
                                    <span className="summary-label">Active Links</span>
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="summary-icon users"><Building2 size={24} /></div>
                                <div className="summary-info">
                                    <span className="summary-value">
                                        {services.length}
                                    </span>
                                    <span className="summary-label">Connected Banks</span>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleMasterUpload} className="linking-form">
                            <div className="form-group">
                                <label>Select Document Type</label>
                                <select value={masterForm.doc_type_id}
                                    onChange={e => setMasterForm({ ...masterForm, doc_type_id: e.target.value })}
                                    required>
                                    <option value="">-- Select Type --</option>
                                    {docTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Upload Master Document (Original Copy)</label>
                                <div className="file-input-wrapper">
                                    <Upload size={20} />
                                    <input type="file"
                                        onChange={e => setMasterForm({ ...masterForm, file: e.target.files[0] })}
                                        required />
                                    <span>{masterForm.file ? masterForm.file.name : 'Choose File...'}</span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Select Linked Banks/Services</label>
                                <div className="services-selector">
                                    {services.map(s => (
                                        <div key={s.id}
                                            className={`service-chip ${masterForm.linked_service_ids.includes(s.id) ? 'selected' : ''}`}
                                            onClick={() => toggleUploadService(s.id)}>
                                            {masterForm.linked_service_ids.includes(s.id)
                                                ? <CheckCircle2 size={16} />
                                                : <Plus size={16} />}
                                            {s.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="btn-primary btn-block" style={{ padding: '1.25rem', fontSize: '1.1rem', marginTop: '1.5rem', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)' }}>
                                <Upload size={22} /> Confirm & Link Master Copy
                            </button>
                        </form>

                        {/* ── Registered Master Documents List ── */}
                        <div className="linked-docs-list">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h4 style={{ margin: 0 }}>Registered Master Documents ({masterDocs.length})</h4>
                                <button className="mgmt-refresh-btn" onClick={fetchData} title="Refresh">
                                    <RefreshCw size={15} />
                                </button>
                            </div>

                            <div className="item-list">
                                {masterDocs.map(md => {
                                    const docType = docTypes.find(t => t.id === md.doc_type_id);
                                    const isEditing = editingId === md.id;
                                    const isExpanded = expandedDoc === md.id;
                                    const stats = unlinkStats[md.id];

                                    return (
                                        <div key={md.id} className={`item-card linked-item ${isEditing ? 'editing' : ''}`}>
                                            {/* ── Area: Info ── */}
                                            <div className="doc-main-info">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                    <FileText size={20} color="var(--enterprise-primary)" />
                                                    <strong style={{ fontSize: '1.2rem' }}>{docType?.name || 'Unknown Type'}</strong>
                                                </div>
                                                <div className="doc-meta" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                                    <span className="item-id">ID: {md.id.slice(-8)}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--enterprise-text-muted)', fontSize: '0.85rem' }}>
                                                        <Upload size={14} />
                                                        {md.original_filename}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Area: Chips (Middle) ── */}
                                            <div className="linked-services-row">
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--enterprise-text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <LinkIcon size={12} /> Linked Services
                                                </div>
                                                {!isEditing ? (
                                                    <div className="linked-chips">
                                                        {md.linked_service_ids.map(sid => {
                                                            const sName = services.find(s => s.id === sid)?.name || sid;
                                                            const statsForDoc = unlinkStats[md.id];
                                                            const unlinkCount = statsForDoc?.service_counts?.[sid] || 0;
                                                            return (
                                                                <span key={sid} className={`service-tag ${unlinkCount > 0 ? 'has-unlinks' : ''}`}>
                                                                    {sName}
                                                                    {unlinkCount > 0 && <span className="unlink-badge" title="Users unlinked this">{unlinkCount}</span>}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="services-selector">
                                                        {services.map(s => (
                                                            <div key={s.id}
                                                                className={`service-chip ${editServices.includes(s.id) ? 'selected' : ''}`}
                                                                onClick={() => toggleServiceInEdit(s.id)}>
                                                                {editServices.includes(s.id) ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                                                                {s.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Area: Actions (Right) ── */}
                                            <div className="linked-actions">
                                                {!isEditing ? (
                                                    <>
                                                        <button className="mgmt-icon-btn edit" onClick={() => startEdit(md)}>
                                                            <Pencil size={15} /> Edit
                                                        </button>
                                                        <button className="mgmt-icon-btn delete" onClick={() => handleDelete(md.id)}>
                                                            <Trash2 size={15} /> Delete
                                                        </button>
                                                        <button className={`mgmt-icon-btn stats ${isExpanded ? 'active' : ''}`} onClick={() => toggleExpand(md.id)}>
                                                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Stats
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="mgmt-icon-btn save" onClick={() => saveEdit(md.id)}>
                                                            <Save size={15} /> Save
                                                        </button>
                                                        <button className="mgmt-icon-btn cancel" onClick={cancelEdit}>
                                                            <X size={15} /> Cancel
                                                        </button>
                                                    </>
                                                )}
                                            </div>

                                            {/* ── Unlink Stats Panel (expandable) ── */}
                                            {isExpanded && (
                                                <div className="unlink-stats-panel fade-in">
                                                    <div className="stats-header">
                                                        <Users size={15} />
                                                        <strong>User Unlink Activity</strong>
                                                    </div>
                                                    {!stats ? (
                                                        <p className="stats-loading">Loading stats…</p>
                                                    ) : stats.total_users_with_unlinks === 0 ? (
                                                        <p className="stats-empty">No users have unlinked any service for this document.</p>
                                                    ) : (
                                                        <>
                                                            <p className="stats-total">
                                                                <AlertTriangle size={13} color="#f59e0b" />
                                                                {stats.total_users_with_unlinks} user(s) have unlinked services
                                                            </p>
                                                            <div className="stats-rows">
                                                                {Object.entries(stats.service_unlink_counts).map(([sid, count]) => {
                                                                    const svc = services.find(s => s.id === sid);
                                                                    return (
                                                                        <div key={sid} className="stats-row">
                                                                            <span>{svc ? svc.name : sid}</span>
                                                                            <span className="stats-count">{count} unlink(s)</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminManagement;
