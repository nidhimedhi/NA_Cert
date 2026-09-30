import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

const UPI_PAYEE_ID = 'rajnandinijoshi402@okhdfcbank';
const UPI_PAYEE_NAME = 'Maharashtra Revenue Department / Rajnandini Joshi';

export default function Apply() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const landType   = params.get('type') || 'Residential - Individual';
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

  // -------------------------------------------------------------
  // Cost Component & Conversion Premium Calculation State
  // -------------------------------------------------------------
  const initialCategory = landType.toLowerCase().includes('commercial') ? 'Commercial'
    : landType.toLowerCase().includes('industrial') ? 'Industrial'
    : landType.toLowerCase().includes('educational') ? 'Industrial/Other'
    : 'Residential';

  const [category, setCategory]               = useState(initialCategory);
  const [areaSqMt, setAreaSqMt]               = useState(500);
  const [readyReckonerRate, setReadyReckoner] = useState(2500); // Rs per sq.m
  const [marketValue, setMarketValue]         = useState(1500000); // Total Land Market Value for Commercial/Industrial
  const [govAppFee, setGovAppFee]             = useState(1500); // Rs 500 - 5,000
  const [surveyCharges, setSurveyCharges]     = useState(7500); // Rs 5,000 - 25,000

  // Payment Modal & Confirmation State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [utrNumber, setUtrNumber]               = useState('');
  const [copiedUpi, setCopiedUpi]               = useState(false);
  const [confirmedPayment, setConfirmedPayment] = useState(false);

  // Synchronize category if landType changes
  useEffect(() => {
    if (landType.toLowerCase().includes('commercial')) setCategory('Commercial');
    else if (landType.toLowerCase().includes('industrial')) setCategory('Industrial');
    else if (landType.toLowerCase().includes('educational')) setCategory('Industrial/Other');
    else setCategory('Residential');
  }, [landType]);

  useEffect(() => {
    api.get('/land-types/').then(r => {
      setDocs(r.data.documents[landType] || []);
    });
  }, [landType]);

  // -------------------------------------------------------------
  // Cost Calculation Formulas (as mandated):
  // 🗓 Government Application Fee: ₹500 – ₹5,000
  // 📊 Residential Conversion Premium: 50% of Ready Reckoner Rate Valuation
  // 📈 Commercial Conversion Premium: 75% of Market Value
  // 📉 Industrial/Other Premium: 20% of Market Value
  // 🗒 Survey & Mapping Charges: ₹5,000 – ₹25,000
  // -------------------------------------------------------------
  let conversionPremium = 0;
  let premiumRuleText = '';
  let valuationBasis = 0;

  if (category === 'Residential') {
    valuationBasis = (Number(areaSqMt) || 0) * (Number(readyReckonerRate) || 0);
    conversionPremium = Math.round(valuationBasis * 0.50); // 50% of Ready Reckoner Rate
    premiumRuleText = '50% of Ready Reckoner Rate (50% × Area × RR Rate)';
  } else if (category === 'Commercial') {
    valuationBasis = Number(marketValue) || 0;
    conversionPremium = Math.round(valuationBasis * 0.75); // 75% of Market Value
    premiumRuleText = '75% of Market Value';
  } else {
    // Industrial / Educational / Other
    valuationBasis = Number(marketValue) || 0;
    conversionPremium = Math.round(valuationBasis * 0.20); // 20% of Market Value
    premiumRuleText = '20% of Market Value';
  }

  const safeGovFee = Math.max(500, Math.min(5000, Number(govAppFee) || 500));
  const safeSurvey = Math.max(5000, Math.min(25000, Number(surveyCharges) || 5000));
  const totalPayable = safeGovFee + conversionPremium + safeSurvey;

  // Generate UPI Intent URL with calculated amount pre-filled
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(UPI_PAYEE_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=${totalPayable}&cu=INR&tn=NA-Conversion-Fee`;
  const dynamicQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(upiIntentUrl)}`;

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
    if (canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      hasSig.current = false;
    }
  };

  const handleFile = (i, file) => setFiles(p => ({ ...p, [i]: file }));
  const uploaded   = Object.keys(files).length;

  const handleInitiatePayment = (e) => {
    e.preventDefault();
    setError('');

    // Pre-validation
    let sig = '';
    if (sigTab === 'draw' && hasSig.current) sig = canvasRef.current.toDataURL();
    else if (sigTab === 'type') sig = 'typed:' + typeSig;
    else if (sigTab === 'upload' && sigData) sig = 'upload:' + sigData;

    if (!sig && !typeSig) {
      setError('Please provide a digital signature or type your name before proceeding to payment.');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }

    // Open Payment Modal
    setShowPaymentModal(true);
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_PAYEE_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const executeFinalSubmit = async () => {
    setBusy(true);
    setError('');
    let sig = '';
    if (sigTab === 'draw' && hasSig.current) sig = canvasRef.current.toDataURL();
    else if (sigTab === 'type') sig = 'typed:' + typeSig;
    else if (sigTab === 'upload' && sigData) sig = 'upload:' + sigData;

    const fd = new FormData();
    fd.append('land_type', landType);
    fd.append('signature_data', sig);
    docs.forEach((_, i) => { if (files[i+1]) fd.append(`doc_${i+1}`, files[i+1]); });

    // Append Statutory Fee & Payment Details
    fd.append('total_amount', `₹ ${totalPayable.toLocaleString('en-IN')}`);
    fd.append('gov_app_fee', `₹ ${safeGovFee.toLocaleString('en-IN')}`);
    fd.append('conversion_premium', `₹ ${conversionPremium.toLocaleString('en-IN')}`);
    fd.append('survey_charges', `₹ ${safeSurvey.toLocaleString('en-IN')}`);
    fd.append('premium_rule', premiumRuleText);
    fd.append('area_sqmt', `${areaSqMt} Sq. Mt.`);
    fd.append('rr_rate', `₹ ${readyReckonerRate} / Sq. Mt.`);
    fd.append('market_value', `₹ ${marketValue.toLocaleString('en-IN')}`);
    fd.append('utr_number', utrNumber || `UPI-TXN-${Date.now().toString().slice(-8)}`);
    fd.append('payment_status', 'PAID');

    try {
      const r = await api.post('/apply/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowPaymentModal(false);
      setSuccess({
        ...r.data,
        total_amount: `₹ ${totalPayable.toLocaleString('en-IN')}`,
        utr_number: utrNumber || `UPI-TXN-${Date.now().toString().slice(-8)}`,
        gov_app_fee: `₹ ${safeGovFee.toLocaleString('en-IN')}`,
        conversion_premium: `₹ ${conversionPremium.toLocaleString('en-IN')}`,
        survey_charges: `₹ ${safeSurvey.toLocaleString('en-IN')}`,
        premium_rule: premiumRuleText,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed.');
      setShowPaymentModal(false);
    } finally {
      setBusy(false);
    }
  };

  if (success) return (
    <>
      <Navbar />
      <div className="success-page" style={{ maxWidth: '820px', margin: '30px auto', padding: '0 20px', fontFamily: "'Inter', sans-serif" }}>
        <div className="success-card" style={{ background: '#ffffff', borderRadius: '12px', border: '2px solid #86efac', padding: '36px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#166534', margin: '0 0 10px' }}>
            Application & Statutory Fee Submitted Successfully!
          </h2>
          <p style={{ color: '#4b5563', fontSize: '15px', marginBottom: '24px' }}>
            Your NA Certificate Application and <strong>Government Revenue Challan</strong> have been recorded and forwarded to the <strong>District Collectorate</strong>.
          </p>

          {/* Official Payment Challan Summary */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '24px', textAlign: 'left', marginBottom: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <strong style={{ fontSize: '16px', color: '#0f172a' }}>🏛️ E-Challan & Fee Receipt</strong>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Revenue & Forest Dept, Govt. of Maharashtra</span>
              </div>
              <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
                ✓ PAYMENT VERIFIED
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Application Reference No</span>
                <strong style={{ fontFamily: 'monospace', fontSize: '16px', color: '#0f172a' }}>{success.reference_no}</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Land Category</span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>{success.land_type}</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>UPI Reference / UTR No</span>
                <strong style={{ fontFamily: 'monospace', fontSize: '14px', color: '#0f766e' }}>{success.utr_number}</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Payment Method</span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Google Pay / UPI ({UPI_PAYEE_ID})</strong>
              </div>
            </div>

            {/* Fee Breakdown Table */}
            <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>🗓 Government Application Fee (Range ₹500 – ₹5,000)</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600' }}>{success.gov_app_fee}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>
                      📊 Conversion Premium <span style={{ fontSize: '11px', color: '#0f766e' }}>({success.premium_rule})</span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600' }}>{success.conversion_premium}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>🗒 Survey & Mapping Charges (Range ₹5,000 – ₹25,000)</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600' }}>{success.survey_charges}</td>
                  </tr>
                  <tr style={{ background: '#f0fdf4' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '800', color: '#166534', fontSize: '14px' }}>
                      Grand Total Statutory Fee Paid
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: '#166534', fontSize: '16px' }}>
                      {success.total_amount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.print()}
              style={{
                background: '#0f766e',
                color: '#ffffff',
                border: 'none',
                padding: '12px 22px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              🖨️ Print Statutory Fee Challan
            </button>
            <Link
              to={`/track/${success.reference_no}`}
              style={{
                textDecoration: 'none',
                background: '#0f172a',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '14px',
              }}
            >
              🔍 Track Application Status →
            </Link>
            <Link
              to="/upload"
              style={{
                textDecoration: 'none',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '12px 20px',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              ← Apply for Another Land
            </Link>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="apply-page" style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px 20px', fontFamily: "'Inter', sans-serif" }}>
        <div className="back-bar" style={{ marginBottom: '16px' }}>
          <Link to="/upload" className="back-btn" style={{ textDecoration: 'none', color: '#0f766e', fontWeight: '600' }}>
            ← Back to Land Types
          </Link>
        </div>

        <div className="apply-header" style={{ marginBottom: '24px' }}>
          <div className="apply-icon" style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
            Non-Agricultural (NA) Application Dossier & Fee Assessment
          </h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
            Applying for Land Purpose: <strong style={{ color: '#0f766e' }}>{landType}</strong>
          </p>
        </div>

        {error && (
          <div className="error-box" style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleInitiatePayment}>
          {/* 1. DOCUMENT UPLOAD SECTION */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📁</span> Step 1: Upload Mandatory Statutory Documents ({uploaded}/{docs.length})
            </h3>

            <div className="doc-upload-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {docs.map((doc, i) => (
                <div
                  className="doc-upload-card"
                  key={i}
                  style={{
                    background: '#ffffff',
                    border: files[i+1] ? '1px solid #86efac' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                >
                  <div className="doc-upload-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div className="doc-num" style={{ background: '#f1f5f9', color: '#0f766e', fontWeight: 'bold', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                        {i+1}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '13.5px', color: '#1e293b' }}>{doc}</h4>
                        <span className="req-badge" style={{ fontSize: '11px', color: '#dc2626' }}>Required</span>
                      </div>
                    </div>
                    <div className={`doc-status ${files[i+1] ? 'uploaded' : ''}`} style={{ fontSize: '12px', fontWeight: '600', color: files[i+1] ? '#16a34a' : '#94a3b8' }}>
                      {files[i+1] ? '✅ Ready' : '⬜ Pending'}
                    </div>
                  </div>
                  <label
                    className="doc-upload-zone"
                    style={{
                      border: '1px dashed #cbd5e1',
                      borderRadius: '6px',
                      padding: '12px',
                      textAlign: 'center',
                      display: 'block',
                      cursor: 'pointer',
                      background: files[i+1] ? '#f0fdf4' : '#fafafa',
                    }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={e => handleFile(i+1, e.target.files[0])}
                    />
                    <div className="duz-icon" style={{ fontSize: '20px', marginBottom: '4px' }}>📂</div>
                    <p className="duz-text" style={{ margin: '2px 0', fontSize: '12px', color: files[i+1] ? '#166534' : '#475569', fontWeight: files[i+1] ? '600' : 'normal' }}>
                      {files[i+1] ? files[i+1].name : 'Click to select document'}
                    </p>
                    <p className="duz-hint" style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>PDF, JPG, PNG — max 5MB</p>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* 2. STATUTORY COST & CONVERSION PREMIUM CALCULATOR */}
          <div
            style={{
              background: '#f8fafc',
              border: '2px solid #0f766e',
              borderRadius: '12px',
              padding: '26px',
              marginBottom: '32px',
              boxShadow: '0 4px 18px rgba(15, 118, 110, 0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', borderBottom: '2px solid #ccfbf1', paddingBottom: '14px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '19px', fontWeight: '800', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🧮</span> Step 2: Statutory Fee & Conversion Premium Calculator
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569' }}>
                  Automatic calculation based on Maharashtra Land Revenue Code & Town Planning ready reckoner norms.
                </p>
              </div>
              <span style={{ background: '#ccfbf1', color: '#0f766e', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '700' }}>
                Instant Dynamic Assessment
              </span>
            </div>

            {/* Statutory Rate Card Reference Banner */}
            <div style={{ background: '#ffffff', border: '1px solid #99f6e4', borderRadius: '8px', padding: '14px 18px', marginBottom: '22px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#134e4a', marginBottom: '8px' }}>
                📌 Statutory Cost Schedule Reference
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px', fontSize: '12px' }}>
                <div style={{ background: '#f0fdfa', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccfbf1' }}>
                  🗓 <strong>Govt Application Fee:</strong> ₹500 – ₹5,000
                </div>
                <div style={{ background: '#eff6ff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  📊 <strong>Residential Premium:</strong> 50% of Ready Reckoner Rate
                </div>
                <div style={{ background: '#fffbeb', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                  📈 <strong>Commercial Premium:</strong> 75% of Market Value
                </div>
                <div style={{ background: '#f5f3ff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd6fe' }}>
                  📉 <strong>Industrial/Other:</strong> 20% of Market Value
                </div>
                <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  🗒 <strong>Survey & Mapping:</strong> ₹5,000 – ₹25,000
                </div>
              </div>
            </div>

            {/* Interactive Calculator Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '22px' }}>
              {/* Category Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                  Conversion Purpose Category *
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px', fontWeight: '600', color: '#0f172a' }}
                >
                  <option value="Residential">Residential (50% of Ready Reckoner)</option>
                  <option value="Commercial">Commercial (75% of Market Value)</option>
                  <option value="Industrial">Industrial (20% of Market Value)</option>
                  <option value="Industrial/Other">Educational / Other (20% of Market Value)</option>
                </select>
              </div>

              {/* Land Area */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                  Land Area (in Sq. Meters) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={areaSqMt}
                  onChange={e => setAreaSqMt(Math.max(1, Number(e.target.value) || 0))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                  required
                />
              </div>

              {/* Ready Reckoner Rate (Shown for Residential) */}
              {category === 'Residential' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                    Ready Reckoner Rate (₹/Sq. Mtr) *
                  </label>
                  <input
                    type="number"
                    min="100"
                    value={readyReckonerRate}
                    onChange={e => setReadyReckoner(Number(e.target.value) || 0)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                    required
                  />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Govt Ready Reckoner valuation rate</span>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                    Land Market Value (₹) *
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="10000"
                    value={marketValue}
                    onChange={e => setMarketValue(Number(e.target.value) || 0)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                    required
                  />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Assessed parcel market valuation</span>
                </div>
              )}

              {/* Government Application Fee */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#1e293b' }}>Govt Application Fee (₹)</label>
                  <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: '600' }}>₹500 – ₹5,000</span>
                </div>
                <input
                  type="number"
                  min="500"
                  max="5000"
                  step="100"
                  value={govAppFee}
                  onChange={e => setGovAppFee(Number(e.target.value) || 500)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>

              {/* Survey & Mapping Charges */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#1e293b' }}>Survey & Mapping Charges (₹)</label>
                  <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: '600' }}>₹5,000 – ₹25,000</span>
                </div>
                <input
                  type="number"
                  min="5000"
                  max="25000"
                  step="500"
                  value={surveyCharges}
                  onChange={e => setSurveyCharges(Number(e.target.value) || 5000)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>
            </div>

            {/* LIVE DYNAMIC FEE BREAKDOWN & TOTAL CARD */}
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '2px solid #99f6e4', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#134e4a' }}>
                  📊 Real-Time Statutory Fee Breakdown
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Auto-recalculated upon input</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>🗓 Govt Application Fee</span>
                  <strong style={{ fontSize: '16px', color: '#0f172a' }}>₹ {safeGovFee.toLocaleString('en-IN')}</strong>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Standard statutory filing tariff</div>
                </div>

                <div style={{ background: '#f0fdfa', padding: '12px', borderRadius: '6px', border: '1px solid #99f6e4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#0f766e', fontWeight: '700' }}>⚡ Conversion Premium</span>
                    <span style={{ fontSize: '10.5px', background: '#ccfbf1', color: '#0f766e', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      {category === 'Residential' ? '50% RR' : category === 'Commercial' ? '75% MV' : '20% MV'}
                    </span>
                  </div>
                  <strong style={{ fontSize: '18px', color: '#0f766e', display: 'block', marginTop: '2px' }}>
                    ₹ {conversionPremium.toLocaleString('en-IN')}
                  </strong>
                  <div style={{ fontSize: '11px', color: '#0d9488', marginTop: '2px' }}>{premiumRuleText}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>🗒 Survey & Mapping Charges</span>
                  <strong style={{ fontSize: '16px', color: '#0f172a' }}>₹ {safeSurvey.toLocaleString('en-IN')}</strong>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Cadastral ground demarcation</div>
                </div>
              </div>

              {/* GRAND TOTAL ROW */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0f766e, #115e59)',
                  color: '#ffffff',
                  padding: '16px 20px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#ccfbf1', fontWeight: '700' }}>
                    Total Statutory Amount Payable
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#e6fffa', marginTop: '2px' }}>
                    Payable via Google Pay / UPI QR Code at end of submission
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px' }}>
                    ₹ {totalPayable.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#99f6e4' }}>
                    (Application + Premium + Survey)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. DIGITAL SIGNATURE SECTION */}
          <div className="signature-section" style={{ background: '#ffffff', padding: '22px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '28px' }}>
            <div className="signature-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '20px' }}>✍️</span>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Step 3: Digital Signature & Declaration</h4>
              <span className="req-badge" style={{ fontSize: '11px', color: '#dc2626' }}>Required</span>
            </div>

            <div className="sig-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              {['draw','type','upload'].map(t => (
                <button
                  key={t}
                  type="button"
                  className={`sig-tab ${sigTab===t?'active':''}`}
                  onClick={() => setSigTab(t)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: sigTab === t ? '2px solid #0f766e' : '1px solid #cbd5e1',
                    background: sigTab === t ? '#f0fdfa' : '#ffffff',
                    color: sigTab === t ? '#0f766e' : '#475569',
                    fontWeight: sigTab === t ? '700' : '500',
                    cursor: 'pointer',
                  }}
                >
                  {t === 'draw' ? '✏️ Draw Signature' : t === 'type' ? '⌨️ Type Full Name' : '📁 Upload Signature File'}
                </button>
              ))}
            </div>

            {sigTab === 'draw' && (
              <div className="sig-panel">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={130}
                  className="sig-canvas"
                  style={{ border: '2px dashed #94a3b8', borderRadius: '6px', background: '#f8fafc', width: '100%', maxWidth: '600px', cursor: 'crosshair', display: 'block', marginBottom: '8px' }}
                />
                <button
                  type="button"
                  className="sig-clear"
                  onClick={clearCanvas}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                >
                  ✕ Clear Canvas
                </button>
              </div>
            )}

            {sigTab === 'type' && (
              <div className="sig-panel">
                <input
                  className="sig-type-input"
                  placeholder="Type your official full name as signature…"
                  value={typeSig}
                  onChange={e => setTypeSig(e.target.value)}
                  style={{ width: '100%', maxWidth: '500px', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', marginBottom: '10px' }}
                />
                <div className="sig-preview" style={{ fontFamily: 'cursive', fontSize: '24px', color: '#1e3a8a', padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                  {typeSig || 'Your signature preview will appear here'}
                </div>
              </div>
            )}

            {sigTab === 'upload' && (
              <div className="sig-panel">
                <label className="sig-upload-zone" style={{ display: 'inline-block', padding: '12px 20px', background: '#f8fafc', border: '1px dashed #94a3b8', borderRadius: '6px', cursor: 'pointer' }}>
                  <input
                    type="file"
                    name="signature_file"
                    accept=".jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    onChange={e => setSigData(e.target.files[0]?.name || '')}
                  />
                  🖊️ Click to upload signature image (PNG, JPG)
                </label>
                {sigData && <p className="sig-status done" style={{ color: '#16a34a', fontSize: '13px', marginTop: '6px' }}>✅ {sigData}</p>}
              </div>
            )}
          </div>

          {/* 4. PROCEED TO PAYMENT & SUBMISSION ACTION */}
          <div
            style={{
              background: '#ffffff',
              padding: '20px 24px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Total Challan Payable Amount</div>
              <strong style={{ fontSize: '22px', color: '#0f766e' }}>
                ₹ {totalPayable.toLocaleString('en-IN')}
              </strong>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Link to="/upload" className="btn-outline" style={{ textDecoration: 'none', padding: '12px 20px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontSize: '14px' }}>
                Cancel
              </Link>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #0f766e, #115e59)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '13px 28px',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)',
                }}
              >
                <span>💳 Proceed to Payment & QR Code (₹ {totalPayable.toLocaleString('en-IN')}) →</span>
              </button>
            </div>
          </div>
        </form>

        {/* ========================================================= */}
        {/* STATUTORY PAYMENT & QR CODE MODAL                         */}
        {/* ========================================================= */}
        {showPaymentModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                maxWidth: '680px',
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                border: '2px solid #0f766e',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0f766e, #093252)',
                  color: '#ffffff',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTopLeftRadius: '14px',
                  borderTopRightRadius: '14px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: '#99f6e4', fontWeight: '700' }}>
                    Government of Maharashtra • Revenue & Forest Dept
                  </div>
                  <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: '800' }}>
                    Statutory NA Conversion Fee Payment Challan
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#fff',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px' }}>
                {/* Large Amount Display */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '2px dashed #86efac',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'center',
                    marginBottom: '20px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total Assessed Amount to Pay
                  </span>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#166534', margin: '4px 0' }}>
                    ₹ {totalPayable.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Govt Fee: ₹{safeGovFee.toLocaleString('en-IN')} | Premium: ₹{conversionPremium.toLocaleString('en-IN')} | Survey: ₹{safeSurvey.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* QR Code Presentation Box */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                    marginBottom: '20px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
                    Scan with Google Pay / Any UPI App to Pay
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px' }}>
                    {/* Single Official QR Code for Rajnandini Joshi */}
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          background: '#ffffff',
                          padding: '12px',
                          border: '2.5px solid #0f766e',
                          borderRadius: '12px',
                          display: 'inline-block',
                          boxShadow: '0 6px 18px rgba(15, 118, 110, 0.12)',
                        }}
                      >
                        <img
                          src="/payment_qr.png"
                          alt="Google Pay QR Code - Rajnandini Joshi"
                          style={{ width: '210px', height: '210px', objectFit: 'contain', display: 'block', borderRadius: '4px' }}
                        />
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>Rajnandini Joshi</strong>
                        <span style={{ fontSize: '11.5px', color: '#0f766e', fontWeight: '600' }}>Official Google Pay / UPI QR</span>
                      </div>
                    </div>
                  </div>

                  {/* UPI ID Info with Copy Button */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '12px',
                      maxWidth: '100%',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#475569' }}>UPI ID:</span>
                    <code style={{ fontSize: '14px', fontWeight: '800', color: '#0f766e', background: '#e6fffa', padding: '3px 8px', borderRadius: '4px' }}>
                      {UPI_PAYEE_ID}
                    </code>
                    <button
                      type="button"
                      onClick={copyUpiId}
                      style={{
                        background: copiedUpi ? '#16a34a' : '#0f766e',
                        color: '#fff',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {copiedUpi ? '✓ Copied!' : '📋 Copy UPI ID'}
                    </button>
                  </div>

                  {/* Direct Launch Button for Mobile Users */}
                  <div style={{ marginTop: '12px' }}>
                    <a
                      href={upiIntentUrl}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12.5px',
                        color: '#0369a1',
                        textDecoration: 'none',
                        fontWeight: '700',
                        background: '#e0f2fe',
                        padding: '6px 14px',
                        borderRadius: '20px',
                      }}
                    >
                      📲 Click here to pay directly in Google Pay / UPI App
                    </a>
                  </div>
                </div>

                {/* Payment Confirmation & UTR Input */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                    Enter 12-Digit UPI Transaction ID / UTR Number *
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="e.g. 427189012345 (Found in Google Pay payment details)"
                    value={utrNumber}
                    onChange={e => setUtrNumber(e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid #94a3b8',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      boxSizing: 'border-box',
                      marginBottom: '10px',
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={confirmedPayment}
                      onChange={e => setConfirmedPayment(e.target.checked)}
                      style={{ accentColor: '#0f766e', width: '16px', height: '16px' }}
                    />
                    <span>I confirm that I have transferred ₹{totalPayable.toLocaleString('en-IN')} to {UPI_PAYEE_ID}.</span>
                  </label>
                </div>

                {/* Final Submit & Back Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#475569',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    ← Edit Form
                  </button>
                  <button
                    type="button"
                    onClick={executeFinalSubmit}
                    disabled={busy || !confirmedPayment}
                    style={{
                      flex: 2,
                      padding: '12px 20px',
                      background: (!confirmedPayment || busy) ? '#94a3b8' : 'linear-gradient(135deg, #16a34a, #15803d)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14.5px',
                      fontWeight: '800',
                      cursor: (!confirmedPayment || busy) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                    }}
                  >
                    {busy ? 'Verifying & Submitting…' : '✅ Confirm Payment & Submit Application'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
