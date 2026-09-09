import React from 'react';

export default function ApplicationPdfModal({ app, formData, onClose }) {
  if (!app) return null;

  const applicant = formData?.applicant_details || {};
  const land = formData?.service_specific_details || formData?.land_details || {};
  const clearances = formData?.statutory_and_proximity_clearances || {};
  const declaration = formData?.self_declaration || {};
  const checklist = formData?.attached_documents_checklist || {};
  const appDate = formData?.application_date || (app?.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-IN') : '10/09/2026');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pdf-modal-overlay" onClick={onClose}>
      <div className="pdf-modal-container" onClick={e => e.stopPropagation()}>
        {/* Top Control Bar (hidden during printing) */}
        <div className="pdf-modal-toolbar no-print">
          <div className="toolbar-left">
            <span style={{ fontSize: '18px' }}>📄</span>
            <strong>Official Application Form (PDF Dossier)</strong>
            <span className="toolbar-ref">{app.reference_no}</span>
          </div>
          <div className="toolbar-right">
            <button className="btn-print-pdf" onClick={handlePrint}>
              🖨️ Print / Save as PDF
            </button>
            <button className="btn-close-modal" onClick={onClose}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Official Document Sheet */}
        <div className="pdf-sheet print-target">
          {/* Header */}
          <div className="gov-header">
            <div className="gov-header-emblem">🏛️</div>
            <div className="gov-header-text">
              <h2>GOVERNMENT OF MAHARASHTRA</h2>
              <h3>REVENUE AND FOREST DEPARTMENT</h3>
              <h4>Application for Permission for Non-Agricultural (NA) Use of Land</h4>
              <p>(Under Section 44 of the Maharashtra Land Revenue Code, 1966)</p>
            </div>
            <div className="gov-header-right">
              <table className="office-use-box">
                <thead>
                  <tr>
                    <th colSpan="2">FOR OFFICE USE ONLY</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Reference No.</td>
                    <td><strong>{app.reference_no}</strong></td>
                  </tr>
                  <tr>
                    <td>Application Date</td>
                    <td><strong>{appDate}</strong></td>
                  </tr>
                  <tr>
                    <td>Initial Filing Office</td>
                    <td><strong>District Collectorate</strong></td>
                  </tr>
                  <tr>
                    <td>Status</td>
                    <td><span className="status-stamp">{app.status?.toUpperCase()}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <hr className="divider-line" />

          {/* Section 1: Applicant Particulars */}
          <div className="doc-section">
            <div className="section-title">1. APPLICANT PARTICULARS</div>
            <table className="data-table">
              <tbody>
                <tr>
                  <th style={{ width: '22%' }}>Full Legal Name</th>
                  <td style={{ width: '28%' }}><strong>{applicant.full_name || '—'}</strong></td>
                  <th style={{ width: '22%' }}>Aadhaar / ID Card No.</th>
                  <td style={{ width: '28%' }}><code>{applicant.aadhaar_number || '—'}</code></td>
                </tr>
                <tr>
                  <th>Gender / DOB</th>
                  <td>{applicant.gender || '—'} / {applicant.dob || '—'}</td>
                  <th>Mobile & Landline</th>
                  <td>{applicant.mobile_no || '—'} {applicant.landline ? `(LL: ${applicant.landline})` : ''}</td>
                </tr>
                <tr>
                  <th>Email Address</th>
                  <td>{applicant.email || app.user_email || '—'}</td>
                  <th>Residential Address</th>
                  <td>{applicant.residence_address || '—'}</td>
                </tr>
                <tr>
                  <th>Village / Taluka</th>
                  <td>{applicant.village || applicant.res_village || '—'} / {applicant.taluka || applicant.res_taluka || '—'}</td>
                  <th>District / PIN Code</th>
                  <td>{applicant.district || applicant.res_district || '—'} - {applicant.pincode || applicant.res_pincode || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Land & Non-Agricultural Specifications */}
          <div className="doc-section">
            <div className="section-title">2. DETAILS OF LAND FOR WHICH NA PERMISSION IS SOUGHT</div>
            <table className="data-table">
              <tbody>
                <tr>
                  <th style={{ width: '22%' }}>Applied Land Category</th>
                  <td style={{ width: '28%' }}><strong>{app.land_type}</strong></td>
                  <th style={{ width: '22%' }}>Gat / Survey Number</th>
                  <td style={{ width: '28%' }}><strong>{land.gat_number || land.gat_no || '—'}</strong></td>
                </tr>
                <tr>
                  <th>Village / Taluka</th>
                  <td>{land.land_village || land.village || '—'}, {land.land_taluka || land.taluka || '—'}</td>
                  <th>District</th>
                  <td>{land.land_district || land.district || '—'}</td>
                </tr>
                <tr>
                  <th>Total Proposed Area</th>
                  <td><strong>{land.area_sqmt ? `${land.area_sqmt} Sq. Meters` : '—'}</strong></td>
                  <th>Annual Assessment / Rent</th>
                  <td>₹ {land.assessment_rent || '0.00'}</td>
                </tr>
                <tr>
                  <th>Type of Assessment</th>
                  <td>{land.assessment_type || 'Agricultural'}</td>
                  <th>Superior Holder Type</th>
                  <td>{land.holder_type || 'Occupant Class I'}</td>
                </tr>
                <tr>
                  <th>Grant Type Applied For</th>
                  <td colSpan="3">{land.grant_type || 'Assessed or held for the purpose of agriculture for non-agricultural purpose'}</td>
                </tr>
                {land.grant_condition_detail && (
                  <tr>
                    <th>Gist of Condition</th>
                    <td colSpan="3">{land.grant_condition_detail}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 3: Proposed Area Breakdown */}
          <div className="doc-section">
            <div className="section-title">3. AREA BREAKDOWN BY PROPOSED PURPOSE (IN SQ. METERS)</div>
            <table className="data-table">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th>Purpose</th>
                  <th>Proposed Area (Sq. Mt.)</th>
                  <th>Purpose</th>
                  <th>Proposed Area (Sq. Mt.)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1. Residential Component</td>
                  <td><strong>{land.area_residential ? `${land.area_residential} Sq.m` : '0 Sq.m'}</strong></td>
                  <td>2. Commercial Component</td>
                  <td><strong>{land.area_commercial ? `${land.area_commercial} Sq.m` : '0 Sq.m'}</strong></td>
                </tr>
                <tr>
                  <td>3. Industrial Component</td>
                  <td><strong>{land.area_industrial ? `${land.area_industrial} Sq.m` : '0 Sq.m'}</strong></td>
                  <td>4. Other / Amenity Area</td>
                  <td><strong>{land.area_other_purpose ? `${land.area_other_purpose} Sq.m` : '0 Sq.m'}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 4: Statutory Clearances & Proximity */}
          <div className="doc-section">
            <div className="section-title">4. STATUTORY & PROXIMITY QUESTIONNAIRE</div>
            <table className="data-table">
              <tbody>
                <tr>
                  <td style={{ width: '50%' }}>Under Municipal / Planning Authority: <strong>{clearances.jurisdiction_municipal || 'No'}</strong></td>
                  <td style={{ width: '50%' }}>City Survey Undertaken: <strong>{clearances.city_survey_done || 'No'}</strong></td>
                </tr>
                <tr>
                  <td>Cantonment Jurisdiction Border: <strong>{clearances.cantonment_jurisdiction || 'No'}</strong></td>
                  <td>Under Regional Plan (MRTP Act 1966): <strong>{clearances.regional_plan || 'No'}</strong></td>
                </tr>
                <tr>
                  <td>Proximity to Railway / State Highway: <strong>{clearances.near_railway || 'No'}</strong></td>
                  <td>Proximity to Airport / Aerodrome: <strong>{clearances.near_airport || 'No'}</strong></td>
                </tr>
                <tr>
                  <td>Proximity to Jail / Public Office: <strong>{clearances.near_jail === 'Yes' || clearances.near_public_office === 'Yes' ? 'Yes' : 'No'}</strong></td>
                  <td>High Tension Line Traversal: <strong>{clearances.near_ht_line || 'No'}</strong> {clearances.ht_line_distance ? `(${clearances.ht_line_distance}m)` : ''}</td>
                </tr>
                <tr>
                  <td>Land Under Government Acquisition: <strong>{clearances.land_under_acquisition || 'No'}</strong></td>
                  <td>Approach Road Provision Made: <strong>{clearances.approach_road_provision || 'Yes'}</strong></td>
                </tr>
                <tr>
                  <td colSpan="2">
                    Prior NA Application Filed: <strong>{clearances.prior_application_submitted || 'No'}</strong>
                    {clearances.prior_rejection_reason && <span> (Note: {clearances.prior_rejection_reason})</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 5: Documents Checklist */}
          {Object.keys(checklist).length > 0 && (
            <div className="doc-section">
              <div className="section-title">5. ATTACHED DOCUMENTS CHECKLIST</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', background: '#f8fafc', padding: '10px 14px', border: '1px solid #cbd5e1' }}>
                {Object.entries(checklist).map(([docKey, isAttached], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{isAttached ? '☑' : '☐'}</span>
                    <span>{docKey}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 6: Self-Declaration & Signature */}
          <div className="doc-section" style={{ marginTop: '20px' }}>
            <div className="section-title">6. APPLICANT SELF-DECLARATION & SIGNATURE</div>
            <p style={{ fontSize: '11.5px', lineHeight: '1.6', color: '#334155', margin: '8px 0 14px' }}>
              I, <strong>{declaration.name || applicant.full_name || 'the Applicant'}</strong>, hereby solemnly affirm and declare that the statements made above are true and complete to the best of my personal knowledge and belief. I agree to abide by all conditions that may be imposed by the District Collector under the Maharashtra Land Revenue Code, 1966.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #94a3b8', paddingTop: '12px' }}>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <div>Place: <strong>{declaration.place || applicant.district || applicant.res_district || 'Maharashtra'}</strong></div>
                <div>Date: <strong>{declaration.date || appDate}</strong></div>
              </div>
              <div style={{ textAlign: 'center', minWidth: '200px' }}>
                <div style={{ minHeight: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {declaration.signature_data?.startsWith('data:image') ? (
                    <img src={declaration.signature_data} alt="Applicant Signature" style={{ maxHeight: '50px', maxWidth: '180px' }} />
                  ) : declaration.signature_data?.startsWith('typed:') ? (
                    <span style={{ fontFamily: "'Brush Script MT', 'Dancing Script', cursive, serif", fontSize: '24px', color: '#0f4c75' }}>
                      {declaration.signature_data.replace('typed:', '')}
                    </span>
                  ) : (
                    <span style={{ fontStyle: 'italic', fontSize: '13px', color: '#64748b' }}>
                      {declaration.applicant_name || applicant.full_name || 'Digitally Signed'}
                    </span>
                  )}
                </div>
                <div style={{ borderTop: '1px dashed #0f172a', paddingTop: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                  Signature of Applicant
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
