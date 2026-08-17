import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function TahsildarLogin() {
  const navigate = useNavigate();
  const [form, setForm]   = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const r = await api.post('/tahsildar/auth/login/', form);
      localStorage.setItem('tahsildar_token', r.data.access);
      navigate('/tahsildar/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-left" style={{ background: 'linear-gradient(160deg,#0f4c75,#1b262c)' }}>
          <div className="auth-brand">🏛 LandScope</div>
          <div className="auth-left-icon">⚖️</div>
          <h2>Tahsildar Portal</h2>
          <div className="auth-divider" />
          <p>Review and process NA certificate applications.</p>
        </div>
        <div className="auth-right">
          <span className="auth-badge">🔒 Official Login</span>
          <h2>Tahsildar Sign In</h2>
          <p className="auth-sub">Enter your official credentials.</p>
          {error && <div className="error-box">⚠️ {error}</div>}
          <form onSubmit={submit} className="auth-form">
            <div><label className="input-label">Username</label>
              <div className="input-wrap"><input className="auth-input" name="username" placeholder="Official username" value={form.username} onChange={handle} required /></div></div>
            <div><label className="input-label">Password</label>
              <div className="input-wrap"><input className="auth-input" type="password" name="password" placeholder="Password" value={form.password} onChange={handle} required /></div></div>
            <button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign In →'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
