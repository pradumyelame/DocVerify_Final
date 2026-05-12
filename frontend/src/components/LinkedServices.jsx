import React, { useState, useEffect } from 'react';
import { ShieldCheck, XCircle, AlertCircle, Trash2, History, CheckCircle2 } from 'lucide-react';

const LinkedServices = ({ result, userId }) => {
    const { document_type, linked_services } = result;
    const [logs, setLogs] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        if (userId) fetchLogs();
    }, [userId]);

    const fetchLogs = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/user/activity-logs/${userId}`);
            const data = await res.json();
            if (data.status === 'success') setLogs(data.data);
        } catch (error) {
            console.error("Error fetching logs:", error);
        }
    };

    return (
        <div className="linked-services-container fade-in">
            <div className="verified-banner">
                <ShieldCheck size={32} color="var(--accent)" />
                <div>
                    <h4>{document_type?.name} Verified Successfully</h4>
                    <p>Authentic document recognized and mapped to active services.</p>
                </div>
            </div>

            <div className="services-status-grid">
                <div className="services-column" style={{ width: '100%' }}>
                    <h5 className="column-title"><CheckCircle2 size={16} /> Linked Services</h5>
                    <p className="column-subtitle">This document is currently active and verified for:</p>
                    <div className="services-list">
                        {linked_services && linked_services.length > 0 ? (
                            linked_services.map(s => (
                                <div key={s.id} className="service-item linked">
                                    <span className="service-name">✅ {s.name}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>ACTIVE</span>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">No active service links found for this document.</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="activity-history">
                <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory(!showHistory)}>
                    <History size={16} /> {showHistory ? "Hide Activity Logs" : "View Activity Logs"}
                </button>
                
                {showHistory && (
                    <div className="logs-panel fade-in">
                        {logs.length > 0 ? (
                            logs.map((log, idx) => (
                                <div key={idx} className="log-entry">
                                    <span className="log-time">{new Date(log.timestamp.split('-')[0] * 1000).toLocaleTimeString()}</span>
                                    <span className="log-action">{log.action.toUpperCase()}</span>
                                    <span className="log-details">Ref: {log.details.service_id}</span>
                                </div>
                            ))
                        ) : (
                            <p className="empty-logs">No recent activity recorded.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LinkedServices;
