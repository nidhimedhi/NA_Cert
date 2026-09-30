import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import ApplicationPdfModal from '../../components/ApplicationPdfModal';

const cApi = axios.create({ baseURL: 'http://127.0.0.1:8000/api' });
cApi.interceptors.request.use(c => {
  const t = localStorage.getItem('collector_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

function getStatusMeta(status) {
  switch (status) {
    case 'pending_collector':
    case 'pending':
      return { label: 'New Submission', stage: 'Step 1: Received at Collectorate', color: 'amber', pill: 'status-pending_collector' };
    case 'forwarded_to_tahsildar':
      return { label: 'With Tahsildar', stage: 'Step 2: Field Verification In Progress', color: 'blue', pill: 'status-forwarded_to_tahsildar' };
    case 'tahsildar_verified':
    case 'approved':
      return { label: 'Tahsildar Verified', stage: 'Step 3: Verification Passed (Ready for Grant)', color: 'teal', pill: 'status-tahsildar_verified' };
    case 'tahsildar_rejected':
      return { label: 'Tahsildar Objections', stage: 'Step 3: Objections Raised by Tahsildar', color: 'red', pill: 'status-tahsildar_rejected' };
    case 'collector_approved':
      return { label: 'NA Granted', stage: 'Step 4: Final NA Sanction Issued', color: 'green', pill: 'status-collector_approved' };
    case 'collector_rejected':
      return { label: 'Collector Rejected', stage: 'Step 4: Final Rejection Issued', color: 'red', pill: 'status-collector_rejected' };
    default:
      return { label: status || 'Under Process', stage: 'Processing', color: 'gray', pill: 'status-pending' };
  }
}

// Statutory factors verified and adjudicated by the District Collector under Section 44 of MLRC 1966
export const COLLECTOR_STATUTORY_FACTORS = [
  {
    id: 'col_factor_tahsildar_inquiry',
    code: 'MLRC-C1',
    category: 'Field Inquiry Adjudication',
    title: 'Adjudication of Tahsildar Field Inquiry Report (तहसीलदार क्षेत्रीय चौकशी अहवाल मान्यता)',
    description: 'Scrutinized and accepted the formal Tahsildar ground verification report. Boundary demarcation, absence of government land encroachment, and site suitability confirmed without statutory objections.',
  },
  {
    id: 'col_factor_title_tenure',
    code: 'MLRC-C2',
    category: 'Title & Occupant Class',
    title: 'Title, Tenure & Class-I/II Sanction (हक्क, धारणा प्रकार व भोगवटादार वर्ग निश्चिती)',
    description: 'Verified applicant undisputed title and legal ownership from revenue records (Form 7/12 & Mutation entries). Confirmed Occupant Class-I (or sanctioned Class-II with premium compliance).',
  },
  {
    id: 'col_factor_zoning_dcr',
    code: 'MLRC-C3',
    category: 'Zoning & Town Planning',
    title: 'Zoning, Development Plan & DCR Concurrence (विकास योजना व डीसीआर सुसंगतता)',
    description: 'Verified that the requested non-agricultural purpose strictly conforms with the Regional Plan / Development Plan (DP) and Town Planning Department Development Control Regulations.',
  },
  {
    id: 'col_factor_statutory_nocs',
    code: 'MLRC-C4',
    category: 'Statutory Safety & Environment',
    title: 'Statutory Environmental & Public Safety NOCs (सार्वजनिक सुरक्षितता व पर्यावरण नाहरकत)',
    description: 'Verified statutory clearances regarding water bodies/flood lines (Irrigation Dept), Highway setbacks (PWD/NHAI), and MSETCL high-tension power transmission lines.',
  },
  {
    id: 'col_factor_conversion_tax',
    code: 'MLRC-C5',
    category: 'Tax & Revenue Assessment',
    title: 'Assessment of Conversion Tax & NA Assessment (रूपांतर कर व अकृषिक कर आकारणी)',
    description: 'Statutory Conversion Tax (रूपांतर कर) calculated and assessed under Section 47A MLRC, and non-agricultural revenue assessment rate fixed per sq. meter.',
  },
  {
    id: 'col_factor_public_objections',
    code: 'MLRC-C6',
    category: 'Dispute Adjudication',
    title: 'Public Notice & Objections Adjudication (सार्वजनिक सूचना व आक्षेप निरसन)',
    description: 'Statutory public notice period expired under Section 44; confirmed no valid objections, adverse claims, or court stay orders pending against the conversion.',
  },
  {
    id: 'col_factor_final_decree',
    code: 'MLRC-C7',
    category: 'Statutory Sanction Decree',
    title: 'Legal Authority & Final Sanction Clause (महाराष्ट्र जमीन महसूल संहिता कलम ४४ अंतिम आदेश)',
    description: 'All statutory preconditions satisfied under Maharashtra Land Revenue Code, 1966. Authorized the issuance of the formal Sanction Decree and Non-Agricultural Certificate.',
  },
];

export const COLLECTOR_SANCTION_CONDITIONS = [
  'Conversion is strictly restricted to sanctioned purpose; unauthorized change of use attracts penal assessment under Section 45 MLRC.',
  'Non-agricultural development/construction shall commence within one year and be completed within three years from the date of this order.',
  'Formal layout and architectural building permissions must be obtained from the competent Planning Authority prior to plinth work.',
  'Any land parcel affected by planned road widening (if notified by PWD, ZP, or NHAI) shall be surrendered free of cost without monetary compensation.',
  'Adequate stormwater drainage, septic disposal, and rainwater harvesting structures must be established in accordance with public health norms.',
  'The applicant must notify the Talathi in writing within 30 days of starting non-agricultural use for updating Village Form 7/12.',
];

export function CollectorDashboard() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    pending_collector: 0,
    forwarded_to_tahsildar: 0,
    tahsildar_verified: 0,
    tahsildar_rejected: 0,
    collector_approved: 0,
    collector_rejected: 0,
  });
  const [filter, setFilter] = useState('pending_collector');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('collector_token')) {
      navigate('/collector/login');
      return;
    }
    setLoading(true);
    cApi.get(`/collector/applications/?status=${filter}`)
      .then(r => {
        setApps(r.data.applications || []);
        if (r.data.counts) setCounts(r.data.counts);
      })
      .catch(err => {
        if (err.response?.status === 401) {
          localStorage.removeItem('collector_token');
          navigate('/collector/login');
        }
      })
      .finally(() => setLoading(false));
  }, [filter, navigate]);

  const logout = () => {
    localStorage.removeItem('collector_token');
    navigate('/collector/login');
  };

  const TABS = [
    { key: 'pending_collector', label: '📥 New Submissions', count: counts.pending_collector, desc: 'Incoming citizen applications awaiting initial Collector review and referral to Tahsildar.' },
    { key: 'forwarded_to_tahsildar', label: '⏳ With Tahsildar', count: counts.forwarded_to_tahsildar, desc: 'Forwarded to Tahsildar for physical site inspection and boundary validation.' },
    { key: 'tahsildar_verified', label: '📋 Tahsildar Verified', count: counts.tahsildar_verified, desc: 'Field inquiry completed by Tahsildar. Ready for final NA Sanction Order.' },
    { key: 'tahsildar_rejected', label: '⚠️ Tahsildar Objections', count: counts.tahsildar_rejected, desc: 'Tahsildar raised discrepancies or field objections. Requires Collector adjudication.' },
    { key: 'collector_approved', label: '📜 NA Granted', count: counts.collector_approved, desc: 'Final Non-Agricultural Sanction Orders issued by District Collector.' },
    { key: 'collector_rejected', label: '🚫 Final Rejected', count: counts.collector_rejected, desc: 'Applications rejected with official statutory findings.' },
    { key: 'all', label: '📊 All Applications', count: counts.all, desc: 'Complete registry of all NA permission requests across all workflow stages.' },
  ];

  const currentTab = TABS.find(t => t.key === filter) || TABS[0];

  const filteredApps = apps.filter(a => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (a.reference_no && a.reference_no.toLowerCase().includes(q)) ||
      (a.user_email && a.user_email.toLowerCase().includes(q)) ||
      (a.land_type && a.land_type.toLowerCase().includes(q))
    );
  });

  return (
    <div className="dashboard-page">
      {/* SIDEBAR */}
      <aside className="sidebar" style={{ background: '#0b1b2b', width: '270px' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'linear-gradient(135deg, #d97706, #b45309)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px' }}>
              🏛
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: '800', fontSize: '16px', letterSpacing: '0.3px' }}>District Collector</div>
              <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NA Revenue Authority</div>
            </div>
          </div>
        </div>

        <nav style={{ padding: '12px 10px' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`sidebar-link ${filter === t.key ? 'active' : ''}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '3px 0', padding: '10px 14px', borderRadius: '6px' }}
              onClick={() => setFilter(t.key)}
            >
              <span>{t.label}</span>
              <span style={{
                background: filter === t.key ? '#d97706' : 'rgba(255,255,255,0.15)',
                color: filter === t.key ? '#ffffff' : '#e2e8f0',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 'bold',
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button className="sidebar-logout" style={{ margin: 0, width: '100%', borderRadius: '6px' }} onClick={logout}>
            Sign Out Authority
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="dashboard-main" style={{ marginLeft: '270px', padding: '36px 40px' }}>
        {/* TOP METRICS SUMMARY */}
        <div className="collector-metrics-grid">
          <div className={`collector-metric-card color-amber ${filter === 'pending_collector' ? 'active-metric' : ''}`} onClick={() => setFilter('pending_collector')}>
            <div className="collector-metric-label">1. New Submissions</div>
            <div className="collector-metric-val">{counts.pending_collector}</div>
          </div>
          <div className={`collector-metric-card color-blue ${filter === 'forwarded_to_tahsildar' ? 'active-metric' : ''}`} onClick={() => setFilter('forwarded_to_tahsildar')}>
            <div className="collector-metric-label">2. With Tahsildar</div>
            <div className="collector-metric-val">{counts.forwarded_to_tahsildar}</div>
          </div>
          <div className={`collector-metric-card color-teal ${filter === 'tahsildar_verified' ? 'active-metric' : ''}`} onClick={() => setFilter('tahsildar_verified')}>
            <div className="collector-metric-label">3. Tahsildar Verified</div>
            <div className="collector-metric-val">{counts.tahsildar_verified}</div>
          </div>
          <div className={`collector-metric-card color-red ${filter === 'tahsildar_rejected' ? 'active-metric' : ''}`} onClick={() => setFilter('tahsildar_rejected')}>
            <div className="collector-metric-label">3b. Tahsildar Objections</div>
            <div className="collector-metric-val">{counts.tahsildar_rejected}</div>
          </div>
          <div className={`collector-metric-card color-green ${filter === 'collector_approved' ? 'active-metric' : ''}`} onClick={() => setFilter('collector_approved')}>
            <div className="collector-metric-label">4. NA Granted</div>
            <div className="collector-metric-val">{counts.collector_approved}</div>
          </div>
        </div>

        {/* STAGE BANNER */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '8px', padding: '18px 24px', marginBottom: '24px', borderLeft: '5px solid #0f172a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '22px', color: '#0f172a', margin: '0 0 6px', fontWeight: '800' }}>
                {currentTab.label}
              </h1>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                {currentTab.desc}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="text"
                placeholder="Search reference or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', minWidth: '240px' }}
              />
              <span className="badge-count" style={{ fontSize: '13px', padding: '6px 14px' }}>
                {filteredApps.length} records
              </span>
            </div>
          </div>
        </div>

        {/* APPLICATIONS TABLE */}
        {loading ? (
          <p className="loading-txt">Loading applications from registry…</p>
        ) : filteredApps.length === 0 ? (
          <div style={{ background: '#ffffff', padding: '50px 20px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📂</div>
            <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '600', margin: 0 }}>No applications found in this stage.</p>
          </div>
        ) : (
          <div className="apps-table-wrap">
            <table className="apps-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Reference No.</th>
                  <th>Land Category</th>
                  <th>Applicant</th>
                  <th>Workflow Stage</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((a, i) => {
                  const meta = getStatusMeta(a.status);
                  return (
                    <tr key={a.id}>
                      <td>{i + 1}</td>
                      <td>
                        <strong style={{ fontFamily: 'monospace', fontSize: '13px', color: '#0f172a' }}>{a.reference_no}</strong>
                      </td>
                      <td>{a.land_type}</td>
                      <td>{a.user_email}</td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{meta.stage}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${meta.pill}`}>{meta.label}</span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#64748b' }}>
                        {new Date(a.submitted_at || a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <Link
                          to={`/collector/application/${a.id}`}
                          className="btn-view"
                          style={{
                            background: a.status === 'pending_collector' || a.status === 'pending'
                              ? '#d97706'
                              : a.status === 'tahsildar_verified'
                              ? '#16a34a'
                              : a.status === 'tahsildar_rejected'
                              ? '#dc2626'
                              : '#0f172a',
                            color: '#ffffff',
                            fontWeight: '700',
                            padding: '6px 14px',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            fontSize: '12px',
                            display: 'inline-block',
                          }}
                        >
                          {a.status === 'pending_collector' || a.status === 'pending'
                            ? 'Forward →'
                            : a.status === 'tahsildar_verified'
                            ? 'Review & Grant →'
                            : a.status === 'tahsildar_rejected'
                            ? 'Review Objections →'
                            : 'View File →'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export function CollectorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [reason, setReason] = useState('');
  const [forwardRemarks, setForwardRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState('applicant');
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Collector Sanction Dossier State
  const [orderNo, setOrderNo]                       = useState('');
  const [collectorName, setCollectorName]           = useState(localStorage.getItem('username') || 'District Collector');
  const [sanctionDate, setSanctionDate]             = useState(new Date().toISOString().slice(0, 10));
  const [sanctionedPurpose, setSanctionedPurpose]   = useState('');
  const [sanctionedArea, setSanctionedArea]         = useState('');
  const [conversionTax, setConversionTax]           = useState('₹ 15,000');
  const [naAssessmentRate, setNaAssessmentRate]     = useState('₹ 2.50 per Sq. Mt. / annum');
  const [selectedColFactors, setSelectedColFactors] = useState(COLLECTOR_STATUTORY_FACTORS.map(f => f.id));
  const [collectorDecree, setCollectorDecree]       = useState(
    'Having scrutinized the Tahsildar ground verification report, title extract, and statutory clearances, permission for conversion to Non-Agricultural use is hereby SANCTIONED under Section 44 of Maharashtra Land Revenue Code, 1966 subject to terms and conditions stipulated herein.'
  );
  const [selectedColConditions, setSelectedColConditions] = useState(COLLECTOR_SANCTION_CONDITIONS.slice(0, 4));
  const [customColCondition, setCustomColCondition]       = useState('');
  const [showColRejectBox, setShowColRejectBox]           = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('collector_token')) {
      navigate('/collector/login');
      return;
    }
    cApi.get(`/collector/applications/${id}/`)
      .then(r => {
        setData(r.data);
        const l = r.data?.form_data?.service_specific_details || r.data?.form_data?.land_details || {};
        const refSuffix = r.data?.application?.reference_no ? r.data.application.reference_no.slice(-6) : '0482';
        setOrderNo(`COLL/REV/NA-${new Date().getFullYear()}/${refSuffix}`);
        setSanctionedPurpose(r.data?.application?.land_type || 'Residential - Individual');
        if (l.area_sqmt || l.total_area) {
          setSanctionedArea(`${l.area_sqmt || l.total_area} Sq. Mt.`);
        } else {
          setSanctionedArea('500 Sq. Mt.');
        }
      })
      .catch(err => {
        if (err.response?.status === 401) {
          localStorage.removeItem('collector_token');
          navigate('/collector/login');
        } else {
          console.error('Failed to load application details:', err);
        }
      });
  }, [id, navigate]);

  const toggleColFactor = (fid) => {
    setSelectedColFactors(prev =>
      prev.includes(fid) ? prev.filter(x => x !== fid) : [...prev, fid]
    );
  };

  const selectAllColFactors = () => {
    setSelectedColFactors(COLLECTOR_STATUTORY_FACTORS.map(f => f.id));
  };

  const clearAllColFactors = () => {
    setSelectedColFactors([]);
  };

  const toggleColCondition = (cond) => {
    setSelectedColConditions(prev =>
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const addCustomColCondition = (e) => {
    e.preventDefault();
    if (customColCondition.trim() && !selectedColConditions.includes(customColCondition.trim())) {
      setSelectedColConditions(prev => [...prev, customColCondition.trim()]);
      setCustomColCondition('');
    }
  };

  const forwardToTahsildar = async () => {
    setBusy(true);
    try {
      await cApi.post(`/collector/applications/${id}/forward/`, { remarks: forwardRemarks });
      setMsg('✅ Application forwarded to Tahsildar for field verification!');
      setBusy(false);
      setTimeout(() => navigate('/collector/dashboard'), 1500);
    } catch {
      alert('Failed to forward application.');
      setBusy(false);
    }
  };

  const grantNA = async (e) => {
    if (e) e.preventDefault();
    if (selectedColFactors.length === 0) {
      alert('⚠️ Please check and adjudicate at least one statutory factor before issuing the sanction order.');
      return;
    }
    setBusy(true);
    try {
      const landObj = data?.form_data?.service_specific_details || data?.form_data?.land_details || {};
      const applicantObj = data?.form_data?.applicant_details || {};
      const payload = {
        factors: COLLECTOR_STATUTORY_FACTORS.map(f => ({
          id: f.id,
          title: f.title,
          category: f.category,
          checked: selectedColFactors.includes(f.id),
        })),
        order_no: orderNo,
        sanction_date: sanctionDate,
        officer_name: collectorName,
        designation: 'District Collector & District Magistrate',
        sanctioned_purpose: sanctionedPurpose,
        sanctioned_area: sanctionedArea,
        conversion_tax: conversionTax,
        na_assessment_rate: naAssessmentRate,
        remarks: collectorDecree,
        conditions: selectedColConditions,
        village: landObj.land_village || landObj.village || '',
        taluka: landObj.land_taluka || landObj.taluka || '',
        district: landObj.land_district || landObj.district || '',
        gat_no: landObj.gat_number || landObj.gat_no || landObj.survey_no || '',
        owner_names: applicantObj.full_name || data?.application?.user_email || '',
      };
      await cApi.post(`/collector/applications/${id}/approve/`, payload);
      setMsg(`🎉 Official NA Sanction Order No. ${orderNo} granted successfully by District Collector!`);
      setBusy(false);
      setTimeout(() => navigate('/collector/dashboard'), 1800);
    } catch (err) {
      alert('Failed to approve application: ' + (err.response?.data?.error || err.message));
      setBusy(false);
    }
  };

  const rejectApplication = async () => {
    if (!reason.trim()) {
      alert('Please state the official reason for Collector rejection.');
      return;
    }
    if (!window.confirm('Confirm rejection of this NA permission request?')) return;
    setBusy(true);
    try {
      await cApi.post(`/collector/applications/${id}/reject/`, { reason });
      setMsg('❌ Application officially rejected by Collector.');
      setBusy(false);
      setTimeout(() => navigate('/collector/dashboard'), 1500);
    } catch {
      alert('Failed to reject application.');
      setBusy(false);
    }
  };

  if (!data) return <div className="detail-page"><p className="loading-txt">Loading complete application dossier…</p></div>;

  const { application: app, documents, form_data } = data;
  const meta = getStatusMeta(app?.status);

  // Workflow progress flags
  const isStep1Done = true; // submitted
  const isStep2Done = ['forwarded_to_tahsildar', 'tahsildar_verified', 'approved', 'tahsildar_rejected', 'collector_approved', 'collector_rejected'].includes(app?.status);
  const isStep2Active = ['pending_collector', 'pending'].includes(app?.status);
  const isStep3Done = ['tahsildar_verified', 'approved', 'collector_approved'].includes(app?.status);
  const isStep3Rejected = ['tahsildar_rejected', 'rejected'].includes(app?.status);
  const isStep3Active = app?.status === 'forwarded_to_tahsildar';
  const isStep4Done = ['collector_approved'].includes(app?.status);
  const isStep4Rejected = ['collector_rejected'].includes(app?.status);
  const isStep4Active = ['tahsildar_verified', 'approved', 'tahsildar_rejected'].includes(app?.status);

  // Parse applicant and land data from form_data if available
  const applicant = form_data?.applicant_details || {};
  const land = form_data?.service_specific_details || form_data?.land_details || {};
  const clearances = form_data?.statutory_and_proximity_clearances || {};
  const declaration = form_data?.self_declaration || {};

  return (
    <div className="detail-page" style={{ maxWidth: '1240px', margin: '0 auto', padding: '36px 30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Link to="/collector/dashboard" className="back-btn" style={{ margin: 0 }}>
          ← Back to Collector Dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowPdfModal(true)}
            style={{
              background: '#0f766e',
              color: '#ffffff',
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
            }}
          >
            📄 View Full Form PDF
          </button>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Reference ID:</span>
          <code style={{ fontSize: '15px', fontWeight: 'bold', background: '#e2e8f0', padding: '4px 10px', borderRadius: '4px' }}>
            {app?.reference_no}
          </code>
        </div>
      </div>

      {msg && <div className="success-msg">{msg}</div>}

      {/* HEADER BAR */}
      <div className="detail-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ margin: 0, fontSize: '26px', color: '#0f172a' }}>Application Dossier Review</h1>
            <span className={`status-pill ${meta.pill}`}>{meta.label}</span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Land Type: <strong>{app?.land_type}</strong> | Applicant: <strong>{app?.user_email}</strong> | Submitted: {new Date(app?.submitted_at || app?.created_at).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* 4-STEP WORKFLOW TRACKER */}
      <div className="workflow-tracker-wrap">
        <div className="workflow-tracker-title">End-to-End Governance Lifecycle Tracker</div>
        <div className="workflow-steps">
          <div className={`workflow-step ${isStep1Done ? 'completed' : ''}`}>
            <div className="workflow-step-num">Step 1 • Citizen Submission</div>
            <div className="workflow-step-title">Application Form & Docs</div>
            <div className="workflow-step-sub">✅ Filed & Received at Collectorate</div>
          </div>

          <div className={`workflow-step ${isStep2Done ? 'completed' : isStep2Active ? 'active' : ''}`}>
            <div className="workflow-step-num">Step 2 • Collector Review</div>
            <div className="workflow-step-title">Refer to Tahsildar</div>
            <div className="workflow-step-sub">
              {isStep2Done ? '✅ Forwarded to Tahsildar' : '⏳ Awaiting Collector Direction'}
            </div>
          </div>

          <div className={`workflow-step ${isStep3Done ? 'completed' : isStep3Rejected ? 'rejected' : isStep3Active ? 'active' : ''}`}>
            <div className="workflow-step-num">Step 3 • Ground Verification</div>
            <div className="workflow-step-title">Tahsildar Field Inquiry</div>
            <div className="workflow-step-sub">
              {isStep3Done ? '✅ Verified by Tahsildar' : isStep3Rejected ? '❌ Objections Noted' : isStep3Active ? '⏳ Inspection in progress' : 'Upcoming'}
            </div>
          </div>

          <div className={`workflow-step ${isStep4Done ? 'completed' : isStep4Rejected ? 'rejected' : isStep4Active ? 'active' : ''}`}>
            <div className="workflow-step-num">Step 4 • Final Collector Order</div>
            <div className="workflow-step-title">NA Permission Sanction</div>
            <div className="workflow-step-sub">
              {isStep4Done ? '✅ Sanction Order Issued' : isStep4Rejected ? '❌ Sanction Refused' : isStep4Active ? '⚡ Ready for Order' : 'Awaiting Stage 3'}
            </div>
          </div>
        </div>
      </div>

      {/* TAHSILDAR VERIFICATION FINDINGS CARD */}
      {['tahsildar_verified', 'approved'].includes(app?.status) && (
        <div className="tahsildar-findings-card verified" style={{ borderLeft: '5px solid #16a34a' }}>
          <div className="findings-header">
            <div className="findings-title">
              <span style={{ fontSize: '20px' }}>📋</span> Tahsildar Ground Inquiry Dossier: Verified & Recommended
            </div>
            <span className="status-pill status-tahsildar_verified">Verified (Stage 3 Complete)</span>
          </div>
          <div className="findings-body">
            <p style={{ margin: '0 0 10px', fontSize: '13.5px', color: '#166534' }}>
              The Tahsildar office has completed on-site statutory inquiry under Section 44 of Maharashtra Land Revenue Code, 1966 and validated all title, boundary, zoning, and setback factors.
            </p>

            {/* Verification Factors Checklist Display */}
            <div style={{ background: '#ffffff', padding: '14px', borderRadius: '6px', border: '1px solid #bbf7d0', marginBottom: '12px' }}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#14532d', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✅</span> Statutory Factors Verified by Tahsildar:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
                {[
                  'Land Title & 7/12 Ownership Record (हक्क व सातबारा)',
                  'Physical Ground Demarcation & Haddakayam (सीमा निश्चिती)',
                  'Approach Road & Public Right-of-Way (रस्ता वहिवाट)',
                  'Zoning & Regional/Development Plan Compliance (झोन सुसंगतता)',
                  'Environmental Buffer, Flood Line & HT Line Setbacks (पर्यावरण अंतर)',
                  'Tenancy Laws (Sec 43/63) & Ceiling Compliance (कुळकायदा व कमाल जमीन)',
                  'Government Revenue Dues & Tax Arrears Clearance (शासकीय थकबाकी निरंक)',
                ].map((factorText, fi) => (
                  <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#166534' }}>
                    <span style={{ fontWeight: 'bold', color: '#15803d' }}>✓</span>
                    <span>{factorText}</span>
                  </div>
                ))}
              </div>
            </div>

            {app.rejection_reason && (
              <div style={{ padding: '12px 14px', background: 'rgba(22, 163, 74, 0.1)', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '13px' }}>
                <strong>Official Inquiry Remarks:</strong> {app.rejection_reason}
              </div>
            )}
          </div>
        </div>
      )}

      {app?.status === 'tahsildar_rejected' && (
        <div className="tahsildar-findings-card rejected">
          <div className="findings-header">
            <div className="findings-title">
              <span style={{ fontSize: '20px' }}>⚠️</span> Tahsildar Ground Inquiry Report: Field Discrepancy / Objection
            </div>
            <span className="status-pill status-tahsildar_rejected">Discrepancy Raised</span>
          </div>
          <div className="findings-body">
            During physical inquiry, the Tahsildar identified objections or document mismatches.
            <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(220, 38, 38, 0.1)', borderRadius: '4px', color: '#991b1b', fontWeight: 'bold' }}>
              <strong>Stated Objection:</strong> {app.rejection_reason || 'Discrepancy reported during ground verification.'}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#64748b' }}>
              As District Collector, review the applicant dossier below. You may issue a Final Rejection Order upholding the objection or grant exceptional approval.
            </p>
          </div>
        </div>
      )}

      {app?.status === 'forwarded_to_tahsildar' && (
        <div className="tahsildar-findings-card pending">
          <div className="findings-header">
            <div className="findings-title">
              <span style={{ fontSize: '20px' }}>⏳</span> In Transit: Under Tahsildar Field Inspection
            </div>
            <span className="status-pill status-forwarded_to_tahsildar">Field Verification</span>
          </div>
          <div className="findings-body">
            This file was dispatched to the jurisdictional Tahsildar. The Tahsildar office is conducting site verification and will submit verification findings back to this portal.
            {app.rejection_reason && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#78350f' }}>
                {app.rejection_reason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOSSIER SECTION NAVIGATION */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '2px' }}>
        {[
          { id: 'applicant', label: '👤 Applicant Profile' },
          { id: 'land', label: '🗺 Land & Purpose' },
          { id: 'statutory', label: '⚖ Statutory Clearances' },
          { id: 'docs', label: `📁 Documents & OCR (${documents?.length || 0})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveDetailTab(tab.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: activeDetailTab === tab.id ? '#0f172a' : 'transparent',
              color: activeDetailTab === tab.id ? '#ffffff' : '#64748b',
              fontWeight: '700',
              fontSize: '14px',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              transition: '0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: APPLICANT PROFILE */}
      {activeDetailTab === 'applicant' && (
        <div className="detail-card" style={{ marginBottom: '24px' }}>
          <h3>Applicant Particulars</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div className="info-row"><span>Full Name</span><strong>{applicant.full_name || 'N/A'}</strong></div>
              <div className="info-row"><span>Aadhaar / ID</span><code>{applicant.aadhaar_number || 'N/A'}</code></div>
              <div className="info-row"><span>Gender</span>{applicant.gender || 'N/A'}</div>
              <div className="info-row"><span>Date of Birth</span>{applicant.dob || 'N/A'}</div>
            </div>
            <div>
              <div className="info-row"><span>Email</span>{applicant.email || app?.user_email}</div>
              <div className="info-row"><span>Mobile No.</span>{applicant.mobile_no || 'N/A'}</div>
              <div className="info-row"><span>Residential Address</span>{applicant.residence_address || 'N/A'}</div>
              <div className="info-row">
                <span>Location (Taluka/Dist)</span>
                {(applicant.taluka || applicant.res_taluka)
                  ? `${applicant.village || applicant.res_village ? (applicant.village || applicant.res_village) + ', ' : ''}${applicant.taluka || applicant.res_taluka}, ${applicant.district || applicant.res_district || ''} - ${applicant.pincode || applicant.res_pincode || ''}`
                  : (applicant.residence_address || 'N/A')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LAND & PURPOSE */}
      {activeDetailTab === 'land' && (
        <div className="detail-card" style={{ marginBottom: '24px' }}>
          <h3>Land & Non-Agricultural Purpose Specifications</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div className="info-row"><span>Land Category</span><strong>{app?.land_type}</strong></div>
              <div className="info-row"><span>Gat / Survey Number</span><code>{land.gat_number || land.gat_no || land.survey_no || 'N/A'}</code></div>
              <div className="info-row"><span>Village / Taluka / District</span>{(land.land_village || land.village) ? `${land.land_village || land.village}, ${land.land_taluka || land.taluka || ''}, ${land.land_district || land.district || ''}` : 'N/A'}</div>
              <div className="info-row"><span>Total Proposed Area</span><strong>{(land.area_sqmt || land.total_area) ? `${land.area_sqmt || land.total_area} Sq. Meters` : 'N/A'}</strong></div>
              <div className="info-row"><span>Annual Assessment Rent</span>{land.assessment_rent ? `₹ ${land.assessment_rent}` : (land.assessment ? `₹ ${land.assessment}` : '₹ 0.00')}</div>
            </div>
            <div>
              <div className="info-row"><span>Residential Component</span>{land.area_residential ? `${land.area_residential} Sq.m` : '0 Sq.m'}</div>
              <div className="info-row"><span>Commercial Component</span>{land.area_commercial ? `${land.area_commercial} Sq.m` : '0 Sq.m'}</div>
              <div className="info-row"><span>Industrial Component</span>{land.area_industrial ? `${land.area_industrial} Sq.m` : '0 Sq.m'}</div>
              <div className="info-row"><span>Other / Amenity Area</span>{land.area_other_purpose ? `${land.area_other_purpose} Sq.m` : '0 Sq.m'}</div>
              <div className="info-row"><span>Holder / Tenancy Type</span>{land.holder_type || 'Occupant Class-1'}</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STATUTORY CLEARANCES */}
      {activeDetailTab === 'statutory' && (
        <div className="detail-card" style={{ marginBottom: '24px' }}>
          <h3>Statutory Questionnaire & Clearances</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div className="info-row"><span>Municipal / Planning Authority Jurisdiction</span><strong>{clearances.jurisdiction_municipal || 'No'}</strong></div>
              <div className="info-row"><span>City Survey Undertaken</span>{clearances.city_survey_done || 'No'}</div>
              <div className="info-row"><span>Cantonment Jurisdiction</span>{clearances.cantonment_jurisdiction || 'No'}</div>
              <div className="info-row"><span>Regional Plan In Force</span>{clearances.regional_plan || 'No'}</div>
              <div className="info-row"><span>Proximity to Railway / Highway</span>{clearances.near_railway || 'No'}</div>
            </div>
            <div>
              <div className="info-row"><span>Proximity to Airport</span>{clearances.near_airport || 'No'}</div>
              <div className="info-row"><span>Proximity to Jail / Public Office</span>{clearances.near_jail === 'Yes' || clearances.near_public_office === 'Yes' ? 'Yes' : 'No'}</div>
              <div className="info-row"><span>High Tension Line Traversal</span>{clearances.near_ht_line || 'No'}</div>
              <div className="info-row"><span>Land Under Acquisition</span>{clearances.land_under_acquisition || 'No'}</div>
              <div className="info-row"><span>Approach Road Provision</span><strong>{clearances.approach_road_provision || 'Yes'}</strong></div>
            </div>
          </div>
          {clearances.prior_application_submitted === 'Yes' && (
            <div style={{ marginTop: '14px', padding: '12px', background: '#fffbeb', borderRadius: '4px', border: '1px solid #fde68a' }}>
              <strong>Prior Application Note:</strong> {clearances.prior_rejection_reason || 'Previously filed'}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DOCUMENTS & OCR EXTRACTIONS */}
      {activeDetailTab === 'docs' && (
        <div className="detail-card" style={{ marginBottom: '24px' }}>
          <h3>Submitted Documents & Automated OCR Extractions ({documents?.length || 0})</h3>
          {(!documents || documents.length === 0) ? (
            <p style={{ color: '#64748b' }}>No documents attached.</p>
          ) : (
            documents.map((d, i) => (
              <div key={i} className="doc-row" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <span className="doc-num">{i + 1}</span>
                  <div>
                    <div className="doc-name">{d.document_name}</div>
                    {d.village && (
                      <div className="doc-meta">
                        Village: <strong>{d.village}</strong> | Taluka: <strong>{d.taluka}</strong> | Gat: <strong>{d.gat_no}</strong> | Satbara: <strong>{d.satbara_no}</strong>
                      </div>
                    )}
                    {d.owner_names && (
                      <div className="doc-meta" style={{ color: '#047857' }}>
                        Recorded Owners: {d.owner_names}
                      </div>
                    )}
                  </div>
                </div>
                {d.document_name === 'Application Form - e-District Maharashtra' || (!d.file_url && d.raw_json) ? (
                  <button
                    onClick={() => setShowPdfModal(true)}
                    style={{
                      background: '#0f766e',
                      color: '#ffffff',
                      padding: '6px 14px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    📄 View / Print Form PDF ↗
                  </button>
                ) : d.file_url ? (
                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      padding: '6px 14px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    View Original File ↗
                  </a>
                ) : (
                  <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                    Filed Online
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* STAGE-AWARE COLLECTOR ACTION PANEL */}
      <div className="action-card" style={{ borderTop: '4px solid #0f172a' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Collectorate Official Action Determination</h3>

        {/* CASE 1: NEW SUBMISSION -> FORWARD TO TAHSILDAR */}
        {(app?.status === 'pending_collector' || app?.status === 'pending') && (
          <div>
            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '16px' }}>
              This is a newly submitted application received directly at the Collectorate. Review the application dossier and documents above, add any special directions, and forward to the jurisdictional Tahsildar for field inspection.
            </p>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', color: '#1e293b', marginBottom: '6px' }}>
                Collector Directives to Tahsildar (Optional):
              </label>
              <input
                type="text"
                className="input-wrap"
                placeholder="e.g. Verify road access, verify 7/12 mutation entry #142, inspect flood margin…"
                value={forwardRemarks}
                onChange={e => setForwardRemarks(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '14px' }}>
              <button
                className="btn-approve"
                style={{ background: '#d97706', padding: '14px 28px', fontSize: '15px' }}
                onClick={forwardToTahsildar}
                disabled={busy}
              >
                Forward to Tahsildar for Field Verification →
              </button>
            </div>
          </div>
        )}

        {/* CASE 2: RETURNED FROM TAHSILDAR (VERIFIED) -> COLLECTOR FINAL SANCTION DOSSIER */}
        {['tahsildar_verified', 'approved'].includes(app?.status) && (
          <div style={{ background: '#f8fafc', border: '2px solid #0f766e', borderRadius: '10px', padding: '24px', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '2px solid #cbd5e1', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f766e', fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🏛️</span> District Collector Final NA Sanction & Statutory Approval Dossier
                </h3>
                <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13.5px' }}>
                  Under Section 44, 45 & 47 of Maharashtra Land Revenue Code, 1966. Adjudicate all statutory factors and issue the final Sanction Decree.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', background: '#ccfbf1', color: '#0f766e', padding: '4px 10px', borderRadius: '4px', fontWeight: '700' }}>
                  {selectedColFactors.length} of {COLLECTOR_STATUTORY_FACTORS.length} Factors Adjudicated
                </span>
              </div>
            </div>

            <form onSubmit={grantNA}>
              {/* 1. Sanction Order Particulars & Revenue Assessment */}
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #ccfbf1', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#134e4a', fontWeight: '700' }}>
                  1. Sanction Order Particulars & Statutory Revenue Assessment
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Sanction Order Number *
                    </label>
                    <input
                      type="text"
                      className="input-wrap"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13.5px', fontFamily: 'monospace' }}
                      value={orderNo}
                      onChange={e => setOrderNo(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Sanctioning Authority *
                    </label>
                    <input
                      type="text"
                      className="input-wrap"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13.5px' }}
                      value={collectorName}
                      onChange={e => setCollectorName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Order Execution Date *
                    </label>
                    <input
                      type="date"
                      className="input-wrap"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13.5px' }}
                      value={sanctionDate}
                      onChange={e => setSanctionDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Sanctioned Net Area (Sq. Mt.) *
                    </label>
                    <input
                      type="text"
                      className="input-wrap"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13.5px' }}
                      value={sanctionedArea}
                      onChange={e => setSanctionedArea(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Sanctioned Non-Agricultural Purpose
                    </label>
                    <input
                      type="text"
                      className="input-wrap"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13.5px' }}
                      value={sanctionedPurpose}
                      onChange={e => setSanctionedPurpose(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Assessed Conversion Tax (रूपांतर कर)
                    </label>
                    <input
                      type="text"
                      className="input-wrap"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13.5px' }}
                      value={conversionTax}
                      onChange={e => setConversionTax(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Annual NA Assessment Rate (अकृषिक आकारणी)
                    </label>
                    <input
                      type="text"
                      className="input-wrap"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13.5px' }}
                      value={naAssessmentRate}
                      onChange={e => setNaAssessmentRate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Mandatory Collectorate Statutory Factors Checklist */}
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #ccfbf1', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', color: '#134e4a', fontWeight: '700' }}>
                      2. Mandatory Collectorate Statutory Factors Adjudicated
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Confirm each legal factor examined under the Maharashtra Land Revenue Code</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={selectAllColFactors}
                      style={{ background: '#0f766e', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11.5px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      ✓ Check All Factors
                    </button>
                    <button
                      type="button"
                      onClick={clearAllColFactors}
                      style={{ background: '#e2e8f0', color: '#334155', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11.5px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', background: '#e2e8f0', height: '6px', borderRadius: '3px', marginBottom: '16px', overflow: 'hidden' }}>
                  <div style={{ width: `${(selectedColFactors.length / COLLECTOR_STATUTORY_FACTORS.length) * 100}%`, background: selectedColFactors.length === COLLECTOR_STATUTORY_FACTORS.length ? '#0f766e' : '#0284c7', height: '100%', transition: 'width 0.3s' }} />
                </div>

                {/* Factors List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {COLLECTOR_STATUTORY_FACTORS.map((factor) => {
                    const isChecked = selectedColFactors.includes(factor.id);
                    return (
                      <label
                        key={factor.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          background: isChecked ? '#f0fdfa' : '#ffffff',
                          border: `1px solid ${isChecked ? '#99f6e4' : '#cbd5e1'}`,
                          borderRadius: '8px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleColFactor(factor.id)}
                          style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#0f766e', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', background: isChecked ? '#ccfbf1' : '#f1f5f9', color: isChecked ? '#0f766e' : '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                              {factor.category}
                            </span>
                            <strong style={{ fontSize: '13.5px', color: isChecked ? '#134e4a' : '#0f172a' }}>
                              {factor.title}
                            </strong>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: isChecked ? '#0f766e' : '#64748b', lineHeight: '1.4' }}>
                            {factor.description}
                          </p>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: isChecked ? '#0f766e' : '#94a3b8' }}>
                          {isChecked ? 'Adjudicated ✓' : 'Pending'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. Collector Sanction Decree & Final Remarks */}
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #ccfbf1', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#134e4a', fontWeight: '700' }}>
                  3. Collector Official Sanction Decree & Order Summary *
                </h4>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px' }}>
                  Formal legal decree text authorizing conversion under Section 44 of Maharashtra Land Revenue Code, 1966.
                </p>
                <textarea
                  className="input-wrap"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '13px', lineHeight: '1.5' }}
                  value={collectorDecree}
                  onChange={e => setCollectorDecree(e.target.value)}
                  required
                />
              </div>

              {/* 4. Mandatory Statutory Conditions Imposed on Sanction */}
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #ccfbf1', marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#134e4a', fontWeight: '700' }}>
                  4. Mandatory Statutory Conditions Imposed in Final Sanction Order
                </h4>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
                  Statutory obligations binding on the landholder under MLRC Sections 44 & 45:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {COLLECTOR_SANCTION_CONDITIONS.map((cond, i) => {
                    const isChecked = selectedColConditions.includes(cond);
                    return (
                      <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleColCondition(cond)}
                          style={{ marginTop: '2px', accentColor: '#0f766e' }}
                        />
                        <span>{cond}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Add Custom Condition */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-wrap"
                    style={{ flex: 1, padding: '7px 12px', fontSize: '12.5px', boxSizing: 'border-box' }}
                    placeholder="Add special condition or town planning stipulation..."
                    value={customColCondition}
                    onChange={e => setCustomColCondition(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={addCustomColCondition}
                    style={{ background: '#0f766e', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    + Add Condition
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    flex: 2,
                    padding: '14px 24px',
                    background: 'linear-gradient(135deg, #0f766e, #115e59)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
                  }}
                >
                  {busy ? 'Issuing Sanction Order…' : '📜 Issue Official District Collector NA Sanction Order (MLRC Sec 44)'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowColRejectBox(!showColRejectBox)}
                  style={{
                    flex: 1,
                    padding: '14px 18px',
                    background: showColRejectBox ? '#fecaca' : '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #f87171',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {showColRejectBox ? '▲ Hide Refusal Form' : '❌ Refuse NA Sanction (with Reason)'}
                </button>
              </div>
            </form>

            {/* Collapsible Refusal Form */}
            {showColRejectBox && (
              <div style={{ marginTop: '20px', background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '8px', padding: '18px' }}>
                <h4 style={{ margin: '0 0 6px', color: '#991b1b', fontSize: '15px' }}>
                  Official Statutory Grounds for Refusal / Rejection Order
                </h4>
                <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#7f1d1d' }}>
                  Specify the legal barrier or reason under Maharashtra Land Revenue Code for refusing conversion:
                </p>
                <textarea
                  className="input-wrap"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: '13px', marginBottom: '12px' }}
                  placeholder="Official legal grounds for refusal…"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
                <button
                  type="button"
                  onClick={rejectApplication}
                  disabled={busy}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {busy ? 'Refusing Sanction…' : 'Confirm Refusal & Issue Rejection Order'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* CASE 3: RETURNED FROM TAHSILDAR (REJECTED / OBJECTIONS) */}
        {app?.status === 'tahsildar_rejected' && (
          <div>
            <p style={{ color: '#991b1b', fontSize: '14px', marginBottom: '16px', fontWeight: '600' }}>
              The Tahsildar submitted objections. As Collector, determine whether to uphold the objection or grant exceptional clearance.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
              <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                <h4 style={{ margin: '0 0 10px', color: '#991b1b' }}>Uphold Objection & Issue Final Rejection Order</h4>
                <input
                  className="input-wrap"
                  placeholder="Collector rejection decree / endorsement of Tahsildar report…"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  style={{ width: '100%', marginBottom: '12px', boxSizing: 'border-box' }}
                />
                <button
                  className="btn-reject"
                  onClick={rejectApplication}
                  disabled={busy}
                  style={{ width: '100%' }}
                >
                  ❌ Uphold Tahsildar Objection & Reject
                </button>
              </div>

              <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                <h4 style={{ margin: '0 0 10px', color: '#92400e' }}>Override Objection & Grant NA</h4>
                <p style={{ fontSize: '12px', color: '#78350f', marginBottom: '14px' }}>
                  If applicant provided mitigating compliance directly to Collectorate.
                </p>
                <button
                  className="btn-approve"
                  onClick={grantNA}
                  disabled={busy}
                  style={{ width: '100%', background: '#0d9488' }}
                >
                  ⚡ Override & Issue Sanction Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CASE 4: CURRENTLY WITH TAHSILDAR */}
        {app?.status === 'forwarded_to_tahsildar' && (
          <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
            <p style={{ margin: 0, color: '#0369a1', fontSize: '14px', fontWeight: '600' }}>
              ⏳ File currently pending with Tahsildar. Action buttons will unlock once Tahsildar completes field inspection and returns findings.
            </p>
          </div>
        )}

        {/* CASE 5: FINALIZED (SANCTION ORDER GRANTED) */}
        {app?.status === 'collector_approved' && (
          <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #bbf7d0', paddingBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📜</span> Official District Collector NA Sanction Order Granted & Decreed
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#15803d' }}>
                  Authorized under Section 44, 45 & 47 of Maharashtra Land Revenue Code, 1966.
                </p>
              </div>
              <span className="status-pill status-collector_approved">✓ Sanction Order Executed</span>
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                <div><span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Sanction Order Number</span><strong style={{ fontFamily: 'monospace' }}>{orderNo || 'COLL/REV/NA-2026/0482'}</strong></div>
                <div><span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Sanctioning Authority</span><strong>District Collector & District Magistrate</strong></div>
                <div><span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Order Date</span><strong>{app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString('en-IN') : sanctionDate}</strong></div>
                <div><span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Sanctioned Area & Purpose</span><strong>{sanctionedArea || '500 Sq. Mt.'} ({sanctionedPurpose || app.land_type})</strong></div>
                <div><span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Assessed Conversion Tax</span><strong>{conversionTax || '₹ 15,000'}</strong></div>
                <div><span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Annual NA Assessment</span><strong>{naAssessmentRate || '₹ 2.50 / m²'}</strong></div>
              </div>

              {app?.rejection_reason && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Official Sanction Summary / Decree</span>
                  <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '6px', color: '#166534', fontSize: '13px', border: '1px solid #bbf7d0', fontStyle: 'italic' }}>
                    {app.rejection_reason}
                  </div>
                </div>
              )}
            </div>

            {/* Checklist of 7 Collector Factors Adjudicated */}
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <h4 style={{ margin: '0 0 12px', color: '#14532d', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✅</span> Collectorate Statutory Factors Adjudicated (7/7 Confirmed)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px' }}>
                {COLLECTOR_STATUTORY_FACTORS.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#0f766e', fontWeight: 'bold', fontSize: '16px' }}>✓</span>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1e293b' }}>{f.title}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>{f.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {app?.status === 'collector_rejected' && (
          <div style={{ background: '#fef2f2', padding: '18px', borderRadius: '6px', border: '1px solid #fca5a5' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#991b1b', marginBottom: '6px' }}>
              ❌ Application Officially Rejected
            </div>
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#b91c1c' }}>
              Final rejection order issued by District Collector. Reviewed at: {app?.reviewed_at ? new Date(app.reviewed_at).toLocaleString('en-IN') : 'Completed'}
            </p>
            {app?.rejection_reason && (
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#7f1d1d' }}>
                Recorded Reason: {app.rejection_reason}
              </div>
            )}
          </div>
        )}
      </div>

      {showPdfModal && (
        <ApplicationPdfModal
          app={app}
          formData={form_data}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
}
