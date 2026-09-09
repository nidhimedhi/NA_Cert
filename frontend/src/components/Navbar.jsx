import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

const translations = {
  English: {
    gov: "Government of Maharashtra",
    skip: "Skip to Content",
    access: "Accessibility",
    helpline: "Helpline: 1800-123-4567",
    title: "NA Land Governance & Authorization",
    subtitle: "Intelligent AI Platform for Non-Agricultural Land Governance",
    home: "Home",
    apply: "Apply for NA",
    track: "Track Application",
    about: "About",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
    welcome: "Welcome"
  },
  'मराठी': {
    gov: "महाराष्ट्र शासन",
    skip: "मुख्य आशयावर जा",
    access: "प्रवेशयोग्यता",
    helpline: "हेल्पलाइन: १८००-१२३-४५६७",
    title: "अकृषिक (NA) जमीन प्रशासन आणि अधिकृतता",
    subtitle: "अकृषिक जमीन प्रशासनासाठी बुद्धिमान एआय प्लॅटफॉर्म",
    home: "मुख्य पृष्ठ",
    apply: "NA साठी अर्ज करा",
    track: "अर्जाचा मागोवा घ्या",
    about: "आमच्याबद्दल",
    login: "लॉगिन",
    signup: "नोंदणी करा",
    logout: "बाहेर पडा",
    welcome: "स्वागत आहे"
  },
  'हिन्दी': {
    gov: "महाराष्ट्र सरकार",
    skip: "मुख्य सामग्री पर जाएं",
    access: "अभिगम्यता",
    helpline: "हेल्पलाइन: १८००-१२३-४५६७",
    title: "गैर-कृषि (NA) भूमि प्रशासन और प्राधिकरण",
    subtitle: "गैर-कृषि भूमि प्रशासन के लिए बुद्धिमान एआई प्लेटफॉर्म",
    home: "होम",
    apply: "NA के लिए आवेदन करें",
    track: "आवेदन ट्रैक करें",
    about: "हमारे बारे में",
    login: "लॉगिन",
    signup: "साइन अप करें",
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

  // Close dropdown when clicking outside
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
          <span>{t.gov}</span>
        </div>
        <div className="strip-right">
          <a href="#main-content">{t.skip}</a>
          <a href="#accessibility">{t.access}</a>
          <span className="helpline">{t.helpline}</span>
        </div>
      </div>

      {/* Main Logo Section */}
      <div className="gov-logo-section">
        <div className="logo-content">
          <div className="emblem-placeholder">
            <span className="emblem-icon">🦁</span>
          </div>
          <div className="site-titles">
            <h1 className="site-name">{t.title}</h1>
            <p className="site-subtitle">{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="gov-navbar">
        <div className="nav-container">
          <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
            ☰
          </button>

          <div className={`nav-links ${mobileOpen ? 'open' : ''}`}>
            <Link to="/" onClick={() => setMobileOpen(false)}>{t.home}</Link>
            
            {user && (
              <Link to="/upload" onClick={() => setMobileOpen(false)}>{t.apply}</Link>
            )}
            
            <Link to="/track" onClick={() => setMobileOpen(false)}>{t.track}</Link>
            
            <Link to="/about" onClick={() => setMobileOpen(false)}>{t.about}</Link>
            
            <div className="nav-spacer"></div>

            {/* Custom Language Dropdown */}
            <div className="lang-dropdown-wrapper" ref={langRef}>
              <button 
                className="lang-dropdown-btn" 
                onClick={() => setLangOpen(!langOpen)}
              >
                {lang} ▾
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
              <>
                <span className="nav-user">👤 {t.welcome}, {user.user_name}</span>
                <button onClick={handleLogout} className="nav-logout">{t.logout}</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}>{t.login}</Link>
                <Link to="/register" className="nav-btn-highlight" onClick={() => setMobileOpen(false)}>{t.signup}</Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
