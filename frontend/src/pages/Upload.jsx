import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

const CATEGORIES = [
  { key: 'Residential', icon: '🏡', color: '#2563eb', desc: 'For housing, plots & residential developments', sub: ['Individual', 'Partnership'] },
  { key: 'Educational', icon: '🎓', color: '#7c3aed', desc: 'For schools, colleges & educational institutions', sub: ['Granted', 'Semi-Granted', 'Private'] },
  { key: 'Industrial',  icon: '🏭', color: '#0f766e', desc: 'For factories, warehouses & industrial zones', sub: ['Granted', 'Semi-Granted', 'Private'] },
  { key: 'Commercial',  icon: '🏢', color: '#b45309', desc: 'For shops, offices & commercial establishments', sub: ['Granted', 'Semi-Granted', 'Private'] },
];

export default function Upload() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState({});
  const [modal, setModal] = useState(null); // { landType }
  const [accepted, setAccepted] = useState(false);
  const [activeTab, setActiveTab] = useState({});

  useEffect(() => {
    api.get('/land-types/').then(r => setDocs(r.data.documents));
  }, []);

  const openModal = (landType) => { setModal({ landType }); setAccepted(false); };
  const proceed   = () => { navigate(`/apply?type=${encodeURIComponent(modal.landType)}`); };

  return (
    <>
      <Navbar />
      <div className="upload-hero">
        <span className="hero-badge">Maharashtra Government Portal</span>
        <h1>Non-Agricultural Land<br /><span>Certificate Application</span></h1>
        <p>Select your land category to see required documents and apply.</p>
      </div>

      <div className="upload-main">
        <div className="land-grid">
          {CATEGORIES.map(cat => {
            const tab = activeTab[cat.key] || cat.sub[0];
            const landType = `${cat.key} - ${tab}`;
            const required = docs[landType] || [];
            return (
              <div className="land-card" key={cat.key} style={{ '--card-color': cat.color }}>
                <div className="card-header">
                  <span className="card-icon">{cat.icon}</span>
                  <div>
                    <h3>{cat.key} Non-Agricultural Land</h3>
                    <p>{cat.desc}</p>
                  </div>
                  <span className="card-tag" style={{ background: cat.color }}>{cat.key}</span>
                </div>
                <div className="sub-tabs">
                  {cat.sub.map(s => (
                    <button key={s} className={`sub-tab ${tab === s ? 'active' : ''}`}
                      style={{ '--tab-color': cat.color }}
                      onClick={() => setActiveTab(p => ({ ...p, [cat.key]: s }))}>{s}</button>
                  ))}
                </div>
                <ul className="doc-list">
                  {required.map((d, i) => <li key={i} className="doc-item"><span className="doc-num">{i+1}</span>{d}</li>)}
                </ul>
                <button className="apply-btn" style={{ background: cat.color }}
                  onClick={() => openModal(landType)}>📋 Apply for NA Certificate</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontSize: 36 }}>📜</div>
              <h2>Important Instructions</h2>
              <p>Please read carefully before proceeding</p>
            </div>
            <div className="modal-body">
              <div className="modal-land-badge">Applying for: <strong>{modal.landType}</strong></div>
              <ul className="instr-list">
                {[
                  'All documents must be clear, legible, and complete.',
                  'Accepted formats: PDF, JPG, PNG — max 5MB per file.',
                  'Each document must be in its designated section.',
                  'Documents must be self-attested and not expired.',
                  '7/12 Utara must be the latest government-issued copy.',
                  'Your digital signature confirms document authenticity.',
                  'Processing takes 15–30 working days.',
                  'Do not submit duplicate applications.',
                ].map((t, i) => <li key={i}><span className="num">{i+1}.</span>{t}</li>)}
              </ul>
              <div className="instr-warning">⚠️ <strong>Legal Warning:</strong> Submitting forged documents is a criminal offence under IPC Section 420.</div>
              <label className="instr-accept">
                <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
                I have read all instructions and accept full legal responsibility.
              </label>
              <div className="modal-actions">
                <button className="btn-outline" onClick={() => setModal(null)}>← Go Back</button>
                <button className="btn-primary" disabled={!accepted} onClick={proceed}>Proceed to Upload →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
