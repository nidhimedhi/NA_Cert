import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import {
  HomeIcon,
  GraduationCapIcon,
  FactoryIcon,
  BuildingIcon,
  FileTextIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  ScaleIcon
} from '../components/Icons';

const CATEGORIES = [
  {
    key: 'Residential',
    icon: HomeIcon,
    color: '#0f2942',
    accent: '#2563eb',
    desc: 'For private housing, group housing layouts & residential plotted developments',
    sub: ['Individual', 'Partnership']
  },
  {
    key: 'Educational',
    icon: GraduationCapIcon,
    color: '#0f2942',
    accent: '#7c3aed',
    desc: 'For recognized schools, junior/degree colleges, universities & research trusts',
    sub: ['Granted', 'Semi-Granted', 'Private']
  },
  {
    key: 'Industrial',
    icon: FactoryIcon,
    color: '#0f2942',
    accent: '#0d9488',
    desc: 'For manufacturing plants, agro-processing units, warehouses & logistics hubs',
    sub: ['Granted', 'Semi-Granted', 'Private']
  },
  {
    key: 'Commercial',
    icon: BuildingIcon,
    color: '#0f2942',
    accent: '#d97706',
    desc: 'For shopping complexes, corporate offices, hotels, hospitals & mixed retail',
    sub: ['Granted', 'Semi-Granted', 'Private']
  },
];

export default function Upload() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState({});
  const [modal, setModal] = useState(null); // { landType }
  const [accepted, setAccepted] = useState(false);
  const [activeTab, setActiveTab] = useState({});

  useEffect(() => {
    api.get('/land-types/').then(r => setDocs(r.data.documents)).catch(() => {});
  }, []);

  const isStateGovtRoute = (landTypeStr) => {
    const s = (landTypeStr || '').toLowerCase();
    const isGrant = s.includes('granted') || s.includes('semi-granted');
    const isTarget = s.includes('educational') || s.includes('commercial') || s.includes('industrial');
    const isPrivate = s.includes('private');
    return isGrant && isTarget && !isPrivate;
  };

  const openModal = (landType) => { setModal({ landType }); setAccepted(false); };
  const proceed   = () => { navigate(`/apply?type=${encodeURIComponent(modal.landType)}`); };

  return (
    <>
      <Navbar />
      {/* HERO SECTION */}
      <div className="upload-hero">
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div className="hero-badge">
            <ScaleIcon size={14} /> Maharashtra Land Revenue Code, 1966 • Section 44
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: '800', color: '#0f2942', margin: '0 0 10px', letterSpacing: '-0.4px' }}>
            Statutory NA Conversion Categories & Document Registry
          </h1>
          <p style={{ margin: '0 auto', fontSize: '15px', color: '#475569', lineHeight: '1.6', maxWidth: '640px' }}>
            Select your specific land classification and tenure type below to view statutory prerequisite documentation, clearance requirements, and commence the online petition.
          </p>
        </div>
      </div>

      {/* CATEGORIES GRID */}
      <div className="upload-main">
        <div className="land-grid">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const tab = activeTab[cat.key] || cat.sub[0];
            const landType = `${cat.key} - ${tab}`;
            const required = docs[landType] || [];
            const isGovt = isStateGovtRoute(landType);

            return (
              <div
                className="land-card"
                key={cat.key}
                style={{
                  borderTop: `3px solid ${cat.accent}`,
                  background: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                  border: '1px solid #e2e8f0',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* CARD HEADER */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '8px',
                    background: `${cat.accent}12`,
                    color: cat.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2942', margin: 0 }}>
                        {cat.key} Land Conversion
                      </h3>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #e2e8f0'
                      }}>
                        {cat.key}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b', lineHeight: '1.4' }}>
                      {cat.desc}
                    </p>
                  </div>
                </div>

                {/* SUB TABS */}
                <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '16px' }}>
                  {cat.sub.map(s => (
                    <button
                      key={s}
                      onClick={() => setActiveTab(p => ({ ...p, [cat.key]: s }))}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '5px',
                        border: tab === s ? `1px solid ${cat.accent}` : '1px solid transparent',
                        background: tab === s ? `${cat.accent}10` : 'transparent',
                        color: tab === s ? cat.accent : '#64748b',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* STATUTORY ROUTE NOTICE */}
                <div style={{
                  fontSize: '12px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isGovt ? '#eff6ff' : '#f0fdf4',
                  color: isGovt ? '#1e40af' : '#166534',
                  border: isGovt ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
                }}>
                  <ShieldCheckIcon size={15} />
                  <span>
                    {isGovt
                      ? 'Adjudication: Collector Desk → Maharashtra State Secretariat Concurrence'
                      : 'Adjudication: Direct Taluka Tahsildar Field Inquiry Route'}
                  </span>
                </div>

                {/* REQUIRED DOCS LIST */}
                <div style={{ marginBottom: '18px', flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#64748b', marginBottom: '8px' }}>
                    Mandatory Prerequisite Checklist ({required.length})
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {required.slice(0, 5).map((d, i) => (
                      <li key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12.5px',
                        color: '#334155',
                        background: '#f8fafc',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: '1px solid #f1f5f9'
                      }}>
                        <span style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#e2e8f0',
                          color: '#475569',
                          fontSize: '10px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d}</span>
                      </li>
                    ))}
                    {required.length > 5 && (
                      <li style={{ fontSize: '11.5px', color: '#64748b', paddingLeft: '8px', fontStyle: 'italic' }}>
                        + {required.length - 5} additional statutory annexures
                      </li>
                    )}
                  </ul>
                </div>

                {/* APPLY BUTTON */}
                <button
                  onClick={() => openModal(landType)}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0f2942',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#173b5d'}
                  onMouseOut={e => e.currentTarget.style.background = '#0f2942'}
                >
                  <FileTextIcon size={16} /> Apply for {tab} NA Sanction <ArrowRightIcon size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* INSTRUCTIONS MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ background: '#0f2942', padding: '22px 28px', color: '#ffffff', borderBottom: '3px solid #d97706' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <ShieldCheckIcon size={20} className="text-amber-400" />
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                  Statutory Submission Instructions
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#cbd5e1' }}>
                Please review legal obligations and documentation criteria prior to petition lodgment.
              </p>
            </div>

            <div style={{ padding: '24px 28px', background: '#ffffff' }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '10px 14px',
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#0f2942',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>Application Class:</span>
                <span style={{ color: '#d97706', fontWeight: '800' }}>{modal.landType}</span>
              </div>

              <div style={{
                fontSize: '12px',
                padding: '10px 14px',
                borderRadius: '6px',
                marginBottom: '16px',
                lineHeight: '1.45',
                background: isStateGovtRoute(modal.landType) ? '#eff6ff' : '#f0fdf4',
                color: isStateGovtRoute(modal.landType) ? '#1e40af' : '#166534',
                border: isStateGovtRoute(modal.landType) ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <ScaleIcon size={16} />
                <div>
                  <strong>Statutory Routing: </strong>
                  {isStateGovtRoute(modal.landType)
                    ? 'This Granted/Semi-Granted land requires State Government Secretariat sanction under Chapter IV of MLRC 1966. Files are examined by the District Collector and presented to Mantralaya.'
                    : 'This application falls under regular Taluka Tahsildar jurisdiction. Ground inspection and Haddakayam demarcation will be scheduled by the Executive Magistrate desk.'}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#64748b', marginBottom: '8px' }}>
                  Applicant Responsibilities
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    'All uploaded revenue records (7/12, 8-A, Mutation) must be certified digital copies issued within 90 days.',
                    'Accepted formats: PDF or JPG/PNG documents up to 5MB per statutory section.',
                    'Survey plan/Tippan must clearly show surrounding Gat boundaries and registered approach road.',
                    'Digital signature or authenticated sign-off certifies bona fide applicant ownership.',
                    'Statutory scrutiny is adjudicated within the timeline prescribed under Maharashtra Right to Public Services Act (RTS).'
                  ].map((t, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                      <CheckIcon size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#991b1b',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangleIcon size={16} />
                <div>
                  <strong>Statutory Warning:</strong> Misrepresentation of title or submission of fraudulent records is punishable under Section 420 of IPC and Section 45 of MLRC 1966.
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#1e293b', fontWeight: '600', cursor: 'pointer', marginBottom: '20px' }}>
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={e => setAccepted(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#0f2942', cursor: 'pointer' }}
                />
                I declare that I am the bona fide holder/authorized representative and accept full legal accountability.
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeftIcon size={12} /> Cancel
                </button>
                <button
                  type="button"
                  disabled={!accepted}
                  onClick={proceed}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: accepted ? '#0f2942' : '#94a3b8',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: accepted ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Proceed to Upload & Dossier Entry <ArrowRightIcon size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
