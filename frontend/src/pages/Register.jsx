import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  StateEmblem,
  ShieldCheckIcon,
  LockIcon,
  UserIcon,
  AlertCircleIcon,
  BuildingIcon,
} from '../components/Icons';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match. Please verify your password entry.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/register/', form);
      alert('Citizen registration successful! Please sign in with your email and password.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please check the provided information.');
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
              <ShieldCheckIcon size={14} /> Official Citizen Registration
            </span>
            <Link to="/" className="gov-return-home">
              ← Public Portal Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Authentic Terminal Layout */}
      <main className="gov-auth-main">
        <div className="gov-auth-card gov-auth-card--wide">
          {/* LEFT: Institutional Information Panel */}
          <section className="gov-auth-left" aria-label="Registration Guidance">
            <div className="gov-auth-emblem-wrap">
              <StateEmblem size={56} color="#d97706" />
            </div>

            <div className="gov-auth-office-header">
              <span className="gov-office-subtitle">GOVERNMENT OF MAHARASHTRA</span>
              <h1 className="gov-office-title">Citizen Registration</h1>
              <p className="gov-office-jurisdiction">
                Create an official applicant profile for online Non-Agricultural land permission processing.
              </p>
            </div>

            <div className="gov-auth-rule-divider" />

            <div className="gov-citizen-info-card">
              <h3 className="gov-citizen-info-title">Mandatory Applicant Requirements</h3>
              <ul className="gov-citizen-service-list">
                <li><span>●</span> Provide accurate legal name matching 7/12 land revenue records</li>
                <li><span>●</span> Working mobile number for OTP alerts and Tahsildar site-visit schedules</li>
                <li><span>●</span> Valid email address to receive digitally signed Collector orders</li>
              </ul>
            </div>

            <div className="gov-compliance-panel">
              <div className="gov-compliance-item">
                <ShieldCheckIcon size={15} className="gov-compliance-icon" />
                <span>Protected under the Digital Personal Data Protection Act (DPDPA)</span>
              </div>
            </div>
          </section>

          {/* RIGHT: Registration Form */}
          <section className="gov-auth-right" aria-label="Citizen Registration Form">
            <div className="gov-auth-terminal-header">
              <div className="gov-terminal-badge">
                <ShieldCheckIcon size={13} /> Citizen Profile Enrollment
              </div>
              <h2 className="gov-terminal-title">Create Citizen Profile</h2>
              <p className="gov-terminal-subtitle">
                Enter your details to initiate NA land application, document verification, and status tracking.
              </p>
            </div>

            {error && (
              <div className="gov-alert-error" role="alert">
                <AlertCircleIcon size={18} />
                <div>
                  <strong>Registration Notice:</strong> {error}
                </div>
              </div>
            )}

            <form onSubmit={submit} className="gov-terminal-form">
              <div className="gov-form-grid-2">
                <div className="gov-input-group">
                  <label className="gov-label" htmlFor="reg-fname">First Name</label>
                  <div className="gov-input-wrap">
                    <span className="gov-input-icon"><UserIcon size={16} /></span>
                    <input
                      id="reg-fname"
                      className="gov-input"
                      name="first_name"
                      placeholder="Legal first name"
                      value={form.first_name}
                      onChange={handle}
                      required
                    />
                  </div>
                </div>

                <div className="gov-input-group">
                  <label className="gov-label" htmlFor="reg-lname">Last Name / Surname</label>
                  <div className="gov-input-wrap">
                    <span className="gov-input-icon"><UserIcon size={16} /></span>
                    <input
                      id="reg-lname"
                      className="gov-input"
                      name="last_name"
                      placeholder="Legal surname"
                      value={form.last_name}
                      onChange={handle}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="gov-form-grid-2">
                <div className="gov-input-group">
                  <label className="gov-label" htmlFor="reg-email">Email Address</label>
                  <div className="gov-input-wrap">
                    <span className="gov-input-icon">@</span>
                    <input
                      id="reg-email"
                      className="gov-input"
                      type="email"
                      name="email"
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={handle}
                      required
                    />
                  </div>
                </div>

                <div className="gov-input-group">
                  <label className="gov-label" htmlFor="reg-phone">10-Digit Mobile Number</label>
                  <div className="gov-input-wrap">
                    <span className="gov-input-icon">+91</span>
                    <input
                      id="reg-phone"
                      className="gov-input"
                      name="phone"
                      placeholder="98XXXXXXXX"
                      value={form.phone}
                      onChange={handle}
                    />
                  </div>
                </div>
              </div>

              <div className="gov-input-group">
                <label className="gov-label" htmlFor="reg-addr">Postal Address of Applicant</label>
                <div className="gov-input-wrap">
                  <span className="gov-input-icon"><BuildingIcon size={16} /></span>
                  <input
                    id="reg-addr"
                    className="gov-input"
                    name="address"
                    placeholder="House/Plot No., Village/City, Taluka, District, PIN Code"
                    value={form.address}
                    onChange={handle}
                  />
                </div>
              </div>

              <div className="gov-form-grid-2">
                <div className="gov-input-group">
                  <label className="gov-label" htmlFor="reg-pass">Create Account Password</label>
                  <div className="gov-input-wrap">
                    <span className="gov-input-icon"><LockIcon size={16} /></span>
                    <input
                      id="reg-pass"
                      className="gov-input"
                      type="password"
                      name="password"
                      placeholder="Minimum 8 characters"
                      value={form.password}
                      onChange={handle}
                      required
                    />
                  </div>
                </div>

                <div className="gov-input-group">
                  <label className="gov-label" htmlFor="reg-cpass">Confirm Account Password</label>
                  <div className="gov-input-wrap">
                    <span className="gov-input-icon"><LockIcon size={16} /></span>
                    <input
                      id="reg-cpass"
                      className="gov-input"
                      type="password"
                      name="confirm_password"
                      placeholder="Repeat password"
                      value={form.confirm_password}
                      onChange={handle}
                      required
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="gov-btn-primary-action" disabled={busy}>
                {busy ? 'Creating Official Profile…' : 'Complete Citizen Registration'}
              </button>
            </form>

            <div className="gov-auth-switch-box">
              <span>Already have an active applicant profile?</span>
              <Link to="/login" className="gov-auth-switch-link">Sign In to Account</Link>
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
