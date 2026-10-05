import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CertificateModal({ isOpen, onClose, referenceNumber }) {
  const [lang, setLang] = useState('mr'); // 'mr' | 'en'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && referenceNumber) {
      setLoading(true);
      setError('');
      axios.get(`http://127.0.0.1:8000/api/certificate/${encodeURIComponent(referenceNumber)}/`)
        .then(res => {
          setData(res.data);
        })
        .catch(err => {
          setError(err.response?.data?.error || 'Failed to load certificate data.');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, referenceNumber]);

  if (!isOpen) return null;

  const cert = data?.certificate || {};
  const conditions = data?.conditions || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="cert-modal-backdrop" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      overflowY: 'auto',
      padding: '20px 10px',
    }}>
      {/* MODAL CONTROL HEADER (HIDDEN IN PRINT) */}
      <div className="no-print" style={{
        width: '100%',
        maxWidth: '880px',
        background: '#0f172a',
        color: '#fff',
        borderRadius: '10px 10px 0 0',
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ background: '#10b981', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
            Official NA Sanction Order
          </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '14px', color: '#93c5fd' }}>
            {referenceNumber}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* LANGUAGE TOGGLE */}
          <div style={{ display: 'inline-flex', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setLang('mr')}
              style={{
                background: lang === 'mr' ? '#3b82f6' : 'transparent',
                color: lang === 'mr' ? '#fff' : '#94a3b8',
                border: 'none',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              मराठी
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              style={{
                background: lang === 'en' ? '#3b82f6' : 'transparent',
                color: lang === 'en' ? '#fff' : '#94a3b8',
                border: 'none',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              English
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: '#10b981',
              color: '#fff',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🖨️ Print / Save PDF
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* PAPER CERTIFICATE BODY */}
      <div id="print-certificate-area" style={{
        width: '100%',
        maxWidth: '880px',
        background: '#ffffff',
        padding: '40px 50px',
        color: '#1e293b',
        fontFamily: "'Mukta', 'Inter', sans-serif",
        lineHeight: '1.5',
        position: 'relative',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        borderRadius: '0 0 10px 10px',
        marginBottom: '40px',
      }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            Loading Official Non-Agricultural Sanction Certificate…
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#ef4444' }}>
            ⚠️ {error}
          </div>
        ) : (
          <>
            {/* WATERMARK */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-35deg)',
              fontSize: '44px',
              fontWeight: 900,
              color: 'rgba(16, 185, 129, 0.04)',
              textTransform: 'uppercase',
              letterSpacing: '5px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              userSelect: 'none',
              textAlign: 'center',
            }}>
              GOVERNMENT OF MAHARASHTRA<br />NA SANCTION ORDER
            </div>

            {/* HEADER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #0f172a',
              paddingBottom: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Government / Municipal Crest */}
                <svg width="68" height="68" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="46" stroke="#0f172a" strokeWidth="2.5" fill="#f8fafc" />
                  <circle cx="50" cy="50" r="40" stroke="#0f172a" strokeWidth="1" />
                  <path d="M50 16 L54 26 L64 27 L56 34 L58 44 L50 38 L42 44 L44 34 L36 27 L46 26 Z" fill="#0f172a" />
                  <rect x="36" y="48" width="28" height="14" rx="2" fill="#0f172a" />
                  <circle cx="50" cy="55" r="4" fill="#f8fafc" />
                  <path d="M30 68 C40 64, 60 64, 70 68 L66 74 C58 72, 42 72, 34 74 Z" fill="#0f172a" />
                  <text x="50" y="86" fontFamily="'Mukta', sans-serif" fontSize="8.5" fontWeight="bold" textAnchor="middle" fill="#0f172a">
                    सत्यमेव जयते
                  </text>
                </svg>

                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px', lineHeight: 1.2 }}>
                    {lang === 'mr' ? cert.office_name_mr : cert.office_name_en}
                  </h1>
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: '0 0 2px' }}>
                    {lang === 'mr' ? cert.dept_name_mr : cert.dept_name_en}
                  </h2>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {lang === 'mr' ? 'महाराष्ट्र शासन • नगर रचना व महसूल प्रशासन' : 'Government of Maharashtra • Town Planning & Revenue Administration'}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '13px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  {lang === 'mr' ? 'जा. क्र. : ' : 'Outward No. : '} {cert.order_no}
                </div>
                <div style={{ color: '#334155' }}>
                  {lang === 'mr' ? 'दिनांक : ' : 'Date : '} {cert.sanction_date}
                </div>
              </div>
            </div>

            {/* RECIPIENT */}
            <div style={{ marginBottom: '14px', fontSize: '13.5px' }}>
              <span style={{ fontWeight: 700, display: 'block' }}>{lang === 'mr' ? 'प्रति,' : 'To,'}</span>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {cert.applicant_name}
              </div>
              <div style={{ color: '#475569' }}>
                {cert.applicant_address}
              </div>
            </div>

            {/* SUBJECT */}
            <div style={{
              background: '#f8fafc',
              borderLeft: '4px solid #0f172a',
              padding: '10px 14px',
              marginBottom: '14px',
              fontSize: '13px',
              lineHeight: 1.45,
            }}>
              <strong style={{ color: '#0f172a' }}>{lang === 'mr' ? 'विषय :- ' : 'Subject :- '}</strong>
              {lang === 'mr' ? (
                <span>मौ. {cert.village} येथील गट नं. {cert.gat_no} (पैकी) क्षेत्र {cert.area_sqmt} चौ. मी. इतक्या जमिनीची {cert.purpose_mr} अधिन्यास / अकृषिक (NA) परवानगी मिळणे बाबत.</span>
              ) : (
                <span>Regarding grant of Layout & Non-Agricultural (NA) Permission for land bearing Gat/Survey No. {cert.gat_no} (Part), admeasuring {cert.area_sqmt} Sq. Mtrs. situated at Village {cert.village}, Taluka {cert.taluka}, District {cert.district} for {cert.purpose_en}.</span>
              )}
            </div>

            {/* REFERENCE */}
            <div style={{ fontSize: '12.5px', marginBottom: '14px', color: '#334155' }}>
              <strong style={{ color: '#0f172a' }}>{lang === 'mr' ? 'संदर्भ :- ' : 'Reference :- '}</strong>
              <ol style={{ marginLeft: '20px', marginTop: '4px' }}>
                <li>{lang === 'mr' ? 'संचिका क्र. / अर्ज संदर्भ : ' : 'File / Application Reference : '} <strong>{cert.reference_no}</strong></li>
                <li>{lang === 'mr' ? 'आपला अर्ज दिनांक : ' : 'Citizen Application Date : '} {cert.application_date}</li>
                <li>{lang === 'mr' ? 'भूमी अभिलेख खात्याकडील छाननी व मोजणी अहवाल.' : 'Field Scrutiny & Mojani Survey Report by Department of Land Records (TILR).'}</li>
              </ol>
            </div>

            {/* PREAMBLE */}
            <div style={{ fontSize: '13px', lineHeight: 1.5, textAlign: 'justify', marginBottom: '16px', color: '#1e293b' }}>
              {lang === 'mr' ? (
                <>
                  महाशय,<br />
                  विषयांकित प्रकरणी संदर्भीय विषयाच्या अनुषंगाने मौ. {cert.village} येथील गट नं. {cert.gat_no} (पैकी) क्षेत्र {cert.area_sqmt} चौ. मी. इतक्या जमिनीचा {cert.purpose_mr} अधिन्यास परवानगी सोबतच्या नकाशात हिरव्या रंगाने दुरुस्ती केले प्रमाणे रेखांकनास तात्पुरत्या / अंतिम स्वरुपाची मंजुरी खालील अटींनुसार देण्यात येत आहे.
                </>
              ) : (
                <>
                  Sir/Madam,<br />
                  With reference to the captioned subject and the formal application submitted for the conversion of land situated at Village {cert.village}, Taluka {cert.taluka}, District {cert.district} bearing Gat/Survey No. {cert.gat_no} (Part) admeasuring {cert.area_sqmt} Sq. Mtrs., Non-Agricultural (NA) Layout Sanction is hereby granted in accordance with the sanctioned demarcation layout plan subject to the following statutory terms and conditions:
                </>
              )}
            </div>

            {/* CONDITIONS HEADER */}
            <div style={{
              fontSize: '13.5px',
              fontWeight: 800,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px',
              borderBottom: '1px solid #cbd5e1',
              paddingBottom: '4px',
            }}>
              {lang === 'mr' ? '—: अटी व शर्ती :—' : '—: STATUTORY TERMS & CONDITIONS :—'}
            </div>

            {/* 24 CONDITIONS */}
            <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
              {conditions.map(c => (
                <li key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', fontSize: '12.5px', lineHeight: 1.45, textAlign: 'justify' }}>
                  <span style={{ fontWeight: 800, minWidth: '24px', color: '#0f172a' }}>{c.id}.</span>
                  <span style={{ color: '#1e293b' }}>
                    {lang === 'mr' ? c.mr : c.en}
                  </span>
                </li>
              ))}
            </ol>

            {/* SIGNATURE & VERIFICATION ROW */}
            <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                
                {/* QR Code */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '88px', height: '88px', border: '1px solid #cbd5e1', padding: '3px', background: '#fff', borderRadius: '4px' }}>
                    <svg width="80" height="80" viewBox="0 0 100 100">
                      <rect width="100" height="100" fill="#ffffff" />
                      <rect x="10" y="10" width="25" height="25" fill="#0f172a" />
                      <rect x="15" y="15" width="15" height="15" fill="#ffffff" />
                      <rect x="18" y="18" width="9" height="9" fill="#0f172a" />
                      <rect x="65" y="10" width="25" height="25" fill="#0f172a" />
                      <rect x="70" y="15" width="15" height="15" fill="#ffffff" />
                      <rect x="73" y="18" width="9" height="9" fill="#0f172a" />
                      <rect x="10" y="65" width="25" height="25" fill="#0f172a" />
                      <rect x="15" y="70" width="15" height="15" fill="#ffffff" />
                      <rect x="18" y="73" width="9" height="9" fill="#0f172a" />
                      <circle cx="50" cy="50" r="4" fill="#0f172a" />
                      <rect x="42" y="20" width="16" height="6" fill="#0f172a" />
                      <rect x="42" y="32" width="6" height="16" fill="#0f172a" />
                      <rect x="52" y="32" width="6" height="16" fill="#0f172a" />
                      <rect x="42" y="60" width="16" height="6" fill="#0f172a" />
                      <rect x="65" y="55" width="25" height="6" fill="#0f172a" />
                      <rect x="65" y="68" width="10" height="10" fill="#0f172a" />
                      <rect x="80" y="80" width="10" height="10" fill="#0f172a" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                    Govt Portal Verification QR
                  </div>
                </div>

                {/* District Collectorate Round Seal */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '84px',
                    height: '84px',
                    border: '2px dashed #059669',
                    borderRadius: '50%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8.5px',
                    fontWeight: 800,
                    color: '#047857',
                    textTransform: 'uppercase',
                    lineHeight: 1.1,
                  }}>
                    <span>★ DISTRICT ★</span>
                    <span>COLLECTORATE</span>
                    <span style={{ fontSize: '7px', color: '#065f46' }}>MAHARASHTRA</span>
                    <span>OFFICIAL SEAL</span>
                  </div>
                </div>

                {/* Official Signature */}
                <div style={{ textAlign: 'right', minWidth: '220px' }}>
                  <div style={{ height: '42px', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', marginBottom: '4px' }}>
                    <svg height="34" viewBox="0 0 160 40" fill="none">
                      <path d="M10 28 C 30 10, 45 35, 60 18 C 75 5, 85 30, 105 15 C 120 5, 135 25, 150 12" stroke="#1e3a8a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                      <path d="M40 32 C 60 30, 100 28, 140 26" stroke="#1e3a8a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                    {cert.signatory_name}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    {lang === 'mr' ? cert.signatory_title_mr : cert.signatory_title_en}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                    {lang === 'mr' ? cert.office_name_mr : cert.office_name_en}
                  </div>
                </div>

              </div>

              {/* ENDORSEMENT / COPIES */}
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', fontSize: '11.5px', lineHeight: 1.4, color: '#475569' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                  {lang === 'mr' ? 'प्रतिलिपि माहितीस्तव व पुढील आवश्यक त्या कार्यवाहीस्तव :-' : 'Copy forwarded for information and necessary compliance to :-'}
                </div>
                <ol style={{ paddingLeft: '16px' }}>
                  <li>{lang === 'mr' ? 'मा. जिल्हाधिकारी महोदय, जिल्हाधिकारी कार्यालय (District Collectorate).' : 'Hon. District Collector & Executive Magistrate, District Collectorate.'}</li>
                  <li>{lang === 'mr' ? 'सहाय्यक संचालक, नगर रचना शाखा कार्यालय (Town Planning Branch).' : 'Assistant Director, Town Planning Branch Office.'}</li>
                  <li>{lang === 'mr' ? 'तालुका निरीक्षक, भूमी अभिलेख (TILR) - अधिन्यासातील भूखंडांच्या अंतिम हद्दी व नकाशा नोंदीसाठी.' : 'Taluka Inspector of Land Records (TILR) - for demarcation records and cadastre entry.'}</li>
                  <li>{lang === 'mr' ? 'मालमत्ता व्यवस्थापक / कर विभाग, स्थानिक नियोजन प्राधिकरण - मोकळी जागा व रस्ते ताब्यात घेणे बाबत.' : 'Property Manager / Assessment Tax Dept, Local Authority - for taking possession of public spaces and roads.'}</li>
                </ol>
              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
}
