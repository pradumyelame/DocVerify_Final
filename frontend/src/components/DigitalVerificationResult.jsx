import React from 'react';
import { RotateCcw, ShieldCheck, AlertTriangle, Fingerprint, Activity, Database, FileSearch } from 'lucide-react';
import './VerificationResult.css';

const DigitalVerificationResult = ({ result, onReset }) => {
  const fieldAnalysis = result.db_verification?.field_analysis;
  const affindaData = result.affinda_extraction?.data;

  return (
    <div className="result-container fade-in-up">
      <div className={`status-banner glass-panel ${result.decision === 'DOCUMENT IS OKAY' ? 'verified-true' : 'verified-false'}`} style={{ padding: '2rem', textAlign: 'center', borderRadius: '12px', border: `2px solid ${result.decision === 'DOCUMENT IS OKAY' ? 'var(--accent)' : 'var(--danger)'}` }}>
        <h2 style={{ color: result.decision === 'DOCUMENT IS OKAY' ? 'var(--accent)' : 'var(--danger)', fontSize: '2.5rem', marginBottom: '0', margin: 0 }}>
          {result.decision}
        </h2>
        {result.decision === 'TAMPERED' && (
           <p style={{ color: 'var(--danger)', marginTop: '0.5rem', fontWeight: 600 }}>Verification failed: Critical fields do not match original record.</p>
        )}
      </div>

      <div className="tamper-analysis-section glass-panel" style={{ marginTop: '1.5rem', border: '1px solid var(--secondary)', background: 'rgba(56, 189, 248, 0.05)', padding: '1.5rem', borderRadius: '12px', textAlign: 'left' }}>
        <div className="tamper-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--secondary)' }}>
          <Activity size={24} />
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Verification Analysis</h3>
        </div>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-main)' }}>
          {result.explainable_reasons && result.explainable_reasons.map((reason, idx) => (
            <li key={idx} style={{ marginBottom: '0.5rem' }}>{reason}</li>
          ))}
        </ul>
      </div>

      {fieldAnalysis && Object.keys(fieldAnalysis).length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: result.decision === 'DOCUMENT IS OKAY' ? '1px solid var(--accent)' : '1px solid var(--danger)', marginTop: '1.5rem', background: result.decision === 'DOCUMENT IS OKAY' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(239, 68, 68, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <ShieldCheck size={20} color={result.decision === 'DOCUMENT IS OKAY' ? 'var(--accent)' : 'var(--danger)'} />
            <h4 style={{ margin: 0, color: result.decision === 'DOCUMENT IS OKAY' ? 'var(--accent)' : 'var(--danger)' }}>Mandatory Field Matching (Name, Roll, Marks, etc.)</h4>
          </div>
          <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {Object.entries(fieldAnalysis).map(([field, data]) => (
              <div key={field} style={{ 
                marginBottom: '0.75rem', 
                padding: '0.75rem', 
                borderRadius: '8px', 
                background: data?.status === 'Verified' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                border: `1px solid ${data?.status === 'Verified' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-main)' }}>{field.replace(/_/g, ' ')}</span>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 700,
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    background: data?.status === 'Verified' ? 'var(--accent)' : 'var(--danger)', 
                    color: 'white',
                    textTransform: 'uppercase'
                  }}>
                    {data?.status || 'Unknown'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  {data?.status === 'Verified' ? (
                    <span style={{ color: 'var(--text-main)' }}>Match: <span style={{ color: 'var(--accent)' }}>{data?.value}</span></span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Expected: {data?.expected || 'N/A'}</span>
                      <span style={{ color: 'var(--text-muted)' }}>Found in Document: <span style={{ color: 'var(--danger)', textDecoration: 'underline' }}>{data?.found || 'Missing'}</span></span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Database size={20} color="var(--primary)" />
            <h4 style={{ margin: 0, color: 'var(--primary)' }}>Structured Data Extraction</h4>
          </div>
          {result.affinda_extraction?.status === 'success' && affindaData ? (
            <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {Object.entries(affindaData).map(([key, value]) => {
                if (key === 'raw_text' || key === 'local_ocr_text') return null;
                return (
                  <p key={key} style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                    <strong style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</strong> {String(value)}
                  </p>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--danger)' }}>Failed to extract data via Affinda API.</p>
          )}
        </div>
      </div>


      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--accent)', marginTop: '1.5rem', background: 'rgba(59, 130, 246, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Fingerprint size={20} color="var(--accent)" />
            <h4 style={{ margin: 0, color: 'var(--accent)' }}>Document Fingerprint</h4>
          </div>
          <code style={{ display: 'block', background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '8px', wordBreak: 'break-all', color: 'var(--text-main)', fontSize: '0.9rem' }}>
            {result.fingerprint || 'N/A'}
          </code>
      </div>

      <button className="btn btn-secondary reset-btn" style={{ marginTop: '2rem', width: '100%' }} onClick={onReset}>
        <RotateCcw size={20} /> Verify Another Digital Document
      </button>
    </div>
  );
};

export default DigitalVerificationResult;
