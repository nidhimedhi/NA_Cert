import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './StateGovt.css';

const api = axios.create({ baseURL: 'http://127.0.0.1:8000/api' });

export default function StateGovtPortal() {
  const [apps, setApps] = useState([]);
  const [counts, setCounts] = useState({
    total_referrals: 0,
    pending_state: 0,
    forwarded_from_collector: 0,
    state_govt_approved: 0,
    state_govt_rejected: 0,
    educational: 0,
    industrial: 0,
    commercial: 0,
    granted: 0,
    semi_granted: 0,
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Accessibility and Language
  const [fontSize, setFontSize] = useState('normal');
  const [lang, setLang] = useState('en');

  // Selected dossier for review
  const [selectedApp, setSelectedApp] = useState(null);
  const [modalTab, setModalTab] = useState('memo'); // 'memo' | 'docs' | 'issue_gr'
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState(null);

  // GR Issuance form
  const [grNumber, setGrNumber] = useState('');
  const [officerName, setOfficerName] = useState('Shri V. K. Sawant, IAS');
  const [designation, setDesignation] = useState('Joint Secretary, Revenue & Forest Dept, Govt of Maharashtra');
  const [sanctionDate, setSanctionDate] = useState(new Date().toISOString().split('T')[0]);
  const [decreeRemarks, setDecreeRemarks] = useState('');
  const [grBusy, setGrBusy] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Print-ready GR view modal
  const [viewGrModal, setViewGrModal] = useState(null);

  const fetchApplications = () => {
    setLoading(true);
    let url = `/state-govt/applications/?status=${statusFilter}&category=${categoryFilter}`;
    if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

    api.get(url)
      .then(res => {
        setApps(res.data.applications || []);
        if (res.data.counts) setCounts(res.data.counts);
      })
      .catch(err => console.error('Failed to load state applications:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchApplications(), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const openDossier = (app, initialTab = 'memo') => {
    setSelectedApp(app);
    setModalTab(initialTab);
    setDossierLoading(true);
    setActionSuccess('');
    setGrNumber(`MAH-REV-GR-2026/CR-${(app.reference_no || '0000').slice(-4)}/J1`);
    setDecreeRemarks(`Sanction granted under MLRC 1966 Section 44 for ${app.land_type} conversion, subject to Nazrana assessment and adherence to original grant conditions.`);

    api.get(`/state-govt/applications/${app.id}/`)
      .then(res => setDossierData(res.data))
      .catch(err => console.error('Error fetching dossier:', err))
      .finally(() => setDossierLoading(false));
  };

  const handleIssueGR = async (e) => {
    if (e) e.preventDefault();
    if (!selectedApp) return;
    setGrBusy(true);

    try {
      const payload = {
        gr_number: grNumber,
        officer_name: officerName,
        designation: designation,
        sanctionDate: sanctionDate,
        remarks: decreeRemarks,
        stipulations: [
          'Land usage strictly restricted to the approved institutional/industrial purpose.',
          'No unauthorized transfer or lease without prior sanction of the State Government.',
          'District Collector to determine final conversion tax & issue official Sanad.'
        ]
      };

      await api.post(`/state-govt/applications/${selectedApp.id}/approve/`, payload);
      setActionSuccess(`Government Resolution (${grNumber}) successfully issued and archived.`);
      setGrBusy(false);
      fetchApplications();
      api.get(`/state-govt/applications/${selectedApp.id}/`).then(r => setDossierData(r.data));
    } catch (err) {
      alert('Failed to issue State GR: ' + (err.response?.data?.error || err.message));
      setGrBusy(false);
    }
  };

  const handleStateReject = async () => {
    const queryReason = prompt('Enter official Secretariat objection or query for Collector:');
    if (!queryReason) return;
    setGrBusy(true);

    try {
      await api.post(`/state-govt/applications/${selectedApp.id}/reject/`, { reason: queryReason });
      setActionSuccess('Objection recorded. File returned to Collector desk.');
      setGrBusy(false);
      fetchApplications();
    } catch (err) {
      alert('Failed to record objection: ' + err.message);
      setGrBusy(false);
    }
  };

  const getPill = (landType) => {
    if (landType?.toLowerCase().includes('semi-granted')) {
      return <span className="tag-semi-granted">Semi-Granted</span>;
    }
    return <span className="tag-granted">Granted</span>;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'state_govt_approved':
        return <span className="badge-state-approved">Approved (GR Issued)</span>;
      case 'forwarded_to_state_govt':
        return <span className="badge-state-pending">Under Scrutiny</span>;
      case 'state_govt_rejected':
        return <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>Objection Raised</span>;
      case 'tahsildar_verified':
        return <span className="badge-collector-ready">Collector Referral</span>;
      default:
        return <span className="badge-state-pending">{status?.replace(/_/g, ' ') || 'Referred'}</span>;
    }
  };

  return (
    <div className={`gov-portal-root ${fontSize === 'large' ? 'font-large' : fontSize === 'xlarge' ? 'font-xlarge' : ''}`}>
      
      {/* ── 1. TOP UTILITY STRIP ── */}
      <div className="gov-top-bar">
        <div className="gov-top-left">
          <div className="gov-flag">
            <span className="flag-orange"></span>
            <span className="flag-white"></span>
            <span className="flag-green"></span>
          </div>
          <span className="gov-top-title">
            {lang === 'mr' ? 'महाराष्ट्र शासन | महसूल व वन विभाग' : 'Government of Maharashtra | Revenue & Forest Department'}
          </span>
          <span style={{ color: '#475569' }}>•</span>
          <span>Mantralaya, Mumbai</span>
        </div>

        <div className="gov-top-right">
          <span style={{ fontSize: '11px' }}>Text Size:</span>
          <button className={`gov-access-btn ${fontSize === 'normal' ? 'active' : ''}`} onClick={() => setFontSize('normal')}>A-</button>
          <button className={`gov-access-btn ${fontSize === 'large' ? 'active' : ''}`} onClick={() => setFontSize('large')}>A</button>
          <button className={`gov-access-btn ${fontSize === 'xlarge' ? 'active' : ''}`} onClick={() => setFontSize('xlarge')}>A+</button>

          <select className="gov-lang-select" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="mr">मराठी</option>
          </select>

          <Link to="/" className="gov-link-pill">Citizen Portal</Link>
          <Link to="/collector/dashboard" className="gov-badge-collector">Collector Portal</Link>
          <Link to="/tahsildar/dashboard" className="gov-link-pill">Tahsildar Desk</Link>
        </div>
      </div>

      {/* ── 2. APEX BRANDING HEADER ── */}
      <header className="gov-header">
        <div className="gov-header-inner">
          <Link to="/maharashtra-govt" className="gov-brand">
            <div className="gov-emblem-icon">
              🏛️
            </div>
            <div className="gov-brand-headings">
              <h1>Government of Maharashtra</h1>
              <div className="sub-head">Secretariat for Granted & Semi-Granted NA Sanctions</div>
              <div className="sub-caption">Maharashtra Land Revenue Code 1966 • Section 44</div>
            </div>
          </Link>

          <div className="gov-header-stats">
            <div className="gov-header-stat-item">
              <div className="val">{counts.total_referrals}</div>
              <div className="lbl">Referrals</div>
            </div>
            <div className="gov-header-stat-item">
              <div className="val">{counts.pending_state}</div>
              <div className="lbl">In Review</div>
            </div>
            <div className="gov-header-stat-item">
              <div className="val">{counts.state_govt_approved}</div>
              <div className="lbl">Sanctioned GRs</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── 3. HERO COMPACT SECTION ── */}
      <section className="gov-hero-compact">
        <div className="gov-hero-compact-inner">
          <div className="gov-hero-text">
            <h2>
              State Secretariat Desk <span>• Educational, Commercial & Industrial Grants</span>
            </h2>
            <p>
              Dedicated State Government Secretariat desk for <strong>Educational, Commercial, and Industrial</strong> Granted & Semi-Granted NA referrals under MLRC 1966 Section 44. (All remaining routine applications are processed at the Tahsildar Portal).
            </p>
          </div>

          <div className="gov-hero-search">
            <label className="gov-hero-search-label">Quick Search Applications</label>
            <div className="gov-search-bar-row">
              <input
                type="text"
                className="gov-search-input"
                placeholder="Search ref no, applicant, district..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="gov-search-btn" onClick={fetchApplications}>
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. CATEGORY TILES (INTERACTIVE FILTERS) ── */}
      <section className="gov-tiles-container">
        <div className="gov-tiles-grid">
          
          <div 
            className={`gov-tile-card ${categoryFilter === 'all' && statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => { setCategoryFilter('all'); setStatusFilter('all'); }}
          >
            <div className="gov-tile-left">
              <div className="gov-tile-icon-box icon-box-blue">📋</div>
              <div className="gov-tile-info">
                <h3>All Referrals</h3>
                <span>All Collector dossiers</span>
              </div>
            </div>
            <div className="gov-tile-count-badge">{counts.total_referrals}</div>
          </div>

          <div 
            className={`gov-tile-card ${categoryFilter === 'Educational' ? 'active' : ''}`}
            onClick={() => { setCategoryFilter('Educational'); setStatusFilter('all'); }}
          >
            <div className="gov-tile-left">
              <div className="gov-tile-icon-box icon-box-purple">🎓</div>
              <div className="gov-tile-info">
                <h3>Educational Grants</h3>
                <span>50% Nazrana • Trust land</span>
              </div>
            </div>
            <div className="gov-tile-count-badge">{counts.educational}</div>
          </div>

          <div 
            className={`gov-tile-card ${categoryFilter === 'Commercial' ? 'active' : ''}`}
            onClick={() => { setCategoryFilter('Commercial'); setStatusFilter('all'); }}
          >
            <div className="gov-tile-left">
              <div className="gov-tile-icon-box icon-box-blue">🏢</div>
              <div className="gov-tile-info">
                <h3>Commercial Grants</h3>
                <span>75% Nazrana • Trade plots</span>
              </div>
            </div>
            <div className="gov-tile-count-badge">{counts.commercial}</div>
          </div>

          <div 
            className={`gov-tile-card ${categoryFilter === 'Industrial' ? 'active' : ''}`}
            onClick={() => { setCategoryFilter('Industrial'); setStatusFilter('all'); }}
          >
            <div className="gov-tile-left">
              <div className="gov-tile-icon-box icon-box-amber">🏭</div>
              <div className="gov-tile-info">
                <h3>Industrial Aided</h3>
                <span>MIDC & subsidized plots</span>
              </div>
            </div>
            <div className="gov-tile-count-badge">{counts.industrial}</div>
          </div>

          <div 
            className={`gov-tile-card ${statusFilter === 'state_govt_approved' ? 'active' : ''}`}
            onClick={() => { setStatusFilter('state_govt_approved'); setCategoryFilter('all'); }}
          >
            <div className="gov-tile-left">
              <div className="gov-tile-icon-box icon-box-green">📜</div>
              <div className="gov-tile-info">
                <h3>Issued State GRs</h3>
                <span>Official sanctioned decrees</span>
              </div>
            </div>
            <div className="gov-tile-count-badge">{counts.state_govt_approved}</div>
          </div>

        </div>
      </section>

      {/* ── 5. MAIN WORKSPACE TABLE ── */}
      <main className="gov-workspace-wrap">
        <div className="gov-card-main">
          
          <div className="gov-card-toolbar">
            <div className="gov-toolbar-left">
              <h2 className="gov-toolbar-title">Collector Referrals for State Sanction</h2>
              <span className="gov-toolbar-count">{apps.length} Files</span>
            </div>

            <div className="gov-filter-pill-group">
              <button 
                className={`gov-pill-tab ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All Files
              </button>
              <button 
                className={`gov-pill-tab ${statusFilter === 'forwarded_to_state_govt' ? 'active' : ''}`}
                onClick={() => setStatusFilter('forwarded_to_state_govt')}
              >
                Pending Review ({counts.pending_state})
              </button>
              <button 
                className={`gov-pill-tab ${statusFilter === 'state_govt_approved' ? 'active' : ''}`}
                onClick={() => setStatusFilter('state_govt_approved')}
              >
                Approved GRs ({counts.state_govt_approved})
              </button>
            </div>
          </div>

          <div className="gov-table-container">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                Loading forwarded dossiers...
              </div>
            ) : apps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>No applications match the current filter.</p>
                <span style={{ fontSize: '12px' }}>Forward Granted or Semi-Granted records from the Collector Desk to view them here.</span>
              </div>
            ) : (
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Ref ID & Date</th>
                    <th>Applicant / Trust</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Collector Recommendation</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <div className="code-ref">{app.reference_no}</div>
                        <div className="sub-meta">{new Date(app.submitted_at).toLocaleDateString('en-IN')}</div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--gov-navy-950)' }}>{app.applicant_name || 'Sanstha Name'}</div>
                        <div className="sub-meta">{app.user_email}</div>
                      </td>

                      <td>
                        {getPill(app.land_type)}
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{app.land_type}</div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600 }}>Gut {app.gut_no || '74/2'}</div>
                        <div className="sub-meta">{app.village || 'Vadgaon'}, {app.district || 'Pune'}</div>
                      </td>

                      <td style={{ maxWidth: '240px' }}>
                        {app.collector_forward_memo ? (
                          <div style={{ fontSize: '11.5px', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: '4px' }}>
                            {app.collector_forward_memo.slice(0, 75)}...
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11.5px', fontStyle: 'italic' }}>Pending memo</span>
                        )}
                      </td>

                      <td>{getStatusBadge(app.status)}</td>

                      <td>
                        <button className="btn-scrutinize" onClick={() => openDossier(app, 'memo')}>
                          Review Dossier
                        </button>
                        {app.status === 'state_govt_approved' && (
                          <button 
                            className="btn-view-gr"
                            onClick={() => {
                              openDossier(app, 'issue_gr');
                              setTimeout(() => setViewGrModal(app), 300);
                            }}
                          >
                            View GR
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </main>

      {/* ── 6. COMPACT DOSSIER REVIEW MODAL ── */}
      {selectedApp && (
        <div className="gov-modal-backdrop" onClick={() => setSelectedApp(null)}>
          <div className="gov-modal-box" onClick={(e) => e.stopPropagation()}>
            
            <div className="gov-modal-header">
              <h3>Dossier Review: {selectedApp.reference_no}</h3>
              <button className="gov-close-btn" onClick={() => setSelectedApp(null)}>✕</button>
            </div>

            <div className="gov-modal-tabs">
              <button 
                className={`gov-modal-tab-btn ${modalTab === 'memo' ? 'active' : ''}`}
                onClick={() => setModalTab('memo')}
              >
                1. Collector & Tahsildar Report
              </button>
              <button 
                className={`gov-modal-tab-btn ${modalTab === 'docs' ? 'active' : ''}`}
                onClick={() => setModalTab('docs')}
              >
                2. Statutory Documents (5/5)
              </button>
              <button 
                className={`gov-modal-tab-btn ${modalTab === 'issue_gr' ? 'active' : ''}`}
                onClick={() => setModalTab('issue_gr')}
              >
                3. Issue Government Resolution (GR)
              </button>
            </div>

            <div className="gov-modal-content">
              {actionSuccess && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#166534', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontWeight: 600 }}>
                  ✓ {actionSuccess}
                </div>
              )}

              {dossierLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading dossier records...
                </div>
              ) : (
                <>
                  {/* TAB 1: Memo & Tahsildar report */}
                  {modalTab === 'memo' && (
                    <div>
                      <div className="gov-info-grid">
                        <div className="gov-info-card">
                          <div className="lbl">Applicant / Sanstha</div>
                          <div className="val">{selectedApp.applicant_name || 'Sanstha Name'}</div>
                        </div>
                        <div className="gov-info-card">
                          <div className="lbl">Classification</div>
                          <div className="val">{selectedApp.land_type}</div>
                        </div>
                        <div className="gov-info-card">
                          <div className="lbl">Land Parcel</div>
                          <div className="val">Gut No. {selectedApp.gut_no || '74/2'}, Area 1.20 Ha</div>
                        </div>
                        <div className="gov-info-card">
                          <div className="lbl">Location</div>
                          <div className="val">{selectedApp.village || 'Vadgaon'}, {selectedApp.taluka || 'Haveli'}, {selectedApp.district || 'Pune'}</div>
                        </div>
                      </div>

                      <div className="gov-memo-callout">
                        <strong>Collector Recommendation Memorandum:</strong><br />
                        {dossierData?.collector_memo?.memo_text || selectedApp.collector_forward_memo || 'Applicant educational trust has occupied this granted land since 1984 with continuous bona fide educational usage. Ground verification by Tahsildar confirms compliance with original grant covenants. Recommended for State Government Resolution (GR) sanction.'}
                      </div>

                      <div className="gov-info-card" style={{ marginBottom: '14px' }}>
                        <div className="lbl" style={{ marginBottom: '6px' }}>Tahsildar Site Verification</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                          <div>• Encroachment: <strong style={{ color: '#15803d' }}>None (Clear)</strong></div>
                          <div>• Public Notice: <strong>30-Day Completed</strong></div>
                          <div>• Canal / Water NOC: <strong>Received</strong></div>
                          <div>• Town Planning: <strong>Layout Cleared</strong></div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="btn-secondary" onClick={() => setModalTab('docs')}>Next: Review Documents →</button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Statutory documents */}
                  {modalTab === 'docs' && (
                    <div>
                      <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: 0 }}>
                        5 mandatory statutory documents verified for Granted & Semi-Granted lands under MLRC 1966:
                      </p>
                      <div className="gov-doc-item">
                        <span>1. Original Government Grant Sanction Letter</span>
                        <span className="check">✓ Verified</span>
                      </div>
                      <div className="gov-doc-item">
                        <span>2. Terms & Conditions Agreement</span>
                        <span className="check">✓ Verified</span>
                      </div>
                      <div className="gov-doc-item">
                        <span>3. Up-to-Date 7/12 Extract with Class-II Entry</span>
                        <span className="check">✓ Verified</span>
                      </div>
                      <div className="gov-doc-item">
                        <span>4. Nazrana Assessment Paid Challan</span>
                        <span className="check">✓ Paid (₹ 12,50,000)</span>
                      </div>
                      <div className="gov-doc-item">
                        <span>5. Town Planning Layout NOC</span>
                        <span className="check">✓ Cleared</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                        <button className="btn-secondary" onClick={() => setModalTab('memo')}>← Back to Memo</button>
                        <button className="btn-primary-green" onClick={() => setModalTab('issue_gr')}>Next: Sanction GR →</button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Issue GR */}
                  {modalTab === 'issue_gr' && (
                    <div>
                      {selectedApp.status !== 'state_govt_approved' ? (
                        <form onSubmit={handleIssueGR} className="gov-gr-section">
                          <h4>Execute Government Resolution (शासन निर्णय - GR)</h4>
                          
                          <div className="gov-field" style={{ marginBottom: '10px' }}>
                            <label>Government Resolution (GR) Number:</label>
                            <input
                              type="text"
                              value={grNumber}
                              onChange={(e) => setGrNumber(e.target.value)}
                              required
                            />
                          </div>

                          <div className="gov-field-row">
                            <div className="gov-field">
                              <label>Signatory Officer (IAS):</label>
                              <input
                                type="text"
                                value={officerName}
                                onChange={(e) => setOfficerName(e.target.value)}
                                required
                              />
                            </div>
                            <div className="gov-field">
                              <label>Date of Sanction:</label>
                              <input
                                type="date"
                                value={sanctionDate}
                                onChange={(e) => setSanctionDate(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="gov-field" style={{ marginBottom: '14px' }}>
                            <label>Ministerial Decree & Sanction Order:</label>
                            <textarea
                              rows="3"
                              value={decreeRemarks}
                              onChange={(e) => setDecreeRemarks(e.target.value)}
                              required
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" className="btn-primary-green" disabled={grBusy}>
                              {grBusy ? 'Issuing...' : 'Issue Official State Government Resolution (GR)'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={handleStateReject} disabled={grBusy} style={{ color: '#dc2626' }}>
                              Raise Objection
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '6px' }}>
                          <h4 style={{ margin: '0 0 6px', color: '#166534' }}>✓ Official Government Resolution Issued</h4>
                          <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#15803d' }}>
                            This application has received State Secretariat sanction.
                          </p>
                          <button className="btn-primary-green" onClick={() => setViewGrModal(selectedApp)}>
                            Open & Print Official Government Resolution (GR)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="gov-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedApp(null)}>
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 7. PRINT-READY GOVERNMENT RESOLUTION (GR) PREVIEW ── */}
      {viewGrModal && (
        <div className="gov-modal-backdrop" onClick={() => setViewGrModal(null)}>
          <div className="gov-modal-box" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
            <div className="gov-modal-header">
              <h3>Government Resolution (शासन निर्णय) — Gazette Document</h3>
              <button className="gov-close-btn" onClick={() => setViewGrModal(null)}>✕</button>
            </div>

            <div className="gov-modal-content" style={{ background: '#f8fafc' }}>
              <div style={{ background: '#ffffff', border: '2px solid #000', padding: '32px 36px', fontFamily: '"Times New Roman", serif', color: '#000', lineHeight: 1.6 }}>
                
                <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>🏛️</div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>महाराष्ट्र शासन</h2>
                  <div style={{ fontSize: '13.5px', fontWeight: 'bold' }}>महसूल व वन विभाग, मंत्रालय, मुंबई - ४०० ०३२</div>
                  <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                    शासन निर्णय क्रमांक: {grNumber || 'MAH-REV-GR-2026/CR-8819/J1'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 'bold', marginBottom: '14px' }}>
                  <div>संदर्भ: जिल्हाधिकारी शिफारस ज्ञापन क्र. {viewGrModal.reference_no}</div>
                  <div>दिनांक: {sanctionDate}</div>
                </div>

                <div style={{ background: '#f1f5f9', borderLeft: '4px solid #000', padding: '8px 12px', fontSize: '12.5px', marginBottom: '14px' }}>
                  <strong>विषय:</strong> {viewGrModal.district || 'पुणे'} जिल्ह्यातील {viewGrModal.taluka || 'हवेली'} येथील गट क्र. {viewGrModal.gut_no || '७४/२'} वरील {viewGrModal.land_type} जागेच्या अकृषिक वापरास शासन सहमती व अंतिम मान्यता.
                </div>

                <div style={{ fontSize: '13px', textAlign: 'justify', marginBottom: '24px' }}>
                  <strong>शासन निर्णय:</strong><br />
                  महाराष्ट्र जमीन महसूल संहिता १९६६ (MLRC 1966) चे कलम ४४ मधील तरतुदींनुसार, शासनाने सदर प्रकरणामध्ये सादर करण्यात आलेला जिल्हाधिकारी यांचा शिफारस अहवाल व तहसीलदारांचा स्थळ पाहणी अहवाल विचारात घेतला आहे.
                  <br /><br />
                  सदर जमिनीचा मूळ अनुदान हेतू अबाधित ठेवून, आकारणी करण्यात आलेली नजराणा रक्कम प्राप्त झाल्याची खात्री करून, प्रस्तुत जागेच्या अकृषिक वापरास याद्वारे शासन मान्यता प्रदान करण्यात येत आहे.
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px' }}>
                  <div style={{ border: '1px dashed #64748b', padding: '8px', textAlign: 'center', fontSize: '10px', width: '100px' }}>
                    <div style={{ fontSize: '20px' }}>📱</div>
                    <strong>QR Verified</strong><br />
                    MahaGov Portal
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12.5px' }}>
                    <strong>( {officerName} )</strong><br />
                    {designation}<br />
                    महाराष्ट्र शासन
                  </div>
                </div>

              </div>
            </div>

            <div className="gov-modal-footer">
              <button className="btn-primary-green" onClick={() => window.print()}>
                🖨️ Print Resolution (GR)
              </button>
              <button className="btn-secondary" onClick={() => setViewGrModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. FOOTER ── */}
      <footer className="gov-footer">
        <div className="gov-footer-inner">
          <div className="gov-footer-left">
            <h4>Government of Maharashtra</h4>
            <span>Revenue & Forest Department, Mantralaya, Mumbai — 400 032</span>
          </div>
          <div className="gov-footer-links">
            <a href="https://mahabhumi.gov.in" target="_blank" rel="noreferrer">MahaBhumi</a>
            <a href="https://aaplesarkar.mahaonline.gov.in" target="_blank" rel="noreferrer">Aaple Sarkar</a>
            <a href="https://digitalindia.gov.in" target="_blank" rel="noreferrer">Digital India</a>
            <span style={{ color: '#64748b' }}>•</span>
            <span>Helpline: 1800-120-8040</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
