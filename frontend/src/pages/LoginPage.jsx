import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';
import './Auth.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/login', {
                username,
                password,
                role
            });
            login(response.data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-centered fade-in-up" style={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="auth-card glass-panel" style={{width: '100%', maxWidth: '450px', padding: '3rem', margin: 'auto'}}>
                <div className="auth-header" style={{textAlign: 'center', marginBottom: '2.5rem'}}>
                    <h1 className="section-title" style={{fontSize: '2.2rem'}}>Welcome back to DocVerify</h1>
                    <p style={{color: 'var(--text-muted)'}}>Sign in to continue document verification</p>
                </div>

                {error && (
                    <div className="auth-error" style={{marginBottom: '1.5rem'}}>
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="auth-tabs">
                    <button type="button" className={`auth-tab ${role === 'user' ? 'active' : ''}`} onClick={() => {setRole('user'); setError('');}}>User</button>
                    <button type="button" className={`auth-tab ${role === 'admin' ? 'active' : ''}`} onClick={() => {setRole('admin'); setError('');}}>Admin</button>
                </div>

                <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
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

                    <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '1rem'}} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Login to System'}
                    </button>
                </form>

                <div className="auth-footer" style={{marginTop: '2rem', textAlign: 'center'}}>
                    <p style={{color: 'var(--text-muted)'}}>
                        New here? <Link to="/register" style={{color: 'var(--primary)', fontWeight: '600', textDecoration: 'none'}}>Create Account</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
