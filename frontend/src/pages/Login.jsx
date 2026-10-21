import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  StateEmblem,
  ShieldCheckIcon,
  LockIcon,
  UserIcon,
  AlertCircleIcon,
  BuildingIcon,
} from '../components/Icons';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,  setForm]  = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/upload');
    } catch (err) {
      if (!err.response) {
        setError('Backend server is offline or unreachable (http://127.0.0.1:8000). Please ensure backend is running.');
      } else {
        setError(err.response?.data?.error || 'Authentication rejected. Please check email and password.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gov-auth-container">
      {/* Top Institutional Banner */}
      <header className="gov-auth-topbar">
        <div className="gov-auth-topbar-inner">
          <div className="gov-auth-brand-left">
            <span className="gov-dot-live">●</span>
            <span className="gov-auth-topbar-txt">
              महाराष्ट्र शासन • Government of Maharashtra | Revenue & Forest Department
            </span>
          </div>
          <div className="gov-auth-security-info">
            <span className="gov-badge-secure">
              <ShieldCheckIcon size={14} /> Citizen Self-Service Portal
            </span>
            <Link to="/" className="gov-return-home">
              ← Back to Portal Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Authentic Terminal Layout */}
      <main className="gov-auth-main">
        <div className="gov-auth-card">
          {/* LEFT: Institutional Information Panel */}
          <section className="gov-auth-left" aria-label="Portal Information">
            <div className="gov-auth-emblem-wrap">
              <StateEmblem size={56} color="#d97706" />
            </div>

            <div className="gov-auth-office-header">
              <span className="gov-office-subtitle">GOVERNMENT OF MAHARASHTRA</span>
              <h1 className="gov-office-title">MahaLand Citizen Services</h1>
              <p className="gov-office-jurisdiction">
                Single Window System for Non-Agricultural (NA) Land Permissions under MLRC 1966 Section 44.
              </p>
            </div>

            <div className="gov-auth-rule-divider" />

            <div className="gov-citizen-info-card">
              <h3 className="gov-citizen-info-title">Citizen e-Services Available</h3>
              <ul className="gov-citizen-service-list">
                <li><span>✓</span> Apply for Land Conversion (Residential / Commercial / Industrial)</li>
                <li><span>✓</span> Real-Time Application Tracking with SMS & Email Alerts</li>
                <li><span>✓</span> Download Digitally Signed Sanction Orders & Collector Certificates</li>
                <li><span>✓</span> Direct Grievance Redressal & Field Panchnama Verification</li>
              </ul>
            </div>

            <div className="gov-compliance-panel">
              <div className="gov-compliance-item">
                <ShieldCheckIcon size={15} className="gov-compliance-icon" />
                <span>e-Governance & Right to Public Services Act (RTS) Compliant</span>
              </div>
              <div className="gov-compliance-item">
                <BuildingIcon size={15} className="gov-compliance-icon" />
                <span>DigiLocker Integration Ready for 7/12 & 8-A Extract Verification</span>
              </div>
            </div>
          </section>

          {/* RIGHT: Login Terminal */}
          <section className="gov-auth-right" aria-label="Citizen Sign In Form">
            <div className="gov-auth-terminal-header">
              <div className="gov-terminal-badge">
                <ShieldCheckIcon size={13} /> Citizen Access Gateway
              </div>
              <h2 className="gov-terminal-title">Sign In to Your Account</h2>
              <p className="gov-terminal-subtitle">
                Access your applications, upload compliance documents, and retrieve digitally signed NA certificates.
              </p>
            </div>

            {error && (
              <div className="gov-alert-error" role="alert">
                <AlertCircleIcon size={18} />
                <div>
                  <strong>Sign In Notice:</strong> {error}
                </div>
              </div>
            )}

            <form onSubmit={submit} className="gov-terminal-form">
              <div className="gov-input-group">
                <label className="gov-label" htmlFor="cit-email">Registered Email Address</label>
                <div className="gov-input-wrap">
                  <span className="gov-input-icon"><UserIcon size={16} /></span>
                  <input
                    id="cit-email"
                    className="gov-input"
                    type="email"
                    name="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={handle}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="gov-input-group">
                <label className="gov-label" htmlFor="cit-pass">Account Password</label>
                <div className="gov-input-wrap">
                  <span className="gov-input-icon"><LockIcon size={16} /></span>
                  <input
                    id="cit-pass"
                    className="gov-input"
                    type="password"
                    name="password"
                    placeholder="Enter account password"
                    value={form.password}
                    onChange={handle}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button type="submit" className="gov-btn-primary-action" disabled={busy}>
                {busy ? 'Verifying Account…' : 'Sign In to MahaLand'}
              </button>
            </form>

            <div className="gov-auth-switch-box">
              <span>New applicant or property owner?</span>
              <Link to="/register" className="gov-auth-switch-link">Create a Citizen Account</Link>
            </div>

            {/* Departmental Portal Switcher */}
            <div className="gov-portal-switcher">
              <span className="gov-switcher-label">Officer & Administrative Desks:</span>
              <div className="gov-switcher-links">
                <Link to="/tahsildar/login" className="gov-chip-link">Tahsildar Desk</Link>
                <Link to="/collector/login" className="gov-chip-link">District Collectorate</Link>
                <Link to="/state-govt/login" className="gov-chip-link">State Secretariat</Link>
                <span className="gov-chip-active">Citizen Portal</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Official Government Footer */}
      <footer className="gov-auth-footer">
        <div className="gov-auth-footer-inner">
          <div className="gov-footer-compliance">
            National Informatics Centre (NIC) Security Framework • Certified ISO/IEC 27001 Gateway • End-to-End Encrypted (TLS 1.3)
          </div>
          <div className="gov-footer-copy">
            © 2026 Government of Maharashtra. All Rights Reserved. Revenue & Forest Department.
          </div>
        </div>
      </footer>
    </div>
  );
}
