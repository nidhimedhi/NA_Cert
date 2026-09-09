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

export default function TahsildarDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [data, setData]     = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState('');
  const [showPdfModal, setShowPdfModal] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('tahsildar_token')) { navigate('/tahsildar/login'); return; }
    tApi.get(`/tahsildar/applications/${id}/`).then(r => setData(r.data));
  }, [id, navigate]);

  const [notes, setNotes]   = useState('');

  const approve = async () => {
    setBusy(true);
    await tApi.post(`/tahsildar/applications/${id}/approve/`, { notes });
    setMsg('✅ Verified by Tahsildar and returned to Collector!'); setBusy(false);
    setTimeout(() => navigate('/tahsildar/dashboard'), 1500);
  };

  const reject = async () => {
    if (!reason.trim()) { alert('Please enter a rejection reason.'); return; }
    setBusy(true);
    await tApi.post(`/tahsildar/applications/${id}/reject/`, { reason });
    setMsg('❌ Rejected with reasons and returned to Collector.'); setBusy(false);
    setTimeout(() => navigate('/tahsildar/dashboard'), 1500);
  };

  if (!data) return <p className="loading-txt">Loading…</p>;
  const { application: app, documents, form_data } = data;

  const applicant = form_data?.applicant_details || {};
  const land = form_data?.service_specific_details || form_data?.land_details || {};
  const clearances = form_data?.statutory_and_proximity_clearances || {};

  return (
    <div className="detail-page">
      <Link to="/tahsildar/dashboard" className="back-btn">← Back to Dashboard</Link>
      <div className="detail-header" style={{ alignItems: 'center' }}>
        <div>
          <h1>Application Detail</h1>
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

      {msg && <div className="success-msg">{msg}</div>}

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Application & Applicant Info</h3>
          <div className="info-row"><span>Reference</span><code>{app?.reference_no}</code></div>
          <div className="info-row"><span>Land Type</span><strong>{app?.land_type}</strong></div>
          <div className="info-row"><span>Applicant Email</span>{app?.user_email}</div>
          <div className="info-row"><span>Submitted</span>{new Date(app?.submitted_at || app?.created_at).toLocaleString()}</div>
          {app?.rejection_reason && <div className="info-row"><span>Current Notes / Reason</span><em>{app.rejection_reason}</em></div>}
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

        <div className="detail-card" style={{ gridColumn: '1 / -1' }}>
          <h3>Uploaded Documents & Automated Dossier ({documents?.length})</h3>
          {documents?.map((d, i) => (
            <div key={i} className="doc-row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span className="doc-num">{i+1}</span>
                <div>
                  <div className="doc-name" style={{ fontWeight: '700' }}>{d.document_name}</div>
                  {d.village && <div className="doc-meta">Village: {d.village} | Taluka: {d.taluka} | District: {d.district}</div>}
                  {d.owner_names && <div className="doc-meta" style={{ color: '#047857' }}>Recorded Owners: {d.owner_names}</div>}
                </div>
              </div>
              <div>
                {d.document_name === 'Application Form - e-District Maharashtra' || (!d.file_url && d.raw_json) ? (
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
                  <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>Filed Online</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(app?.status === 'pending' || app?.status === 'forwarded_to_tahsildar') && (
        <div className="action-card">
          <h3>Field Verification & Ground Inquiry Decision</h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
            As Tahsildar, perform ground inspection and either verify & recommend the application to the Collector or reject with official grounds.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
              <h4 style={{ margin: '0 0 10px', color: '#166534' }}>Option A: Verify & Recommend</h4>
              <input
                className="input-wrap"
                style={{ width: '100%', marginBottom: '10px', boxSizing: 'border-box' }}
                placeholder="Optional inspection remarks / NOC notes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              <button className="btn-approve" onClick={approve} disabled={busy} style={{ width: '100%' }}>
                ✅ Verify & Return to Collector
              </button>
            </div>

            <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '6px', border: '1px solid #fecaca' }}>
              <h4 style={{ margin: '0 0 10px', color: '#991b1b' }}>Option B: Reject Application</h4>
              <input
                className="input-wrap"
                style={{ width: '100%', marginBottom: '10px', boxSizing: 'border-box' }}
                placeholder="Required rejection reason / discrepancy…"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
              <button className="btn-reject" onClick={reject} disabled={busy} style={{ width: '100%' }}>
                ❌ Reject with Reason & Return
              </button>
            </div>
          </div>
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
