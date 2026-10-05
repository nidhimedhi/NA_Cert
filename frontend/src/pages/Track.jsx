import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CertificateModal from '../components/CertificateModal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Track() {
  const { ref: routeRef } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryRef = searchParams.get('ref') || routeRef || '';
  const navigate = useNavigate();

  const { user } = useAuth();
  const [inputRef, setInputRef] = useState(queryRef);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myApps, setMyApps] = useState([]);
  const [loadingMyApps, setLoadingMyApps] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [certRef, setCertRef] = useState(null);

  // Fetch tracking data for a given reference
  const fetchTracking = async (referenceNumber) => {
    if (!referenceNumber || !referenceNumber.trim()) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await api.get(`/track/?ref=${encodeURIComponent(referenceNumber.trim())}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || `No application found matching Reference Number '${referenceNumber}'.`);
    } finally {
      setLoading(false);
    }
  };

  // On initial mount or ref change in URL
  useEffect(() => {
    if (queryRef) {
      setInputRef(queryRef);
      fetchTracking(queryRef);
    }
  }, [queryRef]);

  // If logged in citizen, fetch their applications list
  useEffect(() => {
    if (user) {
      setLoadingMyApps(true);
      api.get('/citizen/applications/')
        .then(r => setMyApps(r.data.applications || []))
        .catch(() => {})
        .finally(() => setLoadingMyApps(false));
    }
  }, [user]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!inputRef.trim()) return;
    setSearchParams({ ref: inputRef.trim() });
    fetchTracking(inputRef.trim());
  };

  const handleSelectApp = (refNo) => {
    setInputRef(refNo);
    setSearchParams({ ref: refNo });
    fetchTracking(refNo);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const app = data?.application;
  const dossier = data?.dossier || {};
  const statusMeta = data?.status_meta || {};
  const steps = data?.steps || [];

  return (
    <>
      <Navbar />
      <div className="track-page-wrap" style={{ maxWidth: '1080px', margin: '30px auto 60px', padding: '0 20px', fontFamily: "'Inter', sans-serif" }}>

        {/* HERO SEARCH CARD */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '1px solid #bfdbfe' }}>
              🔍
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
                Track NA Certificate Application
              </h1>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                Enter your official Application Reference Number to track real-time progress across Collectorate and Tahsildar stages.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="e.g. NA-2026-123456"
              value={inputRef}
              onChange={e => setInputRef(e.target.value)}
              style={{
                flex: '1',
                minWidth: '260px',
                padding: '13px 18px',
                fontSize: '15px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '13px 28px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: '0.2s',
              }}
            >
              {loading ? 'Searching Registry…' : 'Track Status →'}
            </button>
          </form>
        </div>

        {/* ERROR BOX */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '16px 20px', borderRadius: '8px', marginBottom: '28px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* TRACKING TIMELINE RESULT */}
        {app && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 6px 18px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: '32px' }}>
            
            {/* RESULT HEADER */}
            <div style={{ background: '#f8fafc', padding: '22px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', letterSpacing: '0.5px' }}>Application Reference</span>
                <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                  {app.reference_no}
                </div>
              </div>
              <div>
                <span className={`status-pill status-${app.status}`} style={{ fontSize: '13px', padding: '6px 16px' }}>
                  {statusMeta.label || app.status}
                </span>
              </div>
            </div>

            {/* STAGE SUMMARY BANNER */}
            <div style={{
              padding: '16px 28px',
              background: statusMeta.color === 'green' ? '#f0fdf4' : statusMeta.color === 'red' ? '#fef2f2' : '#f0f9ff',
              borderBottom: '1px solid #e2e8f0',
              color: statusMeta.color === 'green' ? '#166534' : statusMeta.color === 'red' ? '#991b1b' : '#0369a1',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <span style={{ fontSize: '20px' }}>{statusMeta.color === 'green' ? '🎉' : statusMeta.color === 'red' ? '⚠️' : 'ℹ️'}</span>
              <span>{statusMeta.summary}</span>
            </div>

            {/* OFFICIAL SANCTION CERTIFICATE BANNER */}
            {app.status === 'collector_approved' && (
              <div style={{
                margin: '24px 28px 0',
                padding: '20px 24px',
                borderRadius: '10px',
                background: '#ecfdf5',
                border: '1.5px solid #10b981',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#065f46', marginBottom: '3px' }}>
                    🎉 Non-Agricultural (NA) Permission Sanctioned!
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#047857' }}>
                    Your official NA Layout Sanction Certificate has been digitally authorized and issued. Available in Marathi & English.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { setCertRef(app.reference_no); setShowCertModal(true); }}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      fontWeight: '800',
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(5,150,105,0.25)',
                    }}
                  >
                    📜 View & Print Official Certificate (मराठी / EN) →
                  </button>
                  <a
                    href={`/certificate/${app.reference_no}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: '#ffffff',
                      color: '#065f46',
                      border: '1px solid #a7f3d0',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '13px',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    ↗ Open Tab
                  </a>
                </div>
              </div>
            )}

            {/* 4-MILESTONE PROGRESS STEPPER */}
            <div style={{ padding: '30px 28px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '18px', letterSpacing: '0.5px' }}>
                End-to-End Governance Progress Tracker
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {steps.map(s => {
                  const isDone = s.status === 'completed';
                  const isActive = s.status === 'active';
                  const isRej = s.status === 'rejected';
                  return (
                    <div
                      key={s.step}
                      style={{
                        background: isDone ? '#f0fdf4' : isActive ? '#eff6ff' : isRej ? '#fef2f2' : '#f8fafc',
                        border: '1px solid',
                        borderColor: isDone ? '#86efac' : isActive ? '#60a5fa' : isRej ? '#fca5a5' : '#e2e8f0',
                        borderRadius: '8px',
                        padding: '18px 16px',
                        boxShadow: isActive ? '0 0 0 2px rgba(59,130,246,0.2)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        color: isDone ? '#166534' : isActive ? '#1d4ed8' : isRej ? '#991b1b' : '#94a3b8',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        {isDone ? '✅ Step ' + s.step + ' Done' : isActive ? '⏳ Step ' + s.step + ' In Progress' : isRej ? '❌ Step ' + s.step + ' Objections' : '⚪ Step ' + s.step}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '4px', lineHeight: '1.3' }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4', marginBottom: '8px' }}>
                        {s.description}
                      </div>
                      {s.timestamp && (
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                          Updated: {new Date(s.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* OFFICER REMARKS / REJECTION REASON */}
            {data?.rejection_reason && (
              <div style={{
                margin: '0 28px 24px',
                padding: '16px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                background: app.status === 'collector_rejected' || app.status === 'tahsildar_rejected' ? '#fef2f2' : '#f8fafc',
                border: '1px solid',
                borderColor: app.status === 'collector_rejected' || app.status === 'tahsildar_rejected' ? '#fca5a5' : '#cbd5e1',
                color: app.status === 'collector_rejected' || app.status === 'tahsildar_rejected' ? '#991b1b' : '#1e293b',
              }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Official Officer Remarks / Finding:</strong>
                {data.rejection_reason}
              </div>
            )}

            {/* APPLICATION DOSSIER PARTICULARS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              padding: '22px 28px',
              borderTop: '1px solid #e2e8f0',
              background: '#fcfcfd',
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Land Category:</span>
                  <strong style={{ color: '#0f172a' }}>{app.land_type}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Applicant:</span>
                  <strong style={{ color: '#0f172a' }}>{dossier.applicant_name || app.user_email}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '14px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Gat / Survey Number:</span>
                  <code style={{ color: '#0f172a', fontWeight: 'bold' }}>{dossier.gat_number || 'Recorded'}</code>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Village / Taluka:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {dossier.village ? `${dossier.village}, ${dossier.taluka}` : 'Jurisdiction on file'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Total Proposed Area:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {dossier.area_sqmt ? `${dossier.area_sqmt} Sq.m` : 'As per layout'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '14px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Filing Date:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {new Date(app.submitted_at || app.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </strong>
                </div>
              </div>
            </div>

            {/* ACTION BAR */}
            <div style={{ padding: '16px 28px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Verification inquiries are governed under Section 44 of Maharashtra Land Revenue Code, 1966.
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => window.print()}
                  style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: '700', color: '#334155', cursor: 'pointer' }}
                >
                  🖨️ Print Status Record
                </button>
              </div>
            </div>

          </div>
        )}

        {/* MY APPLICATIONS HISTORY (FOR LOGGED IN CITIZENS) */}
        {user && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px 28px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                My Applications History ({myApps.length})
              </h2>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Logged in as <strong>{user.user_email}</strong></span>
            </div>

            {loadingMyApps ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>Loading your previous filings…</p>
            ) : myApps.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>You haven't filed any NA applications yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>Reference No.</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>Land Category</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>Submitted Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>Current Status</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#475569' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myApps.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px' }}>
                          <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{a.reference_no}</strong>
                        </td>
                        <td style={{ padding: '12px', color: '#334155' }}>{a.land_type}</td>
                        <td style={{ padding: '12px', color: '#64748b' }}>
                          {new Date(a.submitted_at || a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className={`status-pill status-${a.status}`}>{a.status}</span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleSelectApp(a.reference_no)}
                            style={{
                              background: '#0f172a',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '4px',
                              fontWeight: '700',
                              fontSize: '12px',
                              cursor: 'pointer',
                              marginRight: '8px',
                            }}
                          >
                            Track Status →
                          </button>
                          {a.status === 'collector_approved' && (
                            <button
                              onClick={() => { setCertRef(a.reference_no); setShowCertModal(true); }}
                              style={{
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              📜 Certificate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* INTERACTIVE BILINGUAL CERTIFICATE MODAL */}
      <CertificateModal
        isOpen={showCertModal}
        onClose={() => setShowCertModal(false)}
        referenceNumber={certRef || app?.reference_no}
      />
    </>
  );
}

