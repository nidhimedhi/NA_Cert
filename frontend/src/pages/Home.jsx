import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  StateEmblem,
  ShieldCheckIcon,
  BuildingIcon,
  UserIcon,
  LockIcon,
  CheckCircleIcon,
} from '../components/Icons';

export default function Home() {
  return (
    <div className="home-page-root">
      <Navbar />

      {/* Official State Gazette Notification Ticker */}
      <div className="gov-ticker-bar">
        <div className="gov-ticker-inner">
          <span className="ticker-badge">OFFICIAL GAZETTE</span>
          <p className="ticker-text">
            Maharashtra Land Revenue Code 1966 §44: Digital End-to-End Non-Agricultural (NA) Permission & Revenue Governance System operational across all 36 Districts.
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <main className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <ShieldCheckIcon size={14} /> Official Maharashtra State Revenue Gateway
          </div>
          <h1>
            Integrated Non-Agricultural Land<br />
            <span>Permission & Governance Portal</span>
          </h1>
          <p>
            Competent authority single-window system under Section 44 of the Maharashtra Land Revenue Code, 1966. 
            Submit conversion applications, upload revenue documents, coordinate field inquiries, and retrieve digitally certified NA orders.
          </p>
          <div className="hero-actions">
            <Link to="/upload" className="btn-primary">
              Initiate NA Application →
            </Link>
            <Link to="/track" className="btn-outline">
              Track Application Status
            </Link>
          </div>
        </div>

        {/* Official RTS Metrics */}
        <div className="hero-stats">
          <div className="stat-card">
            <div className="stat-num">36</div>
            <div className="stat-label">Districts Integrated</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">350+</div>
            <div className="stat-label">Taluka Tahsildar Desks</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">15-30</div>
            <div className="stat-label">Days RTS Timelines</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">100%</div>
            <div className="stat-label">Digitally Signed Certificates</div>
          </div>
        </div>
      </main>

      {/* Institutional Role Gateways Section */}
      <section className="portal-roles-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">ADMINISTRATIVE STRUCTURE</span>
            <h2 className="section-title-large">Designated Revenue Authorities</h2>
            <p className="section-sub">
              Streamlined 4-tier processing under Maharashtra Land Revenue (Conversion of Use of Land) Rules.
            </p>
          </div>

          <div className="portal-cards-grid">
            {/* Citizen Gateway */}
            <div className="portal-role-card">
              <div className="role-card-badge">Citizen Services</div>
              <div className="role-card-icon-wrap">
                <UserIcon size={26} />
              </div>
              <h3 className="role-card-title">Applicant Portal</h3>
              <p className="role-card-desc">
                File Form 44 applications, upload 7/12 records, trace village map coordinates, and download verified NA certificates.
              </p>
              <div className="role-card-footer">
                <Link to="/login" className="role-card-link">Citizen Sign In →</Link>
              </div>
            </div>

            {/* Tahsildar Desk */}
            <div className="portal-role-card">
              <div className="role-card-badge">Field Jurisdiction</div>
              <div className="role-card-icon-wrap">
                <BuildingIcon size={26} />
              </div>
              <h3 className="role-card-title">Tahsildar Desk</h3>
              <p className="role-card-desc">
                Executive Magistrate desk for ground inquiry, panchnama recording, title investigation, and routine non-granted lands.
              </p>
              <div className="role-card-footer">
                <Link to="/tahsildar/login" className="role-card-link">Officer Gateway →</Link>
              </div>
            </div>

            {/* Collectorate Apex */}
            <div className="portal-role-card">
              <div className="role-card-badge">Competent Authority</div>
              <div className="role-card-icon-wrap">
                <ShieldCheckIcon size={26} />
              </div>
              <h3 className="role-card-title">District Collectorate</h3>
              <p className="role-card-desc">
                Apex district sanctioning authority for final permission orders, conversion tax calculations, and official decree sealing.
              </p>
              <div className="role-card-footer">
                <Link to="/collector/login" className="role-card-link">Collector Sign In →</Link>
              </div>
            </div>

            {/* State Secretariat */}
            <div className="portal-role-card">
              <div className="role-card-badge">State Secretariat</div>
              <div className="role-card-icon-wrap">
                <LockIcon size={26} />
              </div>
              <h3 className="role-card-title">Mantralaya Secretariat</h3>
              <p className="role-card-desc">
                State Revenue & Forest Department apex sanctioning tier for Granted, Semi-Granted, and Special Class lands.
              </p>
              <div className="role-card-footer">
                <Link to="/state-govt/login" className="role-card-link">Secretariat Login →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statutory Land Categories */}
      <section className="land-classes-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">STATUTORY CATEGORIES</span>
            <h2 className="section-title-large">Non-Agricultural Conversion Classes</h2>
          </div>

          <div className="land-classes-grid">
            <div className="class-item">
              <div className="class-code">CLASS I</div>
              <h4>Residential NA</h4>
              <p>Housing layouts, plotted schemes, and private residential dwellings under approved development plans.</p>
            </div>

            <div className="class-item">
              <div className="class-code">CLASS II</div>
              <h4>Commercial NA</h4>
              <p>Retail complexes, corporate parks, hospitality, malls, and commercial establishments.</p>
            </div>

            <div className="class-item">
              <div className="class-code">CLASS III</div>
              <h4>Industrial NA</h4>
              <p>Manufacturing facilities, MIDC allied industrial plots, warehousing, and processing parks.</p>
            </div>

            <div className="class-item">
              <div className="class-code">CLASS IV</div>
              <h4>Institutional NA</h4>
              <p>Educational campuses, healthcare establishments, trusts, and registered public charitable utilities.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Official Government Footer */}
      <footer className="gov-footer-complete">
        <div className="gov-footer-top">
          <div className="section-container gov-footer-grid">
            <div className="footer-col-main">
              <div className="footer-emblem-row">
                <StateEmblem size={44} color="#d97706" />
                <div>
                  <h4 className="footer-state-title">GOVERNMENT OF MAHARASHTRA</h4>
                  <p className="footer-dept-name">Revenue & Forest Department • महसूल व वन विभाग</p>
                </div>
              </div>
              <p className="footer-summary">
                MahaLand is the official online portal for transparent, time-bound Non-Agricultural land conversion and revenue adjudication under MLRC 1966.
              </p>
            </div>

            <div className="footer-col-links">
              <h5>Public Services</h5>
              <ul>
                <li><Link to="/upload">Apply for NA Conversion</Link></li>
                <li><Link to="/track">Track Application Status</Link></li>
                <li><Link to="/login">Citizen Account Login</Link></li>
                <li><Link to="/register">New User Registration</Link></li>
              </ul>
            </div>

            <div className="footer-col-links">
              <h5>Department Desks</h5>
              <ul>
                <li><Link to="/tahsildar/login">Taluka Tahsildar Portal</Link></li>
                <li><Link to="/collector/login">District Collectorate Apex</Link></li>
                <li><Link to="/state-govt/login">Mantralaya Secretariat</Link></li>
                <li><Link to="/maharashtra-govt">State Sanction Desk</Link></li>
              </ul>
            </div>

            <div className="footer-col-contact">
              <h5>Helpline & Support</h5>
              <p className="footer-contact-row">
                <strong>Toll-Free Helpline:</strong> 1800-120-8040
              </p>
              <p className="footer-contact-row">
                <strong>Email:</strong> revenue-support@maharashtra.gov.in
              </p>
              <p className="footer-contact-row">
                <strong>Timings:</strong> Mon - Sat: 9:45 AM - 6:15 PM
              </p>
            </div>
          </div>
        </div>

        <div className="gov-footer-bottom">
          <div className="section-container gov-footer-bottom-inner">
            <div className="footer-nic-text">
              Designed, Developed & Maintained by <strong>National Informatics Centre (NIC)</strong> for Department of Revenue & Forest, Government of Maharashtra.
            </div>
            <div className="footer-copyright-text">
              © 2026 Government of Maharashtra. All Rights Reserved. ISO/IEC 27001 Certified Gateway.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
