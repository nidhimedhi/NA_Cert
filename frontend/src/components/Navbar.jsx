import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { StateEmblem } from './Icons';

const translations = {
  English: {
    gov: "Government of Maharashtra • महाराष्ट्र शासन",
    dept: "Revenue & Forest Department",
    skip: "Skip to Main Content",
    access: "Accessibility",
    helpline: "Toll-Free Helpline: 1800-120-8040",
    title: "MahaLand NA Portal",
    subtitle: "Non-Agricultural Land Conversion & Revenue Governance System (MLRC 1966 §44)",
    home: "Home",
    apply: "Apply for NA",
    track: "Track Application",
    statePortal: "State Secretariat",
    officerDesk: "Officer Access",
    about: "Guidelines & Rules",
    login: "Citizen Sign In",
    signup: "Register",
    logout: "Sign Out",
    welcome: "Welcome"
  },
  'मराठी': {
    gov: "महाराष्ट्र शासन • Government of Maharashtra",
    dept: "महसूल व वन विभाग",
    skip: "मुख्य मजकुरावर जा",
    access: "प्रवेशयोग्यता",
    helpline: "टोल-फ्री हेल्पलाईन: १८००-१२०-८०४०",
    title: "महा-जमीन (MahaLand)",
    subtitle: "अकृषिक (NA) जमीन रूपांतरण व महसूल परवाना प्रणाली (MLRC १९६६)",
    home: "मुख्य पृष्ठ",
    apply: "NA साठी अर्ज करा",
    track: "अर्जाचा मागोवा घ्या",
    statePortal: "मंत्रालय कक्ष",
    officerDesk: "अधिकारी पोर्टल",
    about: "मार्गदर्शक तत्त्वे",
    login: "नागरिक लॉगिन",
    signup: "नोंदणी",
    logout: "लॉग आउट",
    welcome: "स्वागत आहे"
  },
  'हिन्दी': {
    gov: "महाराष्ट्र सरकार • Government of Maharashtra",
    dept: "राजस्व एवं वन विभाग",
    skip: "मुख्य सामग्री पर जाएं",
    access: "अभिगम्यता",
    helpline: "टोल-फ्री हेल्पलाइन: १८००-१२०-८०४०",
    title: "महा-भूमि (MahaLand)",
    subtitle: "गैर-कृषि (NA) भूमि रूपांतरण एवं राजस्व अनुमति प्रणाली (MLRC 1966)",
    home: "होम",
    apply: "NA हेतु आवेदन",
    track: "आवेदन स्थिति",
    statePortal: "सचिवालय पोर्टल",
    officerDesk: "अधिकारी लॉगिन",
    about: "दिशानिर्देश",
    login: "नागरिक लॉगिन",
    signup: "पंजीकरण",
    logout: "लॉग आउट",
    welcome: "स्वागत है"
  }
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Language State
  const [lang, setLang] = useState('English');
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);
  
  const t = translations[lang];

  const handleLogout = () => { logout(); navigate('/'); };

  useEffect(() => {
    function handleClickOutside(event) {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [langRef]);

  return (
    <header className="gov-header">
      {/* Top Government Strip */}
      <div className="gov-top-strip">
        <div className="strip-left">
          <span className="gov-seal-indicator">●</span>
          <span>{t.gov} | {t.dept}</span>
        </div>
        <div className="strip-right">
          <a href="#main-content" className="strip-link">{t.skip}</a>
          <span className="strip-divider">|</span>
          <a href="#accessibility" className="strip-link">{t.access}</a>
          <span className="strip-divider">|</span>
          <span className="helpline">{t.helpline}</span>
        </div>
      </div>

      {/* Main Logo & Identity Section */}
      <div className="gov-logo-section">
        <div className="logo-content">
          <Link to="/" className="emblem-link" title="Government of Maharashtra">
            <div className="emblem-container">
              <StateEmblem size={52} color="#b45309" />
            </div>
          </Link>
          <div className="site-titles">
            <div className="site-supertitle">GOVERNMENT OF MAHARASHTRA • महसूल व वन विभाग</div>
            <h1 className="site-name">{t.title}</h1>
            <p className="site-subtitle">{t.subtitle}</p>
          </div>
          
          <div className="gov-trust-badge">
            <div className="trust-cert">
              <span className="cert-code">MLRC 1966 §44</span>
              <span className="cert-desc">Competent Revenue Authority</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="gov-navbar">
        <div className="nav-container">
          <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className={`nav-links ${mobileOpen ? 'open' : ''}`}>
            <Link to="/" onClick={() => setMobileOpen(false)}>{t.home}</Link>
            
            {user && (
              <Link to="/upload" onClick={() => setMobileOpen(false)}>{t.apply}</Link>
            )}
            
            <Link to="/track" onClick={() => setMobileOpen(false)}>{t.track}</Link>
            
            <Link to="/maharashtra-govt" onClick={() => setMobileOpen(false)} className="nav-link-highlight">
              {t.statePortal}
            </Link>

            {/* Department Officer Portals */}
            <div className="nav-officer-dropdown">
              <Link to="/tahsildar/login" onClick={() => setMobileOpen(false)}>Tahsildar Desk</Link>
              <Link to="/collector/login" onClick={() => setMobileOpen(false)}>Collectorate</Link>
            </div>
            
            <div className="nav-spacer"></div>

            {/* Language Selector */}
            <div className="lang-dropdown-wrapper" ref={langRef}>
              <button 
                className="lang-dropdown-btn" 
                onClick={() => setLangOpen(!langOpen)}
                aria-expanded={langOpen}
              >
                🌐 {lang} ▾
              </button>
              {langOpen && (
                <div className="lang-dropdown-menu">
                  {Object.keys(translations).map(l => (
                    <button 
                      key={l}
                      className={`lang-option ${lang === l ? 'active' : ''}`}
                      onClick={() => { setLang(l); setLangOpen(false); }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user ? (
              <div className="nav-user-area">
                <span className="nav-user">{t.welcome}, <strong>{user.user_name}</strong></span>
                <button onClick={handleLogout} className="nav-logout">{t.logout}</button>
              </div>
            ) : (
              <div className="nav-auth-actions">
                <Link to="/login" className="nav-link-login" onClick={() => setMobileOpen(false)}>{t.login}</Link>
                <Link to="/register" className="nav-btn-highlight" onClick={() => setMobileOpen(false)}>{t.signup}</Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

