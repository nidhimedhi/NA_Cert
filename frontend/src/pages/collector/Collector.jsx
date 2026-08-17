import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const cApi = axios.create({ baseURL: 'http://127.0.0.1:8000/api' });
cApi.interceptors.request.use(c => {
  const t = localStorage.getItem('collector_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

export function CollectorDashboard() {
  const navigate  = useNavigate();
  const [apps, setApps]     = useState([]);
  const [filter, setFilter] = useState('approved');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('collector_token')) { navigate('/collector/login'); return; }
    cApi.get(`/collector/applications/?status=${filter}`)
      .then(r => setApps(r.data.applications))
      .catch(() => navigate('/collector/login'))
      .finally(() => setLoading(false));
  }, [filter]);

  const logout = () => { localStorage.removeItem('collector_token'); navigate('/collector/login'); };

  const FILTERS = [
    { key: 'approved', label: '📥 Tahsildar Approved' },
    { key: 'collector_approved', label: '✅ Collector Approved' },
    { key: 'collector_rejected', label: '❌ Collector Rejected' },
  ];

  return (
    <div className="dashboard-page">
      <aside className="sidebar" style={{ background: '#0d2233' }}>
        <div className="sidebar-brand">🏛 Collector</div>
        <nav>
          {FILTERS.map(f => (
            <button key={f.key} className={`sidebar-link ${filter===f.key?'active':''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </nav>
        <button className="sidebar-logout" onClick={logout}>Logout</button>
      </aside>
      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Applications – {FILTERS.find(f=>f.key===filter)?.label}</h1>
          <span className="badge-count">{apps.length}</span>
        </div>
        {loading ? <p className="loading-txt">Loading…</p> :
         apps.length === 0 ? <p className="empty-txt">No applications.</p> : (
          <div className="apps-table-wrap">
            <table className="apps-table">
              <thead><tr><th>#</th><th>Reference</th><th>Land Type</th><th>Applicant</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {apps.map((a, i) => (
                  <tr key={a.id}>
                    <td>{i+1}</td><td><code>{a.reference_no}</code></td>
                    <td>{a.land_type}</td><td>{a.user_email}</td>
                    <td><span className={`status-pill status-${a.status}`}>{a.status}</span></td>
                    <td><Link to={`/collector/application/${a.id}`} className="btn-view">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export function CollectorDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [data, setData]     = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState('');

  useEffect(() => {
    if (!localStorage.getItem('collector_token')) { navigate('/collector/login'); return; }
    cApi.get(`/collector/applications/${id}/`).then(r => setData(r.data));
  }, [id]);

  const approve = async () => {
    setBusy(true);
    await cApi.post(`/collector/applications/${id}/approve/`);
    setMsg('✅ Approved by Collector!'); setBusy(false);
    setTimeout(() => navigate('/collector/dashboard'), 1500);
  };
  const reject = async () => {
    if (!reason.trim()) { alert('Enter rejection reason.'); return; }
    setBusy(true);
    await cApi.post(`/collector/applications/${id}/reject/`, { reason });
    setMsg('❌ Rejected by Collector.'); setBusy(false);
    setTimeout(() => navigate('/collector/dashboard'), 1500);
  };

  if (!data) return <p className="loading-txt">Loading…</p>;
  const { application: app, documents } = data;

  return (
    <div className="detail-page">
      <Link to="/collector/dashboard" className="back-btn">← Back to Dashboard</Link>
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
        </div>
        <div className="detail-card">
          <h3>Documents ({documents?.length})</h3>
          {documents?.map((d, i) => (
            <div key={i} className="doc-row">
              <span className="doc-num">{i+1}</span>
              <div><div className="doc-name">{d.document_name}</div>
                {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="doc-link">View →</a>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {app?.status === 'approved' && (
        <div className="action-card">
          <h3>Take Action</h3>
          <div className="action-row">
            <button className="btn-approve" onClick={approve} disabled={busy}>✅ Collector Approve</button>
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
