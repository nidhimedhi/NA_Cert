import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

export default function Apply() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const landType   = params.get('type') || '';
  const [docs, setDocs]       = useState([]);
  const [files, setFiles]     = useState({});
  const [sigTab, setSigTab]   = useState('draw');
  const [sigData, setSigData] = useState('');
  const [typeSig, setTypeSig] = useState('');
  const [success, setSuccess] = useState(null);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const canvasRef  = useRef(null);
  const drawing    = useRef(false);
  const hasSig     = useRef(false);

  useEffect(() => {
    api.get('/land-types/').then(r => {
      setDocs(r.data.documents[landType] || []);
    });
  }, [landType]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return { x: (src.clientX - r.left) * (canvas.width / r.width), y: (src.clientY - r.top) * (canvas.height / r.height) };
    };
    const down = e => { drawing.current = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = e => { if (!drawing.current) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hasSig.current = true; };
    const up   = () => { drawing.current = false; };
    canvas.addEventListener('mousedown', down); canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', up); canvas.addEventListener('mouseleave', up);
    canvas.addEventListener('touchstart', e => { e.preventDefault(); down(e); }, { passive: false });
    canvas.addEventListener('touchmove',  e => { e.preventDefault(); move(e); }, { passive: false });
    canvas.addEventListener('touchend', up);
    return () => { canvas.removeEventListener('mousedown', down); };
  }, [sigTab]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    hasSig.current = false;
  };

  const handleFile = (i, file) => setFiles(p => ({ ...p, [i]: file }));
  const uploaded   = Object.keys(files).length;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    let sig = '';
    if (sigTab === 'draw' && hasSig.current) sig = canvasRef.current.toDataURL();
    else if (sigTab === 'type') sig = 'typed:' + typeSig;

    const fd = new FormData();
    fd.append('land_type', landType);
    fd.append('signature_data', sig);
    docs.forEach((_, i) => { if (files[i+1]) fd.append(`doc_${i+1}`, files[i+1]); });

    try {
      const r = await api.post('/apply/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed.');
    } finally { setBusy(false); }
  };

  if (success) return (
    <>
      <Navbar />
      <div className="success-page">
        <div className="success-card">
          <div className="success-icon">🎉</div>
          <h2>Application Submitted!</h2>
          <p>Reference Number: <strong>{success.reference_no}</strong></p>
          <p>Category: <strong>{success.land_type}</strong></p>
          <p>Your application will be reviewed within 15–30 working days.</p>
          <Link to="/upload" className="btn-primary">← Back to Land Types</Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="apply-page">
        <div className="back-bar"><Link to="/upload" className="back-btn">← Back to Land Types</Link></div>
        <div className="apply-header">
          <div className="apply-icon">📋</div>
          <h2>Upload Your Documents</h2>
          <p>Applying for: <strong>{landType}</strong></p>
        </div>

        {error && <div className="error-box">⚠️ {error}</div>}

        <form onSubmit={submit}>
          {/* Documents */}
          <div className="doc-upload-grid">
            {docs.map((doc, i) => (
              <div className="doc-upload-card" key={i}>
                <div className="doc-upload-header">
                  <div className="doc-num">{i+1}</div>
                  <div>
                    <h4>{doc}</h4>
                    <span className="req-badge">Required</span>
                  </div>
                  <div className={`doc-status ${files[i+1] ? 'uploaded' : ''}`}>
                    {files[i+1] ? '✅ Uploaded' : '⬜ Not uploaded'}
                  </div>
                </div>
                <label className="doc-upload-zone">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                    onChange={e => handleFile(i+1, e.target.files[0])} />
                  <div className="duz-icon">📂</div>
                  <p className="duz-text">{files[i+1] ? files[i+1].name : 'Click or drag file here'}</p>
                  <p className="duz-hint">PDF, JPG, PNG — max 5MB</p>
                </label>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="upload-progress-bar">
            <div className="upb-label"><span>Documents Uploaded</span><span>{uploaded} / {docs.length}</span></div>
            <div className="upb-track"><div className="upb-fill" style={{ width: docs.length ? `${(uploaded/docs.length)*100}%` : '0%' }} /></div>
          </div>

          {/* Signature */}
          <div className="signature-section">
            <div className="signature-header">✍️ <h4>Digital Signature</h4> <span className="req-badge">Required</span></div>
            <div className="sig-tabs">
              {['draw','type','upload'].map(t => (
                <button key={t} type="button" className={`sig-tab ${sigTab===t?'active':''}`} onClick={() => setSigTab(t)}>
                  {t === 'draw' ? '✏️ Draw' : t === 'type' ? '⌨️ Type' : '📁 Upload'}
                </button>
              ))}
            </div>
            {sigTab === 'draw' && (
              <div className="sig-panel">
                <canvas ref={canvasRef} width={600} height={150} className="sig-canvas" />
                <button type="button" className="sig-clear" onClick={clearCanvas}>✕ Clear</button>
              </div>
            )}
            {sigTab === 'type' && (
              <div className="sig-panel">
                <input className="sig-type-input" placeholder="Type your full name…" value={typeSig} onChange={e => setTypeSig(e.target.value)} />
                <div className="sig-preview">{typeSig || 'Your signature will appear here'}</div>
              </div>
            )}
            {sigTab === 'upload' && (
              <div className="sig-panel">
                <label className="sig-upload-zone">
                  <input type="file" name="signature_file" accept=".jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => setSigData(e.target.files[0]?.name || '')} />
                  🖊️ Click to upload signature image
                </label>
                {sigData && <p className="sig-status done">✅ {sigData}</p>}
              </div>
            )}
          </div>

          <div className="apply-actions">
            <Link to="/upload" className="btn-outline">Cancel</Link>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Submitting…' : '✅ Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
