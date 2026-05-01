import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileSearch, Fingerprint, Database, Lock, CheckCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="home-page">
      <nav className="home-nav">
        <div className="logo-section">
          <ShieldAlert size={32} color="var(--primary)" />
          <span className="logo-text">DocVerify</span>
        </div>
        <div className="home-nav-links">
          <button className="nav-link-btn" onClick={() => document.getElementById('features')?.scrollIntoView({behavior: 'smooth'})}>Explore DocVerify</button>
          <button className="nav-link-btn" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({behavior: 'smooth'})}>How It Works</button>
          {user ? (
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ padding: '0.5rem 1.8rem', borderRadius: '25px' }}>
              Go to Dashboard
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ padding: '0.5rem 1.8rem', borderRadius: '25px' }}>
              Login / Register
            </button>
          )}
        </div>
      </nav>

      <div className="home-hero">
        <div className="home-hero-content">
          <h1 className="home-hero-title">
            Multi-Layer Document<br />
            <span style={{ color: 'var(--primary)' }}>Verification System</span>
          </h1>
          <p className="home-hero-subtitle">
            Verify your digital and physical documents instantly with advanced 
            authenticity checks powered by blockchain technology and trusted databases.
          </p>
          <div className="home-hero-btns">
            {user ? (
              <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ padding: '0.9rem 2.5rem', fontSize: '1.05rem', borderRadius: '30px' }}>
                Go to Dashboard <ArrowRight size={18} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ padding: '0.9rem 2.5rem', fontSize: '1.05rem', borderRadius: '30px' }}>
                Get Started <ArrowRight size={18} />
              </button>
            )}
            {!user && (
              <button className="btn btn-secondary" onClick={() => navigate('/register')} style={{ padding: '0.9rem 2.5rem', fontSize: '1.05rem', borderRadius: '30px' }}>
                Create Account
              </button>
            )}
          </div>
        </div>
        <div className="home-hero-visual">
          <div className="hero-icon-card">
            <ShieldCheck size={120} strokeWidth={1.2} color="var(--primary)" />
          </div>
        </div>
      </div>

      <section className="home-features" id="features">
        <h2 className="home-section-title">What DocVerify Offers</h2>
        <p className="home-section-subtitle">A comprehensive suite of verification tools at your fingertips.</p>

        <div className="home-feature-grid">
          <div className="home-feature-card">
            <div className="home-feature-icon" style={{ background: 'rgba(30, 58, 138, 0.1)' }}>
              <FileSearch size={32} color="var(--primary)" />
            </div>
            <h3>Visual Tamper Detection</h3>
            <p>Detect pixel-level anomalies, missing elements, and visual tampering using advanced image processing algorithms.</p>
          </div>

          <div className="home-feature-card">
            <div className="home-feature-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <Fingerprint size={32} color="var(--accent)" />
            </div>
            <h3>Digital Fingerprinting</h3>
            <p>Generate unique document fingerprints using SHA-256 hashing and match against the trusted document database.</p>
          </div>

          <div className="home-feature-card">
            <div className="home-feature-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
              <Database size={32} color="#f59e0b" />
            </div>
            <h3>Blockchain Ledger</h3>
            <p>All verified documents are recorded on a secure blockchain, ensuring immutable audit trails.</p>
          </div>

          <div className="home-feature-card">
            <div className="home-feature-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <Lock size={32} color="#8b5cf6" />
            </div>
            <h3>Role-Based Access</h3>
            <p>Separate Admin and User portals ensure secure document registration and controlled verification workflows.</p>
          </div>
        </div>
      </section>

      <section className="home-how-it-works" id="how-it-works">
        <h2 className="home-section-title">How It Works</h2>
        <p className="home-section-subtitle">A simple three-step process to verify any document.</p>

        <div className="home-steps">
          <div className="home-step">
            <div className="home-step-number">1</div>
            <h3>Upload Document</h3>
            <p>Drag and drop your certificate, marksheet, ID card, or any official document.</p>
          </div>
          <div className="home-step-divider"></div>
          <div className="home-step">
            <div className="home-step-number">2</div>
            <h3>Automated Analysis</h3>
            <p>Our system runs multi-layer checks including visual, metadata, and database matching.</p>
          </div>
          <div className="home-step-divider"></div>
          <div className="home-step">
            <div className="home-step-number">3</div>
            <h3>Get Results</h3>
            <p>Receive a comprehensive verification report with a clear status in seconds.</p>
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="home-cta-content">
          <CheckCircle size={48} color="white" />
          <h2>Ready to Verify Your Documents?</h2>
          <p>Join DocVerify today and experience secure, instant, and reliable document verification.</p>
          <div className="home-hero-btns" style={{ justifyContent: 'center' }}>
            {user ? (
              <button className="btn" onClick={() => navigate('/dashboard')} style={{ background: 'white', color: 'var(--primary)', padding: '0.9rem 2.5rem', fontSize: '1.05rem', borderRadius: '30px', fontWeight: 700 }}>
                Go to My Dashboard
              </button>
            ) : (
              <>
                <button className="btn" onClick={() => navigate('/register')} style={{ background: 'white', color: 'var(--primary)', padding: '0.9rem 2.5rem', fontSize: '1.05rem', borderRadius: '30px', fontWeight: 700 }}>
                  Create Free Account
                </button>
                <button className="btn" onClick={() => navigate('/login')} style={{ background: 'transparent', color: 'white', border: '2px solid white', padding: '0.9rem 2.5rem', fontSize: '1.05rem', borderRadius: '30px', fontWeight: 600 }}>
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-footer-content">
          <div className="home-footer-brand">
            <ShieldAlert size={24} color="var(--primary)" />
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.2rem' }}>DocVerify</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            © 2025-26 DocVerify — Multi-Layer Digital Document Verification System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
