import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [form,  setForm]  = useState({ first_name:'', last_name:'', email:'', phone:'', address:'', password:'', confirm_password:'' });
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      await api.post('/auth/register/', form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-left">
          <div className="auth-brand">🏛 LandScope</div>
          <div className="auth-left-icon">📝</div>
          <h2>Create Account</h2>
          <div className="auth-divider" />
          <p>Join thousands of citizens managing their land records digitally.</p>
        </div>
        <div className="auth-right">
          <span className="auth-badge">📋 New Registration</span>
          <h2>Sign Up</h2>
          <p className="auth-sub">Fill in your details to create your account.</p>
          {error && <div className="error-box">⚠️ {error}</div>}
          <form onSubmit={submit} className="auth-form">
            <div className="form-row">
              <div>
                <label className="input-label">First Name</label>
                <div className="input-wrap"><input className="auth-input" name="first_name" placeholder="First name" value={form.first_name} onChange={handle} required /></div>
              </div>
              <div>
                <label className="input-label">Last Name</label>
                <div className="input-wrap"><input className="auth-input" name="last_name" placeholder="Last name" value={form.last_name} onChange={handle} required /></div>
              </div>
            </div>
            <div>
              <label className="input-label">Email</label>
              <div className="input-wrap"><input className="auth-input" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handle} required /></div>
            </div>
            <div>
              <label className="input-label">Phone</label>
              <div className="input-wrap"><input className="auth-input" name="phone" placeholder="10-digit mobile number" value={form.phone} onChange={handle} /></div>
            </div>
            <div>
              <label className="input-label">Address</label>
              <div className="input-wrap"><input className="auth-input" name="address" placeholder="Your address" value={form.address} onChange={handle} /></div>
            </div>
            <div className="form-row">
              <div>
                <label className="input-label">Password</label>
                <div className="input-wrap"><input className="auth-input" type="password" name="password" placeholder="Create password" value={form.password} onChange={handle} required /></div>
              </div>
              <div>
                <label className="input-label">Confirm Password</label>
                <div className="input-wrap"><input className="auth-input" type="password" name="confirm_password" placeholder="Repeat password" value={form.confirm_password} onChange={handle} required /></div>
              </div>
            </div>
            <button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Creating account…' : 'Create Account →'}</button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}
