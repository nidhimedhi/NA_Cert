import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

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

  useEffect(() => {
    if (!localStorage.getItem('tahsildar_token')) { navigate('/tahsildar/login'); return; }
    tApi.get(`/tahsildar/applications/${id}/`).then(r => setData(r.data));
  }, [id]);

  const approve = async () => {
    setBusy(true);
    await tApi.post(`/tahsildar/applications/${id}/approve/`);
    setMsg('✅ Application approved!'); setBusy(false);
    setTimeout(() => navigate('/tahsildar/dashboard'), 1500);
  };

  const reject = async () => {
    if (!reason.trim()) { alert('Please enter a rejection reason.'); return; }
    setBusy(true);
    await tApi.post(`/tahsildar/applications/${id}/reject/`, { reason });
    setMsg('❌ Application rejected.'); setBusy(false);
    setTimeout(() => navigate('/tahsildar/dashboard'), 1500);
  };

  if (!data) return <p className="loading-txt">Loading…</p>;
  const { application: app, documents } = data;

  return (
    <div className="detail-page">
      <Link to="/tahsildar/dashboard" className="back-btn">← Back to Dashboard</Link>
      <div className="detail-header">
        <h1>Application Detail</h1>
        <span className={`status-pill status-${app?.status}`}>{app?.status}</span>
      </div>

      {msg && <div className="success-msg">{msg}</div>}

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Application Info</h3>
          <div className="info-row"><span>Reference</span><code>{app?.reference_no}</code></div>
          <div className="info-row"><span>Land Type</span><strong>{app?.land_type}</strong></div>
          <div className="info-row"><span>Applicant</span>{app?.user_email}</div>
          <div className="info-row"><span>Submitted</span>{new Date(app?.submitted_at || app?.created_at).toLocaleString()}</div>
          {app?.rejection_reason && <div className="info-row"><span>Rejection Reason</span><em>{app.rejection_reason}</em></div>}
        </div>

        <div className="detail-card">
          <h3>Uploaded Documents ({documents?.length})</h3>
          {documents?.map((d, i) => (
            <div key={i} className="doc-row">
              <span className="doc-num">{i+1}</span>
              <div>
                <div className="doc-name">{d.document_name}</div>
                {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="doc-link">View File →</a>}
                {d.village && <div className="doc-meta">Village: {d.village} | Taluka: {d.taluka} | District: {d.district}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {app?.status === 'pending' && (
        <div className="action-card">
          <h3>Take Action</h3>
          <div className="action-row">
            <button className="btn-approve" onClick={approve} disabled={busy}>✅ Approve</button>
            <div className="reject-group">
              <input className="input-wrap" placeholder="Rejection reason…" value={reason} onChange={e => setReason(e.target.value)} />
              <button className="btn-reject" onClick={reject} disabled={busy}>❌ Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
