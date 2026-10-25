import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../../services/api';
import { StateEmblem, InboxIcon, CheckIcon, XIcon, LockIcon, SearchIcon, ScaleIcon, ArrowRightIcon } from '../../components/Icons';

const tApi = axios.create({ baseURL: API_BASE });
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
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('tahsildar_token')) { navigate('/tahsildar/login'); return; }
    setLoading(true);
    setError('');
    tApi.get(`/tahsildar/applications/?status=${filter}`)
      .then(r => setApps(r.data.applications || []))
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem('tahsildar_token');
          navigate('/tahsildar/login');
        } else {
          setError(err.response?.data?.error || 'Failed to load applications from taluka revenue registry.');
        }
      })
      .finally(() => setLoading(false));
  }, [filter, navigate]);

  const logout = () => { localStorage.removeItem('tahsildar_token'); navigate('/tahsildar/login'); };

  const FILTERS = [
    { key: 'pending', label: 'Pending Inquiry', icon: InboxIcon },
    { key: 'approved', label: 'Inquiry Verified', icon: CheckIcon },
    { key: 'rejected', label: 'Objections Raised', icon: XIcon },
  ];

  const filteredApps = useMemo(() => {
    if (!search.trim()) return apps;
    const q = search.toLowerCase();
    return apps.filter(a => 
      (a.reference_no || '').toLowerCase().includes(q) ||
      (a.user_email || '').toLowerCase().includes(q) ||
      (a.land_type || '').toLowerCase().includes(q)
    );
  }, [apps, search]);

  return (
    <div className="dashboard-page">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <StateEmblem size={36} color="#d97706" />
          <div>
            <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '14.5px', letterSpacing: '0.2px' }}>Office of Tahsildar</div>
            <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Taluka Revenue Registry</div>
          </div>
        </div>

        <div style={{ padding: '16px 20px 8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b' }}>
            Inquiry Desks
          </span>
        </div>

        <nav style={{ padding: '0 10px' }}>
          {FILTERS.map(f => {
            const Icon = f.icon;
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                style={{ borderRadius: '6px', margin: '3px 0' }}
                onClick={() => setFilter(f.key)}
              >
                <Icon size={16} />
                <span style={{ flex: 1, textAlign: 'left' }}>{f.label}</span>
                {isActive && <span className="badge-count" style={{ padding: '2px 8px', fontSize: '11px' }}>{apps.length}</span>}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '10px 12px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '11px', fontWeight: '700' }}>
              <ScaleIcon size={14} /> Section 44 MLRC
            </div>
            <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px', lineHeight: '1.4' }}>
              Field inquiry & boundary verification for routine non-granted lands.
            </div>
          </div>

          <button className="sidebar-logout" style={{ margin: 0, width: '100%' }} onClick={logout}>
            <LockIcon size={14} /> Sign Out Authority
          </button>
        </div>
      </aside>

      {/* MAIN DASHBOARD */}
      <main className="dashboard-main">
        {/* TOP BANNER */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px 24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f766e', background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '3px 10px', borderRadius: '12px', marginBottom: '8px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0d9488' }}></span>
                Executive Magistrate Adjudication Desk
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f2942', margin: 0, letterSpacing: '-0.3px' }}>
                {filter === 'pending' ? 'Applications Awaiting Field Inquiry' : filter === 'approved' ? 'Verified & Recommended Applications' : 'Applications with Statutory Objections'}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                Jurisdictional ground verification, Form 7/12 cross-verification, and Haddakayam demarcation reports.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search reference or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    padding: '8px 14px 8px 34px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    minWidth: '240px',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
                <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <SearchIcon size={14} />
                </div>
              </div>
              <span className="badge-count" style={{ padding: '6px 14px', fontSize: '12.5px' }}>
                {filteredApps.length} Records
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '13.5px', fontWeight: '600' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Accessing revenue database…</div>
          </div>
        ) : filteredApps.length === 0 ? (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
            <InboxIcon size={32} className="mx-auto text-slate-400" />
            <p style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '12px 0 4px' }}>
              No {filter} applications in this registry view
            </p>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              All applications under this stage have been adjudicated or awaiting new citizen submissions.
            </p>
          </div>
        ) : (
          <div className="apps-table-wrap">
            <table className="apps-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Reference No.</th>
                  <th>Land Category</th>
                  <th>Applicant Holder</th>
                  <th>Submission Date</th>
                  <th>Statutory Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((a, i) => (
                  <tr key={a.id}>
                    <td style={{ color: '#64748b', fontWeight: '600' }}>{i + 1}</td>
                    <td><code>{a.reference_no}</code></td>
                    <td style={{ fontWeight: '600', color: '#0f2942' }}>{a.land_type}</td>
                    <td style={{ color: '#334155' }}>{a.user_email}</td>
                    <td style={{ color: '#64748b', fontSize: '13px' }}>
                      {new Date(a.submitted_at || a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td><span className={`status-pill status-${a.status}`}>{a.status}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/tahsildar/application/${a.id}`} className="btn-view">
                        Conduct Inquiry <ArrowRightIcon size={12} />
                      </Link>
                    </td>
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
