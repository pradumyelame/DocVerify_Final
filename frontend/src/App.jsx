import React, { useState, useEffect } from 'react';
import { Shield, Loader2, CheckCircle2 } from 'lucide-react';
import './App.css';
import UploadZone from './components/UploadZone';
import VerificationResult from './components/VerificationResult';
import PreprocessingOptions from './components/PreprocessingOptions';
import FeatureExtractionOptions from './components/FeatureExtractionOptions';

const STEPS = {
  UPLOAD: 'upload',
  PREPROCESSING: 'preprocessing',
  FEATURE_OPTIONS: 'feature_options',
  LOADING: 'loading',
  RESULT: 'result'
};

const STANDARD_PROCESSING_STEPS = [
  'Reading document image...',
  'Applying preprocessing filters...',
  'Extracting visual features (SIFT, ORB, HOG)...',
  'Running CNN-based tamper detection...',
  'Comparing against trusted database...',
  'Computing blockchain hash...',
  'Generating verification report...',
];

const DIGITAL_PROCESSING_STEPS = [
  'Parsing document metadata...',
  'Extracting structured data via Affinda API...',
  'Matching against Trusted Document Database...',
  'Computing document fingerprint (SHA-256)...',
  'Analyzing metadata for suspicious edits...',
  'Generating verification report...',
];

const ProcessingSteps = ({ type }) => {
  const steps = type === 'digital' ? DIGITAL_PROCESSING_STEPS : STANDARD_PROCESSING_STEPS;
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div style={{ textAlign: 'left', maxWidth: '420px', margin: '0 auto' }}>
      {steps.map((stepText, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.6rem 0',
            opacity: idx <= activeStep ? 1 : 0.3,
            transition: 'opacity 0.5s ease',
          }}
        >
          {idx < activeStep ? (
            <CheckCircle2 size={18} color="var(--accent)" />
          ) : idx === activeStep ? (
            <Loader2 className="animate-spin" size={18} color="var(--primary)" />
          ) : (
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border-glass)' }} />
          )}
          <span style={{
            fontSize: '0.9rem',
            color: idx < activeStep ? 'var(--accent)' : idx === activeStep ? 'var(--text-main)' : 'var(--text-dim)',
            fontWeight: idx === activeStep ? 600 : 400,
          }}>
            {stepText}
          </span>
        </div>
      ))}
    </div>
  );
};

const VerificationFlow = ({ role }) => {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedTechniques, setSelectedTechniques] = useState([]);
  const [featureTechniques, setFeatureTechniques] = useState(['CNN', 'SIFT', 'HOG', 'LBP', 'ORB']);

  const performVerification = async (formData) => {
    try {
      const response = await fetch('http://localhost:5000/api/verify', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.status === 'success') {
        setResult(data.data);
        setStep(STEPS.RESULT);
      } else {
        throw new Error(data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification failed:', error);
      alert(error.message || 'Verification failed. Please try again.');
      setStep(STEPS.UPLOAD);
    }
  };

  const handleUpload = (uploadedFile) => {
    setFile(uploadedFile);
    if (role === 'user') {
      setStep(STEPS.LOADING);
      const defaultTechniques = ["resizing", "grayscale"];
      const defaultFeatureTechniques = ['CNN', 'SIFT', 'HOG', 'LBP', 'ORB'];
      
      setSelectedTechniques(defaultTechniques);
      setFeatureTechniques(defaultFeatureTechniques);
      
      const formData = new FormData();
      formData.append('document', uploadedFile);
      formData.append('techniques', JSON.stringify(defaultTechniques));
      formData.append('feature_techniques', JSON.stringify(defaultFeatureTechniques));
      formData.append('role', role);
      
      performVerification(formData);
    } else {
      setStep(STEPS.PREPROCESSING);
    }
  };

  const handlePreprocessingSelect = (techniques) => {
    setSelectedTechniques(techniques);
    setStep(STEPS.FEATURE_OPTIONS);
  };

  const handleFeatureSelect = async (techniques) => {
    setFeatureTechniques(techniques);
    setStep(STEPS.LOADING);
    
    const formData = new FormData();
    formData.append('document', file);
    formData.append('techniques', JSON.stringify(selectedTechniques));
    formData.append('feature_techniques', JSON.stringify(techniques));
    formData.append('role', role);

    await performVerification(formData);
  };

  const resetFlow = () => {
    setStep(STEPS.UPLOAD);
    setFile(null);
    setResult(null);
    setSelectedTechniques([]);
  };

  return (
    <main className="app-main" style={{ padding: 0 }}>
      <div className="content-wrapper" style={{ padding: 0 }}>
        {step === STEPS.UPLOAD && (
          <div className="fade-in-up">
            <UploadZone onUpload={handleUpload} />
          </div>
        )}

        {step === STEPS.PREPROCESSING && (
          <PreprocessingOptions 
            onNext={handlePreprocessingSelect} 
            onBack={() => setStep(STEPS.UPLOAD)}
          />
        )}

        {step === STEPS.FEATURE_OPTIONS && (
          <FeatureExtractionOptions
            onNext={handleFeatureSelect}
            onBack={() => setStep(STEPS.PREPROCESSING)}
          />
        )}

        {step === STEPS.LOADING && (
          <div className="processing-screen fade-in-up" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div className="scanner-overlay" style={{ margin: '0 auto 2rem' }}>
              <div className="scanner-line"></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Loader2 className="animate-spin" size={28} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)' }}>Processing Document...</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>Please wait while we analyze your document for authenticity.</p>
            <ProcessingSteps type="standard" />
          </div>
        )}

        {step === STEPS.RESULT && result && (
          <VerificationResult result={result} role={role} onReset={resetFlow} />
        )}
      </div>
    </main>
  );
};

import BlockchainViewer from './components/BlockchainViewer';
import { User, ShieldAlert, LogOut, FileSearch, Fingerprint, Database } from 'lucide-react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import { useAuth } from './context/AuthContext';
import DigitalVerificationResult from './components/DigitalVerificationResult';

const DigitalVerificationFlow = ({ role }) => {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const handleUpload = async (uploadedFile) => {
    setFile(uploadedFile);
    setStep(STEPS.LOADING);
    
    const formData = new FormData();
    formData.append('document', uploadedFile);
    
    try {
      const response = await fetch('http://localhost:5000/api/verify_digital', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.status === 'success') {
        setResult(data.data);
        setStep(STEPS.RESULT);
      } else {
        throw new Error(data.message || 'Digital Verification failed');
      }
    } catch (error) {
      console.error('Digital Verification failed:', error);
      alert(error.message || 'Verification failed. Please try again.');
      setStep(STEPS.UPLOAD);
    }
  };

  const resetFlow = () => {
    setStep(STEPS.UPLOAD);
    setFile(null);
    setResult(null);
  };

  return (
    <main className="app-main" style={{ padding: 0 }}>
      <div className="content-wrapper" style={{ padding: 0 }}>
        {step === STEPS.UPLOAD && (
          <div className="fade-in-up">
            <UploadZone onUpload={handleUpload} />
          </div>
        )}

        {step === STEPS.LOADING && (
          <div className="processing-screen fade-in-up" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div className="scanner-overlay" style={{ margin: '0 auto 2rem' }}>
              <div className="scanner-line"></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Loader2 className="animate-spin" size={28} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)' }}>Processing Document...</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>Running multi-layer digital verification checks.</p>
            <ProcessingSteps type="digital" />
          </div>
        )}

        {step === STEPS.RESULT && result && (
          <DigitalVerificationResult result={result} onReset={resetFlow} />
        )}
      </div>
    </main>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function Dashboard() {
  const { user, logout } = useAuth();
  const [adminTab, setAdminTab] = useState(null);
  const [userTab, setUserTab] = useState(null);

  return (
    <div className="app-container">
      <nav className="top-nav">
        <div className="logo-section">
          <ShieldAlert size={32} color="var(--primary)" />
          <span className="logo-text">DocVerify</span>
        </div>
        <div className="nav-links">
          <button className="nav-link-btn">Explore DocVerify</button>
          <button className="nav-link-btn">Become a Partner</button>
          <button className="btn btn-primary" onClick={logout} style={{ padding: '0.5rem 1.5rem' }}>
            Logout ({user.username})
          </button>
        </div>
      </nav>

      {userTab === null && adminTab === null && (
        <div className="hero-banner">
          <div className="hero-content">
            <h1 className="hero-title">
              {user.role === 'admin' ? "Admin Verification Portal" : "Secure Document Verification System"}
            </h1>
            <p className="hero-subtitle">
              {user.role === 'admin' 
                ? "Upload and register official ground-truth documents to the secure blockchain ledger." 
                : "Verify your digital and physical documents instantly with our advanced multi-layer authenticity checks."}
            </p>
            <button className="btn btn-primary" onClick={() => window.scrollTo({top: 500, behavior: 'smooth'})}>
              Get Started
            </button>
          </div>
          <div style={{ paddingRight: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.9 }}>
            <FileSearch size={160} color="var(--primary)" strokeWidth={1} />
          </div>
        </div>
      )}

      <div className="content-wrapper" style={{ paddingTop: userTab === null && adminTab === null ? '2rem' : '2rem' }}>

        {user.role === 'user' ? (
          <div className="user-container">
            {userTab === null ? (
              <div className="fade-in-up card-grid" style={{ marginBottom: '2rem' }}>
                <div 
                  className="action-card"
                  onClick={() => setUserTab('STANDARD')}
                  style={{ border: '1px solid var(--border-glass)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--primary)' }}>
                      <FileSearch size={28} />
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Standard Visual Verification</h3>
                  </div>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Upload documents to check for visual tampering, pixel anomalies, and missing elements against physical prints.</p>
                </div>
                
                <div 
                  className="action-card"
                  onClick={() => setUserTab('DIGITAL')}
                  style={{ border: '1px solid var(--border-glass)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--primary)' }}>
                      <Fingerprint size={28} />
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Advanced Digital Verification</h3>
                  </div>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Validate document metadata, extract structured data, and match against the Trusted Database instantly.</p>
                </div>
              </div>
            ) : (
              <div className="fade-in-up">
                <button 
                  className="btn btn-ghost" 
                  onClick={() => setUserTab(null)}
                  style={{ marginBottom: '1rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <span style={{ fontSize: '1.2rem' }}>←</span> Back to Services
                </button>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  {userTab === 'STANDARD' && <VerificationFlow role="user" />}
                  {userTab === 'DIGITAL' && <DigitalVerificationFlow role="user" />}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="admin-container" style={{ padding: 0, width: '100%', alignItems: 'stretch' }}>
            {adminTab === null ? (
              <div className="fade-in-up card-grid" style={{ marginBottom: '2rem' }}>
                <div 
                  className="action-card"
                  onClick={() => setAdminTab('VERIFY')}
                  style={{ border: '1px solid var(--border-glass)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--primary)' }}>
                      <FileSearch size={28} />
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Upload & Register Document</h3>
                  </div>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Register an official ground-truth document to the Blockchain and Trusted Database.</p>
                </div>

                <div 
                  className="action-card"
                  onClick={() => setAdminTab('BLOCKCHAIN')}
                  style={{ border: '1px solid var(--border-glass)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--primary)' }}>
                      <Database size={28} />
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>View Blockchain Ledger</h3>
                  </div>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Audit the decentralized ledger to view all registered and verified document hashes securely.</p>
                </div>
              </div>
            ) : (
              <div className="fade-in-up" style={{ width: '100%' }}>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => setAdminTab(null)}
                  style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <span style={{ fontSize: '1.2rem' }}>←</span> Back to Services
                </button>
                <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', minHeight: '60vh' }}>
                  {adminTab === 'VERIFY' && <VerificationFlow role="admin" />}
                  {adminTab === 'BLOCKCHAIN' && <BlockchainViewer />}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RootApp() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
}



export default RootApp;
