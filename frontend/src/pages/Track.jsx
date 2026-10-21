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
  const isGrantedFlow = data?.is_granted_flow || false;

  return (
    <>
      <Navbar />
      <div className="track-page-wrap" style={{ maxWidth: '1080px', margin: '36px auto 70px', padding: '0 24px', fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

        {/* HERO SEARCH CARD */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '28px 32px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe', flexShrink: 0 }}>
              <SearchIcon size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f2942', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                Track Statutory NA Conversion Petition
              </h1>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>
                Enter your official revenue application reference number to track live statutory adjudication across Taluka Tahsildar, Collectorate, and Maharashtra State Secretariat.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
              <input
                type="text"
                placeholder="e.g. NA-2026-XXXXXX"
                value={inputRef}
                onChange={e => setInputRef(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 18px 12px 38px',
                  fontSize: '14.5px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <SearchIcon size={16} />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 26px',
                background: '#0f2942',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.15s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#173b5d'}
              onMouseOut={e => e.currentTarget.style.background = '#0f2942'}
            >
              {loading ? 'Searching Registry…' : <><span>Track Petition</span> <ArrowRightIcon size={14} /></>}
            </button>
          </form>
        </div>

        {/* ERROR BOX */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '14px 18px', borderRadius: '6px', marginBottom: '28px', fontSize: '13.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangleIcon size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* TRACKING TIMELINE RESULT */}
        {app && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden', marginBottom: '32px' }}>
            
            {/* RESULT HEADER */}
            <div style={{ background: '#f8fafc', padding: '22px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '800', letterSpacing: '0.6px' }}>Official Application Reference</span>
                <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '20px', fontWeight: '800', color: '#0f2942', marginTop: '2px' }}>
                  {app.reference_no}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span style={{
                    background: isGrantedFlow ? '#eff6ff' : '#f0fdf4',
                    color: isGrantedFlow ? '#1e40af' : '#166534',
                    border: `1px solid ${isGrantedFlow ? '#bfdbfe' : '#bbf7d0'}`,
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <ScaleIcon size={13} />
                    {isGrantedFlow
                      ? 'Granted Tenure Track: Collector Desk → Maharashtra State Secretariat (मंत्रालय) → Final Decree'
                      : 'Private Land Track: Collector Desk → Taluka Tahsildar Field Inquiry → Final Sanction'}
                  </span>
                </div>
              </div>
              <div>
                <span className={`status-pill status-${app.status}`} style={{ fontSize: '12px', padding: '6px 14px' }}>
                  {statusMeta.label || app.status}
                </span>
              </div>
            </div>

            {/* STAGE SUMMARY BANNER */}
            <div style={{
              padding: '14px 28px',
              background: statusMeta.color === 'green' ? '#f0fdf4' : statusMeta.color === 'red' ? '#fef2f2' : '#f0f9ff',
              borderBottom: '1px solid #e2e8f0',
              color: statusMeta.color === 'green' ? '#166534' : statusMeta.color === 'red' ? '#991b1b' : '#0369a1',
              fontSize: '13.5px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              {statusMeta.color === 'green' ? <CheckCircleIcon size={18} /> : statusMeta.color === 'red' ? <AlertTriangleIcon size={18} /> : <ShieldCheckIcon size={18} />}
              <span>{statusMeta.summary}</span>
            </div>

            {/* OFFICIAL SANCTION CERTIFICATE BANNER */}
            {app.status === 'collector_approved' && (
              <div style={{
                margin: '24px 28px 0',
                padding: '20px 24px',
                borderRadius: '8px',
                background: '#ecfdf5',
                border: '1.5px solid #10b981',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#065f46', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircleIcon size={18} /> Non-Agricultural Sanction Order Decree Authorized
                  </div>
                  <div style={{ fontSize: '13px', color: '#047857' }}>
                    Your official NA conversion certificate under Section 44 of MLRC 1966 is digitally signed with secure QR code verification.
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
                      padding: '9px 18px',
                      borderRadius: '6px',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 1px 3px rgba(5,150,105,0.25)',
                    }}
                  >
                    <FileTextIcon size={15} /> View Official Certificate (मराठी / EN)
                  </button>
                  <a
                    href={`/certificate/${app.reference_no}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: '#ffffff',
                      color: '#065f46',
                      border: '1px solid #a7f3d0',
                      padding: '9px 14px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '12.5px',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Open Standalone Tab
                  </a>
                </div>
              </div>
            )}

            {/* 4-MILESTONE PROGRESS STEPPER */}
            <div style={{ padding: '26px 28px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.6px' }}>
                {isGrantedFlow ? 'Granted Land Governance Milestone Tracker' : 'Statutory Inquiry & Adjudication Milestones'}
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
                        borderRadius: '6px',
                        padding: '16px 14px',
                        boxShadow: isActive ? '0 0 0 2px rgba(59,130,246,0.15)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        color: isDone ? '#166534' : isActive ? '#1d4ed8' : isRej ? '#991b1b' : '#64748b',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        {isDone ? (
                          <><CheckIcon size={12} className="text-emerald-700" /> Milestone {s.step} Completed</>
                        ) : isActive ? (
                          <><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb' }}></span> Milestone {s.step} In Progress</>
                        ) : isRej ? (
                          <><AlertTriangleIcon size={12} className="text-red-700" /> Milestone {s.step} Objections</>
                        ) : (
                          <>Milestone {s.step}</>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '4px', lineHeight: '1.35' }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.45', marginBottom: '8px' }}>
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
                borderRadius: '6px',
                fontSize: '13.5px',
                background: app.status === 'collector_rejected' || app.status === 'tahsildar_rejected' ? '#fef2f2' : '#f8fafc',
                border: '1px solid',
                borderColor: app.status === 'collector_rejected' || app.status === 'tahsildar_rejected' ? '#fca5a5' : '#cbd5e1',
                color: app.status === 'collector_rejected' || app.status === 'tahsildar_rejected' ? '#991b1b' : '#1e293b',
              }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Official Revenue Officer Finding:</strong>
                {data.rejection_reason}
              </div>
            )}

            {/* APPLICATION DOSSIER PARTICULARS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              padding: '20px 28px',
              borderTop: '1px solid #e2e8f0',
              background: '#fafbfd',
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13.5px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Land Classification:</span>
                  <strong style={{ color: '#0f172a' }}>{app.land_type}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13.5px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Applicant / Title Holder:</span>
                  <strong style={{ color: '#0f172a' }}>{dossier.applicant_name || app.user_email}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: '13.5px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Gat / Survey Cadastre:</span>
                  <code style={{ color: '#0f172a', fontWeight: 'bold' }}>{dossier.gat_number || 'Recorded on Form 7/12'}</code>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13.5px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Taluka / Revenue Circle:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {dossier.village ? `${dossier.village}, ${dossier.taluka}` : 'Jurisdiction on record'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13.5px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Sanction Area:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {dossier.area_sqmt ? `${dossier.area_sqmt} Sq. Meters` : 'As per demarcated layout'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: '13.5px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Date of Submission:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {new Date(app.submitted_at || app.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </strong>
                </div>
              </div>
            </div>

            {/* ACTION BAR */}
            <div style={{ padding: '14px 28px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                Statutory inquiry & adjudication under Section 44 of Maharashtra Land Revenue Code, 1966.
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{ padding: '7px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '12.5px', fontWeight: '700', color: '#334155', cursor: 'pointer' }}
                >
                  Print Status Dossier
                </button>
              </div>
            </div>

          </div>
        )}

        {/* MY APPLICATIONS HISTORY (FOR LOGGED IN CITIZENS) */}
        {user && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px 28px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2942', margin: 0 }}>
                My Filed Applications Registry ({myApps.length})
              </h2>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>Applicant Account: <strong>{user.user_email}</strong></span>
            </div>

            {loadingMyApps ? (
              <p style={{ color: '#64748b', fontSize: '13.5px' }}>Retrieving your filing records…</p>
            ) : myApps.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13.5px' }}>No previous NA conversion petitions registered under this profile.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>Reference No.</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>Land Category</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>Submission Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>Current Status</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#475569' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myApps.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px' }}>
                          <code style={{ color: '#0f2942', fontWeight: '700' }}>{a.reference_no}</code>
                        </td>
                        <td style={{ padding: '12px', color: '#334155', fontWeight: '600' }}>{a.land_type}</td>
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
                              background: '#0f2942',
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
                            Inspect Status →
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
                              Certificate
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

