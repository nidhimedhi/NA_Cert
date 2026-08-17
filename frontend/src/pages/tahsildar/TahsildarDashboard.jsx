import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const tApi = axios.create({ baseURL: 'http://127.0.0.1:8000/api' });
tApi.interceptors.request.use(c => {
  const t = localStorage.getItem('tahsildar_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

export default function TahsildarDashboard() {
  const navigate  = useNavigate();
  const [apps, setApps]     = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('tahsildar_token')) { navigate('/tahsildar/login'); return; }
    tApi.get(`/tahsildar/applications/?status=${filter}`)
      .then(r => setApps(r.data.applications))
      .catch(() => navigate('/tahsildar/login'))
      .finally(() => setLoading(false));
  }, [filter]);

  const logout = () => { localStorage.removeItem('tahsildar_token'); navigate('/tahsildar/login'); };

  const FILTERS = ['pending', 'approved', 'rejected'];

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-brand">🏛 Tahsildar</div>
        <nav>
          {FILTERS.map(f => (
            <button key={f} className={`sidebar-link ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
              {f === 'pending' ? '📥 Upcoming' : f === 'approved' ? '✅ Approved' : '❌ Rejected'}
            </button>
          ))}
        </nav>
        <button className="sidebar-logout" onClick={logout}>Logout</button>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>{filter.charAt(0).toUpperCase() + filter.slice(1)} Applications</h1>
          <span className="badge-count">{apps.length}</span>
        </div>

        {loading ? <p className="loading-txt">Loading…</p> :
         apps.length === 0 ? <p className="empty-txt">No {filter} applications.</p> : (
          <div className="apps-table-wrap">
            <table className="apps-table">
              <thead><tr><th>#</th><th>Reference</th><th>Land Type</th><th>Applicant</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {apps.map((a, i) => (
                  <tr key={a.id}>
                    <td>{i+1}</td>
                    <td><code>{a.reference_no}</code></td>
                    <td>{a.land_type}</td>
                    <td>{a.user_email}</td>
                    <td>{new Date(a.submitted_at || a.created_at).toLocaleDateString()}</td>
                    <td><span className={`status-pill status-${a.status}`}>{a.status}</span></td>
                    <td><Link to={`/tahsildar/application/${a.id}`} className="btn-view">View →</Link></td>
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
