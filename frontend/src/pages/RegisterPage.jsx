import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { UserPlus, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import './Auth.css';

const RegisterPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('user');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        setLoading(true);

        try {
            await axios.post('http://localhost:5000/api/register', {
                username,
                password,
                role
            });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Try a different username.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-centered fade-in-up" style={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="auth-card glass-panel" style={{width: '100%', maxWidth: '450px', padding: '3rem', margin: 'auto'}}>
                <div className="auth-header" style={{textAlign: 'center', marginBottom: '2.5rem'}}>
                    <h1 className="section-title" style={{fontSize: '2.5rem'}}>Create Account</h1>
                    <p style={{color: 'var(--text-muted)'}}>Join DocVerify platform today</p>
                </div>

                {success ? (
                    <div className="auth-success-msg" style={{textAlign: 'center', padding: '1rem'}}>
                        <CheckCircle size={48} color="var(--primary)" style={{marginBottom: '1rem'}} />
                        <h2 style={{marginBottom: '0.5rem'}}>Registration Successful!</h2>
                        <p style={{color: 'var(--text-muted)'}}>Redirecting you to login...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
                        {error && (
                            <div className="auth-error">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}
                        
                        <div className="auth-tabs">
                            <button type="button" className={`auth-tab ${role === 'user' ? 'active' : ''}`} onClick={() => {setRole('user'); setError('');}}>User</button>
                            <button type="button" className={`auth-tab ${role === 'admin' ? 'active' : ''}`} onClick={() => {setRole('admin'); setError('');}}>Admin</button>
                        </div>
                        
                        <div className="input-group">
                            <input
                                type="text"
                                className="auth-input"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <input
                                type="password"
                                className="auth-input"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <input
                                type="password"
                                className="auth-input"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '1rem'}} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
                        </button>
                    </form>
                )}

                <div className="auth-footer" style={{marginTop: '2rem', textAlign: 'center'}}>
                    <p style={{color: 'var(--text-muted)'}}>
                        Already joined? <Link to="/login" style={{color: 'var(--primary)', fontWeight: '600', textDecoration: 'none'}}>Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
