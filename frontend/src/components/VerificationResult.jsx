import React, { useEffect, useState } from 'react';
import { RotateCcw, Eye, ShieldCheck, Database, Loader2, AlertTriangle, Cpu, FileWarning, Activity, Building2 } from 'lucide-react';
import './VerificationResult.css';
import LinkedServices from './LinkedServices';
import { useAuth } from '../context/AuthContext';

const VerificationResult = ({ result, role, onReset }) => {
  const [showImage, setShowImage] = useState(!result.verified && role === 'user');
  const [ipfsText, setIpfsText] = useState(null);
  const [fetchingIpfs, setFetchingIpfs] = useState(false);
  const { user } = useAuth();

  const fetchIpfsText = async () => {
    if (ipfsText || !result.ipfs_hash) return;
    setFetchingIpfs(true);
    try {
      const response = await fetch(`http://localhost:5000/api/ipfs/${result.ipfs_hash}`);
      const data = await response.json();
      if (data.status === 'success') {
        setIpfsText(data.data);
      } else {
        setIpfsText("Failed to retrieve text from IPFS.");
      }
    } catch (err) {
      setIpfsText("Error connecting to IPFS node.");
    } finally {
      setFetchingIpfs(false);
    }
  };

  return (
    <div className="result-container fade-in-up">
      {role === 'user' ? (
        <div className={`status-banner glass-panel ${result.verified ? 'verified-true' : 'verified-false'}`} style={{ padding: '2rem', textAlign: 'center', borderRadius: '12px', border: `2px solid ${result.verified ? 'var(--accent)' : 'var(--danger)'}` }}>
          <h2 style={{ color: result.verified ? 'var(--accent)' : 'var(--danger)', fontSize: '2.5rem', marginBottom: '1rem', margin: 0 }}>
            {result.verified ? 'DOCUMENT OK' : 'TAMPERED'}
          </h2>
        </div>
      ) : (
        <div className={`status-banner glass-panel`} style={{ padding: '2rem', textAlign: 'center', borderRadius: '12px', border: `2px solid var(--primary)` }}>
          <h2 style={{ color: 'var(--primary)', fontSize: '2rem', marginBottom: '0.5rem', margin: 0 }}>
            DOCUMENT SECURELY REGISTERED
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Added to decentralized ledger as authentic truth</p>
        </div>
      )}

      {role === 'user' && !result.verified && result.tamper_analysis && (
        <div className="tamper-analysis-section glass-panel" style={{ marginTop: '1.5rem', border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '12px', textAlign: 'left' }}>
          <div className="tamper-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--danger)' }}>
            <AlertTriangle size={24} />
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Tamper Analysis Report</h3>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileWarning size={16} /> Tampered Regions Identified:</h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--danger)' }}>
              {result.tamper_analysis.tampered_parts.map((part, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem', fontWeight: 'bold' }}>{part}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={16} /> Failure Reasons:</h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-main)' }}>
              {result.tamper_analysis.failure_reasons.map((reason, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>{reason}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Cpu size={16} /> Algorithms & Extraction Methods Used:</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {result.tamper_analysis.algorithms_used.map((algo, idx) => (
                <span key={idx} style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                  {algo}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {result.blockchain_proof && (
        <div className="blockchain-proof glass-panel" style={{ marginTop: '1.5rem', border: '1px solid var(--primary)', background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '12px' }}>
          <div className="proof-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <ShieldCheck size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>Blockchain Sealed & Immutable</h3>
          </div>
          <div className="proof-details" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <div style={{ marginBottom: '0.4rem' }}>
              <strong>Block Hash:</strong>
              <code style={{ display: 'block', background: 'rgba(30, 58, 138, 0.08)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.25rem', wordBreak: 'break-all', color: 'var(--text-main)' }}>
                {result.blockchain_proof.block_hash}
              </code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <span>Index: #{result.blockchain_proof.block_index}</span>
              <span>Status: {result.blockchain_proof.is_valid ? '✅ Valid' : '❌ Tampered'}</span>
            </div>
          </div>
        </div>
      )}

      {result.ipfs_hash && (
        <div className="ocr-section glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '12px' }}>
          <div className="ocr-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Database size={20} color="var(--secondary)" />
            <h3 style={{ margin: 0 }}>IPFS Stored Text</h3>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>IPFS Hash Key: </span>
            <code style={{ background: 'rgba(30, 58, 138, 0.08)', padding: '0.3rem 0.5rem', borderRadius: '4px', color: 'var(--text-main)', wordBreak: 'break-all' }}>ipfs://{result.ipfs_hash}</code>
          </div>

          {!ipfsText ? (
            <button
              className="btn btn-secondary"
              onClick={fetchIpfsText}
              disabled={fetchingIpfs}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              {fetchingIpfs ? <><Loader2 className="animate-spin" size={16} style={{ marginRight: '8px' }} /> Retrieving...</> : <><Eye size={16} /> View IPFS Extracted Text</>}
            </button>
          ) : (
            <div className="ocr-content" style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-main)', marginTop: '1rem', background: 'rgba(30, 58, 138, 0.05)', padding: '1rem', borderRadius: '8px' }}>
              {ipfsText}
            </div>
          )}
        </div>
      )}

      {result.processed_image_base64 && (
        <div className="image-viewer-section" style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowImage(!showImage)}
            style={{ marginBottom: '1rem' }}
          >
            <Eye size={20} /> {showImage ? 'Hide Processed Document' : 'View Processed Document'}
          </button>

          {showImage && (
            <div className="processed-image-container fade-in-up glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', display: 'inline-block', maxWidth: '100%', border: (role === 'admin' || result.verified) ? '1px solid var(--border-glass)' : '2px solid var(--danger)' }}>
              <h4 style={{ color: (role === 'admin' || result.verified) ? 'var(--primary)' : 'var(--danger)', marginBottom: '1rem', fontWeight: 'bold' }}>
                {(role === 'admin' || result.verified) ? 'Final Extracted & Processed Layer' : 'TAMPERED REGIONS HIGHLIGHTED'}
              </h4>
              <img
                src={result.processed_image_base64}
                alt="Processed Document"
                style={{ maxWidth: '100%', maxHeight: '600px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}
              />
            </div>
          )}
        </div>
      )}

      {role === 'user' && result.verified && result.linked_services && (
        <LinkedServices 
          result={result} 
          userId={user?.id} 
          onAction={onReset} 
        />
      )}

      <button className="btn btn-secondary reset-btn" style={{ marginTop: '2rem' }} onClick={onReset}>
        <RotateCcw size={20} /> Verify Another Document
      </button>
    </div>
  );
};

export default VerificationResult;
