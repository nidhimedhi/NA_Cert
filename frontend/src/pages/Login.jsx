import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,  setForm]  = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await login(form.email, form.password);
      navigate('/upload');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Left panel */}
        <div className="auth-left">
          <div className="auth-brand">🏛 LandScope</div>
          <div className="auth-left-icon">🌾</div>
          <h2>Welcome Back</h2>
          <div className="auth-divider" />
          <p>Manage your NA land certificates and property records with ease.</p>
        </div>

        {/* Right panel */}
        <div className="auth-right">
          <span className="auth-badge">🔒 Secure Login</span>
          <h2>Sign In</h2>
          <p className="auth-sub">Enter your credentials to access your dashboard.</p>

          {error && <div className="error-box">⚠️ {error}</div>}

          <form onSubmit={submit} className="auth-form">
            <div>
              <label className="input-label">Email Address</label>
              <div className="input-wrap">
                <input className="auth-input" type="email" name="email"
                  placeholder="you@example.com" value={form.email}
                  onChange={handle} required />
              </div>
            </div>
            <div>
              <label className="input-label">Password</label>
              <div className="input-wrap">
                <input className="auth-input" type="password" name="password"
                  placeholder="Enter your password" value={form.password}
                  onChange={handle} required />
              </div>
            </div>
            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
          <p className="auth-switch">
            Don't have an account? <Link to="/register">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
