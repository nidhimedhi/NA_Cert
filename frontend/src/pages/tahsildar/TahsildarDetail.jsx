import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import ApplicationPdfModal from '../../components/ApplicationPdfModal';

const tApi = axios.create({ baseURL: 'http://127.0.0.1:8000/api' });
tApi.interceptors.request.use(c => {
  const t = localStorage.getItem('tahsildar_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

// Official statutory factors verified under Section 44 of Maharashtra Land Revenue Code, 1966
const STATUTORY_FACTORS = [
  {
    id: 'factor_title_records',
    code: 'MLRC-F1',
    category: 'Title & Revenue Records',
    title: 'Land Title & 7/12 Ownership Record (हक्क व सातबारा तपासणी)',
    description: 'Verified Form 7/12 (सातबारा), Mutation entries (फेरफार), and Form 8-A (खाते उतारा). Confirmed applicant is the lawful, bona fide occupant/holder with clear marketable title and no court stay or civil injunction.',
  },
  {
    id: 'factor_boundary_demarcation',
    code: 'MLRC-F2',
    category: 'Site Demarcation',
    title: 'Physical Demarcation & Boundary Verification (सीमा निश्चिती व बिन-अतिक्रमण)',
    description: 'Ground boundaries (Haddakayam) physically demarcated matching official village cadastre (Nakashe). Confirmed zero encroachment on adjoining private land, Gaothan, grazing land (Gairan), or Government plots.',
  },
  {
    id: 'factor_approach_road',
    code: 'MLRC-F3',
    category: 'Access & Right-of-Way',
    title: 'Approach Road & Right-of-Way Access (रस्ता व वहिवाट पोहोच)',
    description: 'Adequate, unobstructed direct public road access of requisite statutory width (minimum 9m to 12m) is physically available and connected to site without bottleneck or dispute.',
  },
  {
    id: 'factor_zoning_compliance',
    code: 'MLRC-F4',
    category: 'Zoning & Master Plan',
    title: 'Zoning & Regional/Development Plan Compliance (झोन व विकास योजना सुसंगतता)',
    description: 'Plot falls within permissible non-agricultural conversion zone under approved Regional Plan / Development Plan (DP) and conforms with Town Planning zoning reservations for requested use.',
  },
  {
    id: 'factor_setbacks_environment',
    code: 'MLRC-F5',
    category: 'Environmental & Safety',
    title: 'Environmental Buffer, Flood Line & HT Line Setbacks (पर्यावरण व सुरक्षित अंतर)',
    description: 'Site is situated outside river/nallah statutory flood buffer zones (outside Blue Line & Red Line), outside eco-sensitive zones, and maintains safe clearance from High Tension (HT) electricity corridors.',
  },
  {
    id: 'factor_tenancy_ceiling',
    code: 'MLRC-F6',
    category: 'Statutory Tenancy & Ceiling',
    title: 'Tenancy Laws & Land Ceiling Compliance (कुळकायदा व कमाल जमीन धारणा)',
    description: 'Confirmed compliance with Bombay Tenancy & Agricultural Lands Act, 1948 (Sec 43 & 63). Land does not violate agricultural ceiling limits and is NOT restricted Tribal land under Section 36 / 36A MLRC.',
  },
  {
    id: 'factor_revenue_dues',
    code: 'MLRC-F7',
    category: 'Government Dues',
    title: 'Government Revenue Dues & Tax Arrears Clearance (शासकीय थकबाकी निरंक)',
    description: 'All past land revenue, non-agricultural cess, local cesses, and agricultural taxes are fully paid up to date with zero outstanding arrears (Nil / निरंक).',
  },
];

const STANDARD_CONDITIONS = [
  'Development / construction must strictly commence within one year from the date of final NA Sanction Order (Sec 44 MLRC).',
  'Statutory road-widening setback (if notified by PWD, ZP, or NHAI) must be kept open and surrendered without monetary compensation.',
  'NA conversion permission is subject to obtaining formal layout and building plan sanction from the competent Town Planning Authority.',
  'Adequate internal drainage, septic soak-pit system, and rainwater harvesting structures must be installed before occupying the premises.',
  'Green buffer of at least 10% area with native trees must be planted and preserved along the boundary.',
];

export default function TahsildarDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [data, setData]     = useState(null);
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState('');
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Verification Dossier Form State
  const [officerName, setOfficerName]     = useState(localStorage.getItem('username') || 'Nidhi');
  const [designation, setDesignation]     = useState('Tahsildar & Executive Magistrate');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [roadAccess, setRoadAccess]       = useState('12.0 Meters Public Asphalt Road');
  const [verifiedArea, setVerifiedArea]   = useState('');
  const [selectedFactors, setSelectedFactors] = useState(STATUTORY_FACTORS.map(f => f.id));
  const [remarks, setRemarks]             = useState(
    'Site physically inspected on ground. Boundaries (Haddakayam) demarcated matching village revenue records. Direct 12m public road approach confirmed. Title, possession, and non-agricultural statutory factors verified without objections.'
  );
  const [selectedConditions, setSelectedConditions] = useState(STANDARD_CONDITIONS.slice(0, 3));
  const [customCondition, setCustomCondition]       = useState('');
  const [showRejectBox, setShowRejectBox]           = useState(false);
  const [rejectionReason, setRejectionReason]       = useState('');

  useEffect(() => {
    if (!localStorage.getItem('tahsildar_token')) { navigate('/tahsildar/login'); return; }
    tApi.get(`/tahsildar/applications/${id}/`).then(r => {
      setData(r.data);
      const l = r.data?.form_data?.service_specific_details || r.data?.form_data?.land_details || {};
      if (l.area_sqmt || l.total_area) {
        setVerifiedArea(`${l.area_sqmt || l.total_area} Sq. Mt.`);
      }
    });
  }, [id, navigate]);

  if (!data) return <p className="loading-txt">Loading application dossier…</p>;
  const { application: app, documents, form_data } = data;

  const applicant = form_data?.applicant_details || {};
  const land = form_data?.service_specific_details || form_data?.land_details || {};
  const clearances = form_data?.statutory_and_proximity_clearances || {};

  // Check if there is an existing verification report document
  const verificationDoc = documents?.find(d => d.document_name === 'Tahsildar Field Verification Report');
  const verificationReport = verificationDoc?.raw_json || null;

  const toggleFactor = (fid) => {
    setSelectedFactors(prev =>
      prev.includes(fid) ? prev.filter(x => x !== fid) : [...prev, fid]
    );
  };

  const selectAllFactors = () => {
    setSelectedFactors(STATUTORY_FACTORS.map(f => f.id));
  };

  const clearAllFactors = () => {
    setSelectedFactors([]);
  };

  const toggleCondition = (cond) => {
    setSelectedConditions(prev =>
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const addCustomCondition = (e) => {
    e.preventDefault();
    if (customCondition.trim() && !selectedConditions.includes(customCondition.trim())) {
      setSelectedConditions(prev => [...prev, customCondition.trim()]);
      setCustomCondition('');
    }
  };

  const handleApprove = async (e) => {
    if (e) e.preventDefault();
    if (selectedFactors.length === 0) {
      alert('⚠️ Please check and verify at least one statutory factor before submitting the report.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const payload = {
        factors: STATUTORY_FACTORS.map(f => ({
          id: f.id,
          title: f.title,
          category: f.category,
          checked: selectedFactors.includes(f.id),
        })),
        inspection_date: inspectionDate,
        officer_name: officerName,
        designation,
        verified_area: verifiedArea,
        road_access: roadAccess,
        remarks,
        conditions: selectedConditions,
        village: land.land_village || land.village || '',
        taluka: land.land_taluka || land.taluka || '',
        district: land.land_district || land.district || '',
        gat_no: land.gat_number || land.gat_no || land.survey_no || '',
        owner_names: applicant.full_name || app?.user_email || '',
      };

      await tApi.post(`/tahsildar/applications/${id}/approve/`, payload);
      setMsg('✅ Statutory Verification Report & Findings successfully submitted to District Collector!');
      setBusy(false);
      setTimeout(() => navigate('/tahsildar/dashboard'), 1600);
    } catch (err) {
      alert('Failed to submit approval report: ' + (err.response?.data?.error || err.message));
      setBusy(false);
    }
  };

  const handleReject = async (e) => {
    if (e) e.preventDefault();
    if (!rejectionReason.trim()) {
      alert('Please enter a specific statutory objection or rejection reason.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await tApi.post(`/tahsildar/applications/${id}/reject/`, { reason: rejectionReason });
      setMsg('❌ Discrepancies/Rejection recorded and file returned to Collector.');
      setBusy(false);
      setTimeout(() => navigate('/tahsildar/dashboard'), 1600);
    } catch (err) {
      alert('Failed to record rejection: ' + (err.response?.data?.error || err.message));
      setBusy(false);
    }
  };

  return (
    <div className="detail-page">
      <Link to="/tahsildar/dashboard" className="back-btn">← Back to Dashboard</Link>

      <div className="detail-header" style={{ alignItems: 'center' }}>
        <div>
          <h1>Application Detail & Inquiry Dossier</h1>
          <span className={`status-pill status-${app?.status}`}>{app?.status}</span>
        </div>
        <button
          onClick={() => setShowPdfModal(true)}
          style={{
            background: '#093252',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: 'auto',
          }}
        >
          📄 View / Print Official Form PDF
        </button>
      </div>

      {msg && <div className="success-msg" style={{ fontSize: '15px', padding: '14px', marginBottom: '20px' }}>{msg}</div>}

      {/* Grid: Applicant and Land Info */}
      <div className="detail-grid">
        <div className="detail-card">
          <h3>Application & Applicant Info</h3>
          <div className="info-row"><span>Reference</span><code>{app?.reference_no}</code></div>
          <div className="info-row"><span>Land Type</span><strong>{app?.land_type}</strong></div>
          <div className="info-row"><span>Applicant Email</span>{app?.user_email}</div>
          <div className="info-row"><span>Submitted</span>{new Date(app?.submitted_at || app?.created_at).toLocaleString()}</div>
          {app?.rejection_reason && <div className="info-row"><span>Current Notes / Remarks</span><em>{app.rejection_reason}</em></div>}
          <div className="info-row"><span>Full Name</span><strong>{applicant.full_name || '—'}</strong></div>
          <div className="info-row"><span>Aadhaar Number</span><code>{applicant.aadhaar_number || '—'}</code></div>
          <div className="info-row"><span>Contact</span>{applicant.mobile_no || '—'}</div>
          <div className="info-row">
            <span>Location</span>
            {(applicant.taluka || applicant.res_taluka)
              ? `${applicant.village || applicant.res_village ? (applicant.village || applicant.res_village) + ', ' : ''}${applicant.taluka || applicant.res_taluka}, ${applicant.district || applicant.res_district} - ${applicant.pincode || applicant.res_pincode}`
              : (applicant.residence_address || '—')}
          </div>
        </div>

        <div className="detail-card">
          <h3>Land & Non-Agricultural Specifications</h3>
          <div className="info-row"><span>Gat / Survey #</span><strong>{land.gat_number || land.gat_no || land.survey_no || '—'}</strong></div>
          <div className="info-row">
            <span>Land Location</span>
            {(land.land_village || land.village) ? `${land.land_village || land.village}, ${land.land_taluka || land.taluka || ''}, ${land.land_district || land.district || ''}` : '—'}
          </div>
          <div className="info-row"><span>Total Area</span><strong>{(land.area_sqmt || land.total_area) ? `${land.area_sqmt || land.total_area} Sq. Mt.` : '—'}</strong></div>
          <div className="info-row"><span>Assessment / Rent</span>{land.assessment_rent ? `₹ ${land.assessment_rent}` : (land.assessment ? `₹ ${land.assessment}` : '—')}</div>
          <div className="info-row"><span>Superior Holder</span>{land.holder_type || 'Occupant Class I'}</div>
          <div className="info-row"><span>Area Breakdown</span>Residential: {land.area_residential || 0}m² | Commercial: {land.area_commercial || 0}m² | Ind: {land.area_industrial || 0}m²</div>
          <div className="info-row"><span>Approach Road</span>{clearances.approach_road_provision || 'Yes'}</div>
          <div className="info-row"><span>HT Line Traversal</span>{clearances.near_ht_line || 'No'}</div>
        </div>

        {/* Uploaded Documents List */}
        <div className="detail-card" style={{ gridColumn: '1 / -1' }}>
          <h3>Uploaded Documents & Dossier Records ({documents?.length})</h3>
          {documents?.map((d, i) => (
            <div key={i} className="doc-row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span className="doc-num">{i+1}</span>
                <div>
                  <div className="doc-name" style={{ fontWeight: '700', color: d.document_name === 'Tahsildar Field Verification Report' ? '#166534' : '#0f172a' }}>
                    {d.document_name === 'Tahsildar Field Verification Report' ? '📜 ' + d.document_name : d.document_name}
                  </div>
                  {d.village && <div className="doc-meta">Village: {d.village} | Taluka: {d.taluka} | District: {d.district}</div>}
                  {d.owner_names && <div className="doc-meta" style={{ color: '#047857' }}>Recorded Subject: {d.owner_names}</div>}
                </div>
              </div>
              <div>
                {d.document_name === 'Application Form - e-District Maharashtra' || (!d.file_url && d.raw_json && d.document_name !== 'Tahsildar Field Verification Report') ? (
                  <button
                    onClick={() => setShowPdfModal(true)}
                    style={{
                      background: '#093252',
                      color: '#ffffff',
                      padding: '5px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    📄 View / Print Form PDF ↗
                  </button>
                ) : d.file_url ? (
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="doc-link" style={{ background: '#0f172a', color: '#fff', padding: '5px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: '12px' }}>
                    View Original File ↗
                  </a>
                ) : (
                  <span style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold' }}>Official Archive</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IF ALREADY VERIFIED: DISPLAY OFFICIAL VERIFICATION REPORT CARD */}
      {(app?.status === 'tahsildar_verified' || app?.status === 'collector_approved' || app?.status === 'approved') && (
        <div className="action-card" style={{ marginTop: '24px', borderTop: '4px solid #16a34a', background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span> Official Tahsildar Statutory Field Verification Findings
              </h3>
              <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>
                Submitted under Section 44 of Maharashtra Land Revenue Code, 1966.
              </p>
            </div>
            <span className="status-pill status-tahsildar_verified">✓ Verified & Recommended</span>
          </div>

          <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div><span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Inspecting Authority</span><strong>{verificationReport?.officer_name || 'Tahsildar Office'} ({verificationReport?.designation || 'Tahsildar & Executive Magistrate'})</strong></div>
              <div><span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Date of Field Visit</span><strong>{verificationReport?.inspection_date || (app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : 'Recorded')}</strong></div>
              <div><span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Verified Net Area</span><strong>{verificationReport?.verified_area || ((land.area_sqmt || land.total_area) ? `${land.area_sqmt || land.total_area} Sq. Mt.` : 'As per Survey')}</strong></div>
              <div><span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Approach Road</span><strong>{verificationReport?.road_access || '12.0m Public Road'}</strong></div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Verification Summary / Ground Notes</span>
              <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '6px', color: '#166534', fontSize: '13.5px', border: '1px solid #bbf7d0', fontStyle: 'italic' }}>
                {app.rejection_reason || verificationReport?.remarks || 'All statutory factors verified without objections. Forwarded for Collector Sanction.'}
              </div>
            </div>
          </div>

          {/* Checklist of Statutory Factors Verified */}
          <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✅</span> Statutory Factors Verified by Tahsildar (7/7 Confirmed)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '10px' }}>
              {STATUTORY_FACTORS.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '16px' }}>✓</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{f.title}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>{f.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PENDING APPROVAL SECTION: INTERACTIVE STATUTORY FACTORS VERIFICATION FORM */}
      {(app?.status === 'pending' || app?.status === 'forwarded_to_tahsildar') && (
        <div className="action-card" style={{ marginTop: '28px', borderTop: '4px solid #093252' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>
            <div>
              <h2 style={{ margin: 0, color: '#093252', fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>⚖️</span> Tahsildar Statutory Field Verification & Inquiry Dossier
              </h2>
              <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13.5px' }}>
                Under Section 44 of Maharashtra Land Revenue Code, 1966. Verify all statutory factors on ground before recommending conversion.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '4px', fontWeight: '700' }}>
                {selectedFactors.length} of {STATUTORY_FACTORS.length} Factors Verified
              </span>
            </div>
          </div>

          <form onSubmit={handleApprove}>
            {/* 1. Officer & Inspection Meta */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>
                1. Inspecting Officer & Ground Inquiry Particulars
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Inspecting Officer Name *
                  </label>
                  <input
                    type="text"
                    className="input-wrap"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13.5px' }}
                    value={officerName}
                    onChange={e => setOfficerName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Officer Designation *
                  </label>
                  <input
                    type="text"
                    className="input-wrap"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13.5px' }}
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Date of Ground Inspection *
                  </label>
                  <input
                    type="date"
                    className="input-wrap"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13.5px' }}
                    value={inspectionDate}
                    onChange={e => setInspectionDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Verified Net Area (Sq. Mt.)
                  </label>
                  <input
                    type="text"
                    className="input-wrap"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13.5px' }}
                    value={verifiedArea}
                    onChange={e => setVerifiedArea(e.target.value)}
                    placeholder="e.g. 500 Sq. Mt."
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Approach Road Width & Type
                  </label>
                  <input
                    type="text"
                    className="input-wrap"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13.5px' }}
                    value={roadAccess}
                    onChange={e => setRoadAccess(e.target.value)}
                    placeholder="e.g. 12m Public Asphalt Road"
                  />
                </div>
              </div>
            </div>

            {/* 2. Mandatory Statutory Factors Checklist */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>
                    2. Mandatory Statutory Factors Checked & Validated on Ground
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Select and confirm each factor inspected during site verification</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={selectAllFactors}
                    style={{ background: '#093252', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11.5px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    ✓ Select All Factors
                  </button>
                  <button
                    type="button"
                    onClick={clearAllFactors}
                    style={{ background: '#e2e8f0', color: '#334155', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11.5px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', background: '#e2e8f0', height: '6px', borderRadius: '3px', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ width: `${(selectedFactors.length / STATUTORY_FACTORS.length) * 100}%`, background: selectedFactors.length === STATUTORY_FACTORS.length ? '#16a34a' : '#0284c7', height: '100%', transition: 'width 0.3s' }} />
              </div>

              {/* Factors List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {STATUTORY_FACTORS.map((factor) => {
                  const isChecked = selectedFactors.includes(factor.id);
                  return (
                    <label
                      key={factor.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        background: isChecked ? '#f0fdf4' : '#ffffff',
                        border: `1px solid ${isChecked ? '#86efac' : '#cbd5e1'}`,
                        borderRadius: '8px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFactor(factor.id)}
                        style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#16a34a', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', background: isChecked ? '#dcfce7' : '#f1f5f9', color: isChecked ? '#166534' : '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                            {factor.category}
                          </span>
                          <strong style={{ fontSize: '13.5px', color: isChecked ? '#14532d' : '#0f172a' }}>
                            {factor.title}
                          </strong>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: isChecked ? '#166534' : '#64748b', lineHeight: '1.4' }}>
                          {factor.description}
                        </p>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: isChecked ? '#16a34a' : '#94a3b8' }}>
                        {isChecked ? 'Passed ✓' : 'Pending'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. Field Observations & Remarks */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>
                3. Ground Inspection Findings & Specific Observations *
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px' }}>
                Enter field remarks including status of cultivation, existing structures, adjoining land boundaries, and water/electricity connectivity.
              </p>
              <textarea
                className="input-wrap"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '13px', lineHeight: '1.5' }}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Enter specific field inquiry notes..."
                required
              />
            </div>

            {/* 4. Recommended Conditions to District Collector */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>
                4. Statutory Conditions Recommended for District Collector NA Sanction
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
                Select conditions to be stipulated in the final Sanction Order under Maharashtra Land Revenue Code:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {STANDARD_CONDITIONS.map((cond, i) => {
                  const isChecked = selectedConditions.includes(cond);
                  return (
                    <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCondition(cond)}
                        style={{ marginTop: '2px', accentColor: '#093252' }}
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
                  placeholder="Add custom recommendation or local condition..."
                  value={customCondition}
                  onChange={e => setCustomCondition(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addCustomCondition}
                  style={{ background: '#093252', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
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
                  background: 'linear-gradient(135deg, #15803d, #166534)',
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
                  boxShadow: '0 2px 4px rgba(22, 101, 52, 0.2)',
                }}
              >
                {busy ? 'Processing Report…' : '✅ Submit Official Verification Report & Forward to Collector'}
              </button>

              <button
                type="button"
                onClick={() => setShowRejectBox(!showRejectBox)}
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  background: showRejectBox ? '#fecaca' : '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #f87171',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {showRejectBox ? '▲ Hide Rejection Form' : '❌ Raise Objections / Reject Application'}
              </button>
            </div>
          </form>

          {/* Collapsible Rejection Form */}
          {showRejectBox && (
            <div style={{ marginTop: '20px', background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '8px', padding: '18px' }}>
              <h4 style={{ margin: '0 0 6px', color: '#991b1b', fontSize: '15px' }}>
                Official Ground Rejection / Discrepancy Notice
              </h4>
              <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#7f1d1d' }}>
                Specify statutory grounds for rejection (e.g. Encroachment identified, HT line buffer violated, agricultural tenancy dispute pending, etc.):
              </p>
              <textarea
                className="input-wrap"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: '13px', marginBottom: '12px' }}
                placeholder="State specific discrepancy or statutory reason..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
              <button
                type="button"
                onClick={handleReject}
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
                {busy ? 'Recording Rejection…' : 'Confirm Rejection & Return File to Collector'}
              </button>
            </div>
          )}
        </div>
      )}

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
