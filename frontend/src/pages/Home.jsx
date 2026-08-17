import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="hero">
        <div className="hero-content">
          <span className="hero-badge">Maharashtra Government Portal</span>
          <h1>Non-Agricultural Land<br /><span>Certificate Application</span></h1>
          <p>Submit your NA certificate application online. Review required documents, upload files, and track your application status — all in one place.</p>
          <div className="hero-actions">
            <Link to="/upload" className="btn-primary">Apply Now →</Link>
            <Link to="/about" className="btn-outline">Learn More</Link>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-card"><div className="stat-num">12K+</div><div className="stat-label">Applications Processed</div></div>
          <div className="stat-card"><div className="stat-num">4</div><div className="stat-label">Land Categories</div></div>
          <div className="stat-card"><div className="stat-num">15-30</div><div className="stat-label">Days Processing Time</div></div>
        </div>
      </main>
    </>
  );
}
