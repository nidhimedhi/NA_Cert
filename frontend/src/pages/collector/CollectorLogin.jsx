import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import {
  extractBiometricVector,
  compareBiometricVectors,
  getEnrolledCollectorFace,
  saveEnrolledCollectorFace,
  clearEnrolledCollectorFace,
  MATCH_THRESHOLD,
} from '../../services/biometricEngine';
import {
  StateEmblem,
  ShieldCheckIcon,
  KeyIcon,
  CameraIcon,
  FaceScanIcon,
  LockIcon,
  UserIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  BuildingIcon,
} from '../../components/Icons';

export default function CollectorLogin() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Authentication mode: 'dual' (Face ID + Passkey) | 'password' | 'enroll'
  const [authMode, setAuthMode] = useState('dual');
  const [form, setForm] = useState({ username: 'collector', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Enrolled profile state
  const [enrolledProfile, setEnrolledProfile] = useState(null);

  // Biometric scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanState, setScanState] = useState('idle'); // 'idle' | 'scanning' | 'success' | 'failed'
  const [scanProgress, setScanProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Position your face within the optical alignment frame');
  const [capturedImage, setCapturedImage] = useState(null);
  const [matchScore, setMatchScore] = useState(null);
  const [failedReason, setFailedReason] = useState('');

  // Load enrolled face on mount
  const refreshEnrolledProfile = useCallback(() => {
    const profile = getEnrolledCollectorFace();
    setEnrolledProfile(profile);
  }, []);

  useEffect(() => {
    refreshEnrolledProfile();
  }, [refreshEnrolledProfile]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera hardware access is not supported in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setStatusMessage('Sensor online: Align face in frame and authorize access');
    } catch (err) {
      setCameraError(err.message || 'Unable to access optical sensor.');
      setCameraActive(false);
    }
  }, []);

  useEffect(() => {
    if (authMode === 'dual' || authMode === 'enroll') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [authMode, startCamera, stopCamera]);

  const handleInput = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  // ── ENROLL COLLECTOR OFFICER FACE BIOMETRIC ──
  const handleEnrollFace = () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) {
      alert('Camera is not active. Please ensure webcam access is granted.');
      return;
    }

    const extraction = extractBiometricVector(videoRef.current, canvasRef.current);
    if (!extraction.hasFace) {
      setError(extraction.error || 'Face not detected in optical frame.');
      return;
    }

    const ok = saveEnrolledCollectorFace(extraction.vector, extraction.snapshotUrl, 'District Collector');
    if (ok) {
      refreshEnrolledProfile();
      setCapturedImage(extraction.snapshotUrl);
      setAuthMode('dual');
      setScanState('idle');
      setError('');
      alert('Official District Collector Biometric Profile Enrolled Successfully!\n\nDual security is active: ONLY this face together with your official passkey will be authorized to access the Collectorate Portal.');
    } else {
      setError('Failed to record biometric profile. Please try again.');
    }
  };

  // ── RESET / RE-ENROLL ──
  const handleClearEnrollment = () => {
    if (window.confirm('Reset enrolled District Collector biometric face profile? A new face profile must be enrolled to enable Dual-Factor authentication.')) {
      clearEnrolledCollectorFace();
      refreshEnrolledProfile();
      setScanState('idle');
      setCapturedImage(null);
      setMatchScore(null);
      setError('');
    }
  };

  // ── COMPLETE UNIFIED LOGIN ──
  const performLogin = async (useBiometric = false) => {
    setBusy(true);
    setError('');
    try {
      const payload = {
        username: (form.username || '').trim(),
        password: form.password,
        biometric_verified: useBiometric,
      };

      const res = await api.post('/collector/auth/login/', payload);
      localStorage.setItem('collector_token', res.data.access);
      localStorage.setItem('collector_username', res.data.username || form.username);
      if (useBiometric) {
        localStorage.setItem('collector_biometric_auth', 'true');
      }
      navigate('/collector/dashboard');
    } catch (err) {
      setScanState('failed');
      let errMsg = err.response?.data?.error;
      if (!err.response) {
        errMsg = 'Backend server is offline or unreachable (http://127.0.0.1:8000). Please ensure "python manage.py runserver" is running in the backend directory.';
        setStatusMessage('Backend Server Offline: Port 8000 is not reachable.');
      } else {
        errMsg = errMsg || 'Authentication rejected: Invalid username or passkey.';
        setStatusMessage('Access Denied: Invalid credentials.');
      }
      setError(errMsg);
      setFailedReason(errMsg);
    } finally {
      setBusy(false);
    }
  };

  // ── EXECUTE DUAL-FACTOR AUTH (FACE ID + PASSKEY) ──
  const handleDualAuthSubmit = e => {
    e.preventDefault();
    if (scanState === 'scanning' || busy) return;

    if (!form.password.trim()) {
      setError('Please enter your official Collector Passkey / Password to proceed with Dual-Auth.');
      return;
    }

    const enrolled = getEnrolledCollectorFace();
    if (!enrolled || !enrolled.vector) {
      setError('No authorized face profile enrolled yet. Please select "Biometric Registration" tab to enroll your face first.');
      return;
    }

    setScanState('scanning');
    setScanProgress(0);
    setError('');
    setFailedReason('');

    const steps = [
      { at: 25, msg: 'Sensor active: Detecting live facial boundary…' },
      { at: 50, msg: 'Extracting normalized biometric feature vector…' },
      { at: 75, msg: 'Matching signature with enrolled Collector profile…' },
      { at: 100, msg: 'Biometric verification complete. Verifying credentials…' },
    ];

    let currentProgress = 0;
    const interval = setInterval(async () => {
      currentProgress += 25;
      setScanProgress(currentProgress);

      const step = steps.find(s => s.at === currentProgress);
      if (step) setStatusMessage(step.msg);

      if (currentProgress >= 100) {
        clearInterval(interval);

        const candidate = extractBiometricVector(videoRef.current, canvasRef.current);
        if (!candidate.hasFace) {
          setScanState('failed');
          setFailedReason(candidate.error || 'Face boundary not detected in camera frame.');
          setStatusMessage('Face not detected. Please reposition and try again.');
          return;
        }

        setCapturedImage(candidate.snapshotUrl);

        const result = compareBiometricVectors(candidate.vector, enrolled.vector);
        setMatchScore(result.similarity);

        if (result.match) {
          setScanState('success');
          setStatusMessage(`Biometric Verified (${result.similarity}% match). Authorizing Session…`);
          await performLogin(true);
        } else {
          setScanState('failed');
          setFailedReason(`Biometric Mismatch: Similarity score is ${result.similarity}% (Security threshold required: ≥ ${MATCH_THRESHOLD}%). Access denied.`);
          setStatusMessage('Access Denied: Biometric verification failed.');
        }
      }
    }, 280);
  };

  const handlePasswordOnlySubmit = e => {
    e.preventDefault();
    performLogin(false);
  };

  return (
    <div className="gov-auth-container">
      {/* Top Institutional Banner */}
      <header className="gov-auth-topbar">
        <div className="gov-auth-topbar-inner">
          <div className="gov-auth-brand-left">
            <span className="gov-dot-live">●</span>
            <span className="gov-auth-topbar-txt">
              महाराष्ट्र शासन • Government of Maharashtra | Revenue & Forest Department
            </span>
          </div>
          <div className="gov-auth-security-info">
            <span className="gov-badge-secure">
              <ShieldCheckIcon size={14} /> 256-Bit TLS Encrypted Apex Gateway
            </span>
            <Link to="/" className="gov-return-home">
              ← Public Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Authentic Terminal Layout */}
      <main className="gov-auth-main">
        <div className="gov-auth-card">
          {/* LEFT: Institutional Authority Panel */}
          <section className="gov-auth-left gov-auth-left-collector" aria-label="Official Authority Information">
            <div className="gov-auth-emblem-wrap">
              <StateEmblem size={56} color="#d97706" />
            </div>

            <div className="gov-auth-office-header">
              <span className="gov-office-subtitle">GOVERNMENT OF MAHARASHTRA</span>
              <h1 className="gov-office-title">District Collectorate</h1>
              <p className="gov-office-jurisdiction">
                Apex Competent Sanctioning Authority • MLRC 1966 §44
              </p>
            </div>

            <div className="gov-auth-rule-divider" />

            {/* Official Officer Smart Credential Box */}
            <div className="gov-officer-credential-card">
              <div className="gov-credential-header">
                <span className="gov-credential-tag">
                  <UserIcon size={13} /> Apex Officer Registry
                </span>
                {enrolledProfile ? (
                  <span className="gov-badge-status-active">
                    <span className="status-dot-pulse">●</span> Enrolled & Active
                  </span>
                ) : (
                  <span className="gov-badge-status-pending">○ Not Enrolled</span>
                )}
              </div>

              {enrolledProfile ? (
                <div className="gov-officer-profile-row">
                  {enrolledProfile.photo ? (
                    <div className="gov-officer-avatar-wrap">
                      <img
                        src={enrolledProfile.photo}
                        alt="Enrolled Collector"
                        className="gov-officer-avatar"
                      />
                      <span className="gov-avatar-check">✓</span>
                    </div>
                  ) : (
                    <div className="gov-officer-avatar-placeholder">
                      <UserIcon size={24} />
                    </div>
                  )}

                  <div className="gov-officer-meta">
                    <div className="gov-officer-name">
                      {enrolledProfile.meta?.officerName || 'District Collector'}
                    </div>
                    <div className="gov-officer-submeta">
                      District Revenue Jurisdiction
                    </div>
                    <div className="gov-officer-enrolled-date">
                      Enrolled: {new Date(enrolledProfile.meta?.enrolledAt || Date.now()).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="gov-credential-empty">
                  <p>No reference facial profile enrolled for this workstation.</p>
                  <span className="gov-credential-hint">
                    Use the Registration tab to record the Collector reference biometric.
                  </span>
                </div>
              )}

              <div className="gov-credential-actions">
                <button
                  type="button"
                  className="gov-btn-credential-secondary"
                  onClick={() => {
                    setAuthMode('enroll');
                    setScanState('idle');
                    setError('');
                  }}
                >
                  <CameraIcon size={14} /> {enrolledProfile ? 'Re-enroll Biometric' : 'Enroll Reference Face'}
                </button>
                {enrolledProfile && (
                  <button
                    type="button"
                    className="gov-btn-credential-reset"
                    onClick={handleClearEnrollment}
                    title="Reset enrolled biometric signature"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Official Security Standards Notice */}
            <div className="gov-compliance-panel">
              <div className="gov-compliance-item">
                <ShieldCheckIcon size={15} className="gov-compliance-icon" />
                <span>Multi-Factor Biometric Matching (Cosine 224-D)</span>
              </div>
              <div className="gov-compliance-item">
                <LockIcon size={15} className="gov-compliance-icon" />
                <span>District Magistrate Sanction Key Lock</span>
              </div>
              <div className="gov-compliance-item">
                <BuildingIcon size={15} className="gov-compliance-icon" />
                <span>Audit Logged under IT Act 2000 & MLRC 1966</span>
              </div>
            </div>
          </section>

          {/* RIGHT: Gateway Authentication Terminal */}
          <section className="gov-auth-right" aria-label="Sign In Terminal">
            <div className="gov-auth-terminal-header">
              <div className="gov-terminal-badge">
                <ShieldCheckIcon size={13} /> Official Apex Sanctioning Gateway
              </div>
              <h2 className="gov-terminal-title">Collectorate Sign In</h2>
              <p className="gov-terminal-subtitle">
                {authMode === 'enroll'
                  ? 'Capture official officer reference facial biometric for dual-factor verification.'
                  : 'Authorized clearance for final sanction orders, conversion fees, and NA certificate issuance.'}
              </p>
            </div>

            {/* Clean Segmented Mode Selector */}
            <div className="gov-segmented-tabs" role="tablist">
              <button
                type="button"
                className={`gov-tab-btn ${authMode === 'dual' ? 'active' : ''}`}
                onClick={() => { setAuthMode('dual'); setScanState('idle'); setError(''); }}
              >
                <FaceScanIcon size={16} /> Dual-Factor (Face + Passkey)
              </button>
              <button
                type="button"
                className={`gov-tab-btn ${authMode === 'password' ? 'active' : ''}`}
                onClick={() => { setAuthMode('password'); setError(''); }}
              >
                <KeyIcon size={16} /> Passkey Only
              </button>
              <button
                type="button"
                className={`gov-tab-btn ${authMode === 'enroll' ? 'active' : ''}`}
                onClick={() => { setAuthMode('enroll'); setScanState('idle'); setError(''); }}
              >
                <CameraIcon size={16} /> {enrolledProfile ? 'Re-enroll' : 'Enroll Face'}
              </button>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="gov-alert-error" role="alert">
                <AlertCircleIcon size={18} />
                <div>
                  <strong>Authentication Notice:</strong> {error}
                </div>
              </div>
            )}

            {/* ── MODE 1: DUAL-FACTOR AUTH (FACE + PASSKEY) ── */}
            {authMode === 'dual' && (
              <form onSubmit={handleDualAuthSubmit} className="gov-terminal-form">
                <div className="gov-form-grid-2">
                  <div className="gov-input-group">
                    <label className="gov-label" htmlFor="col-user">Collector Username</label>
                    <div className="gov-input-wrap">
                      <span className="gov-input-icon"><UserIcon size={16} /></span>
                      <input
                        id="col-user"
                        className="gov-input"
                        name="username"
                        placeholder="Official departmental username"
                        value={form.username}
                        onChange={handleInput}
                        required
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="gov-input-group">
                    <label className="gov-label" htmlFor="col-pass">Official Secure Passkey</label>
                    <div className="gov-input-wrap">
                      <span className="gov-input-icon"><LockIcon size={16} /></span>
                      <input
                        id="col-pass"
                        className="gov-input"
                        type="password"
                        name="password"
                        placeholder="Enter official passkey"
                        value={form.password}
                        onChange={handleInput}
                        required
                        autoComplete="current-password"
                      />
                    </div>
                  </div>
                </div>

                {/* Biometric Camera Viewport */}
                <div className="gov-sensor-box">
                  <div className="gov-sensor-viewport">
                    <video
                      ref={videoRef}
                      className={`gov-sensor-video ${cameraActive ? 'active' : 'hidden'}`}
                      autoPlay
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {!cameraActive && (
                      <div className="gov-sensor-placeholder">
                        <CameraIcon size={36} className="gov-sensor-off-icon" />
                        <div className="gov-sensor-off-title">Optical Sensor Standby</div>
                        <p className="gov-sensor-off-desc">
                          {cameraError || 'Webcam access is required for real-time facial verification.'}
                        </p>
                        <button type="button" className="gov-btn-activate-cam" onClick={startCamera}>
                          <RefreshCwIcon size={14} /> Initialize Webcam
                        </button>
                      </div>
                    )}

                    {/* Clean HUD Viewfinder Reticle */}
                    <div className={`gov-sensor-hud ${scanState === 'scanning' ? 'scanning' : ''} ${scanState === 'success' ? 'verified' : ''} ${scanState === 'failed' ? 'mismatch' : ''}`}>
                      <div className="hud-corner-tl" />
                      <div className="hud-corner-tr" />
                      <div className="hud-corner-bl" />
                      <div className="hud-corner-br" />

                      <div className="hud-oval-guide">
                        {scanState === 'scanning' && <div className="hud-scan-beam" />}
                      </div>

                      <div className="hud-telemetry-strip">
                        <span className="hud-tag-live">● SENSOR ACTIVE</span>
                        <span className="hud-tag">THRESHOLD: ≥ {MATCH_THRESHOLD}%</span>
                      </div>

                      <div className="hud-status-strip">
                        {scanState === 'scanning' && (
                          <div className="hud-progress-meter">
                            <div className="hud-progress-fill" style={{ width: `${scanProgress}%` }} />
                          </div>
                        )}
                        <span className="hud-status-msg">{statusMessage}</span>
                      </div>
                    </div>
                  </div>

                  {/* Verification Results Feedback */}
                  {scanState === 'success' && (
                    <div className="gov-verification-success">
                      <CheckCircleIcon size={20} className="gov-success-icon" />
                      <div className="gov-success-body">
                        <strong>Biometric Identity Confirmed</strong>
                        <div className="gov-success-score">
                          Match Score: <strong>{matchScore}%</strong> (Threshold: ≥ {MATCH_THRESHOLD}%)
                        </div>
                      </div>
                      {capturedImage && (
                        <img src={capturedImage} alt="Verified Candidate" className="gov-success-thumb" />
                      )}
                    </div>
                  )}

                  {scanState === 'failed' && (
                    <div className="gov-verification-failure">
                      <AlertCircleIcon size={20} className="gov-failure-icon" />
                      <div className="gov-failure-body">
                        <strong>Biometric Verification Failed</strong>
                        <div className="gov-failure-reason">{failedReason}</div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="gov-btn-primary-action"
                    disabled={scanState === 'scanning' || busy}
                  >
                    {scanState === 'scanning' ? (
                      <span className="gov-loading-row">
                        <RefreshCwIcon size={16} className="spin-icon" />
                        Verifying Facial Biometric & Passkey ({scanProgress}%)…
                      </span>
                    ) : busy ? (
                      'Authenticating Collector Session…'
                    ) : (
                      <span className="gov-btn-row">
                        <ShieldCheckIcon size={18} /> Verify Biometric & Sign In
                      </span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ── MODE 2: PASSKEY ONLY (FALLBACK) ── */}
            {authMode === 'password' && (
              <form onSubmit={handlePasswordOnlySubmit} className="gov-terminal-form">
                <div className="gov-input-group">
                  <label className="gov-label" htmlFor="col-user-pwd">Collector Username</label>
                  <div className="gov-input-wrap">
                    <span className="gov-input-icon"><UserIcon size={16} /></span>
                    <input
                      id="col-user-pwd"
                      className="gov-input"
                      name="username"
                      placeholder="Official departmental username"
                      value={form.username}
                      onChange={handleInput}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="gov-input-group">
                  <label className="gov-label" htmlFor="col-pass-pwd">Official Secure Passkey</label>
                  <div className="gov-input-wrap">
                    <span className="gov-input-icon"><LockIcon size={16} /></span>
                    <input
                      id="col-pass-pwd"
                      className="gov-input"
                      type="password"
                      name="password"
                      placeholder="Enter official passkey"
                      value={form.password}
                      onChange={handleInput}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <div className="gov-security-note">
                  <LockIcon size={14} />
                  <span>Passkey-only session will be logged for administrative compliance audit.</span>
                </div>

                <button type="submit" className="gov-btn-primary-action" disabled={busy}>
                  {busy ? 'Verifying Credentials…' : 'Sign In with Passkey'}
                </button>
              </form>
            )}

            {/* ── MODE 3: ENROLL FACE BIOMETRIC ── */}
            {authMode === 'enroll' && (
              <div className="gov-terminal-form">
                <div className="gov-sensor-box">
                  <div className="gov-sensor-viewport">
                    <video
                      ref={videoRef}
                      className={`gov-sensor-video ${cameraActive ? 'active' : 'hidden'}`}
                      autoPlay
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {!cameraActive && (
                      <div className="gov-sensor-placeholder">
                        <CameraIcon size={36} className="gov-sensor-off-icon" />
                        <div className="gov-sensor-off-title">Camera Sensor Standby</div>
                        <p className="gov-sensor-off-desc">Activate webcam to capture reference facial biometric.</p>
                        <button type="button" className="gov-btn-activate-cam" onClick={startCamera}>
                          <RefreshCwIcon size={14} /> Initialize Webcam
                        </button>
                      </div>
                    )}

                    <div className="gov-sensor-hud">
                      <div className="hud-corner-tl" />
                      <div className="hud-corner-tr" />
                      <div className="hud-corner-bl" />
                      <div className="hud-corner-br" />
                      <div className="hud-oval-guide" />
                      <div className="hud-telemetry-strip">
                        <span className="hud-tag-live">● ENROLLMENT APERTURE</span>
                      </div>
                      <div className="hud-status-strip">
                        <span className="hud-status-msg">Align face inside the oval guide and click Capture</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="gov-btn-enroll-action"
                    disabled={!cameraActive}
                    onClick={handleEnrollFace}
                  >
                    <CameraIcon size={16} /> Capture & Record Collector Face Profile
                  </button>
                  <p className="gov-enroll-helper">
                    Ensure face is clearly visible in proper lighting without glare or accessories.
                  </p>
                </div>
              </div>
            )}

            {/* Departmental Portal Switcher */}
            <div className="gov-portal-switcher">
              <span className="gov-switcher-label">Switch Administrative Portal:</span>
              <div className="gov-switcher-links">
                <Link to="/tahsildar/login" className="gov-chip-link">Tahsildar Desk</Link>
                <span className="gov-chip-active">District Collectorate</span>
                <Link to="/state-govt/login" className="gov-chip-link">State Secretariat</Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Official Government Footer */}
      <footer className="gov-auth-footer">
        <div className="gov-auth-footer-inner">
          <div className="gov-footer-compliance">
            National Informatics Centre (NIC) Security Framework • Certified ISO/IEC 27001 Gateway • End-to-End Encrypted (TLS 1.3)
          </div>
          <div className="gov-footer-copy">
            © 2026 Government of Maharashtra. All Rights Reserved. Revenue & Forest Department.
          </div>
        </div>
      </footer>
    </div>
  );
}
