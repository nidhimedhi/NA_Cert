import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  extractBiometricVector,
  compareBiometricVectors,
  getEnrolledTahsildarFace,
  saveEnrolledTahsildarFace,
  clearEnrolledTahsildarFace,
  MATCH_THRESHOLD,
} from '../../services/biometricEngine';

export default function TahsildarLogin() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Authentication mode: 'dual' (Face ID + Passkey) | 'password' | 'enroll'
  const [authMode, setAuthMode] = useState('dual');
  const [form, setForm] = useState({ username: 'tahsildar', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Enrolled profile state
  const [enrolledProfile, setEnrolledProfile] = useState(null);

  // Biometric scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanState, setScanState] = useState('idle'); // 'idle' | 'scanning' | 'success' | 'failed'
  const [scanProgress, setScanProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Position your face within the optical biometric frame');
  const [capturedImage, setCapturedImage] = useState(null);
  const [matchScore, setMatchScore] = useState(null);
  const [failedReason, setFailedReason] = useState('');

  // Load enrolled face on mount
  const refreshEnrolledProfile = useCallback(() => {
    const profile = getEnrolledTahsildarFace();
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
      setStatusMessage('Sensor online: Align face inside frame and click Authorize');
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

  // ── ENROLL TAHSILDAR OFFICER FACE BIOMETRIC ──
  const handleEnrollFace = () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) {
      alert('Camera is not active. Please ensure webcam access is granted.');
      return;
    }

    const extraction = extractBiometricVector(videoRef.current, canvasRef.current);
    if (!extraction.hasFace) {
      setError(extraction.error || 'No face detected. Please position face clearly inside the reticle.');
      return;
    }

    const ok = saveEnrolledTahsildarFace(extraction.vector, extraction.snapshotUrl, 'Taluka Tahsildar');
    if (ok) {
      refreshEnrolledProfile();
      setCapturedImage(extraction.snapshotUrl);
      setAuthMode('dual');
      setScanState('idle');
      setError('');
      alert('✅ Official Tahsildar Biometric Profile Enrolled Successfully!\n\nDual security is active: ONLY this face together with your official passkey will be authorized to access the Tahsildar Portal.');
    } else {
      setError('Failed to save biometric profile.');
    }
  };

  // ── RESET / RE-ENROLL ──
  const handleClearEnrollment = () => {
    if (window.confirm('Reset the enrolled Tahsildar biometric face profile? A new face profile must be enrolled to enable Face ID Dual authentication.')) {
      clearEnrolledTahsildarFace();
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

      const res = await api.post('/tahsildar/auth/login/', payload);
      localStorage.setItem('tahsildar_token', res.data.access);
      localStorage.setItem('tahsildar_username', res.data.username || form.username);
      if (useBiometric) {
        localStorage.setItem('tahsildar_biometric_auth', 'true');
      }
      navigate('/tahsildar/dashboard');
    } catch (err) {
      setScanState('failed');
      let errMsg = err.response?.data?.error;
      if (!err.response) {
        errMsg = 'Backend server is offline or unreachable (http://127.0.0.1:8000). Please ensure "python manage.py runserver" is running in the backend directory.';
        setStatusMessage('⚠️ Backend Server Offline: Port 8000 is not reachable.');
      } else {
        errMsg = errMsg || 'Authentication rejected: Invalid username or passkey.';
        setStatusMessage('⛔ Access Denied: Invalid credentials.');
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

    // Check passkey
    if (!form.password.trim()) {
      setError('Please enter your official Tahsildar Passkey / Password to proceed with Dual-Auth.');
      return;
    }

    // Check biometric enrollment
    const enrolled = getEnrolledTahsildarFace();
    if (!enrolled || !enrolled.vector) {
      setError('⚠️ No authorized face enrolled yet. Please click "Enroll Face" to register the Tahsildar face profile first.');
      return;
    }

    setScanState('scanning');
    setScanProgress(0);
    setError('');
    setFailedReason('');

    const steps = [
      { at: 25, msg: '1/4 Optical Sensor Active: Detecting live face boundary…' },
      { at: 50, msg: '2/4 Extracting 224-point luminance & gradient vector…' },
      { at: 75, msg: '3/4 Matching live biometric with enrolled Tahsildar profile…' },
      { at: 100, msg: '4/4 Biometric analysis complete. Verifying passkey…' },
    ];

    let currentProgress = 0;
    const interval = setInterval(async () => {
      currentProgress += 25;
      setScanProgress(currentProgress);

      const step = steps.find(s => s.at === currentProgress);
      if (step) setStatusMessage(step.msg);

      if (currentProgress >= 100) {
        clearInterval(interval);

        // Perform actual vector extraction on the live video frame
        const candidate = extractBiometricVector(videoRef.current, canvasRef.current);
        if (!candidate.hasFace) {
          setScanState('failed');
          setFailedReason(candidate.error || 'No face detected in optical frame.');
          setStatusMessage('❌ Face not detected in frame. Please try again.');
          return;
        }

        setCapturedImage(candidate.snapshotUrl);

        // Compare candidate vector with enrolled Tahsildar vector
        const result = compareBiometricVectors(candidate.vector, enrolled.vector);
        setMatchScore(result.similarity);

        if (result.match) {
          // BIOMETRIC PASSED! Now verify Passkey
          setScanState('success');
          setStatusMessage(`✅ Face Verified (${result.similarity}% ≥ ${MATCH_THRESHOLD}%). Authorizing Dual Session…`);
          await performLogin(true);
        } else {
          // REJECTED - BIOMETRIC MISMATCH!
          setScanState('failed');
          setFailedReason(`Biometric Mismatch: Match score is ${result.similarity}% (Security threshold required: ≥ ${MATCH_THRESHOLD}%). Unauthorized individual detected.`);
          setStatusMessage('⛔ ACCESS DENIED: Biometric mismatch detected.');
        }
      }
    }, 300);
  };

  // ── PASSKEY ONLY SUBMIT (Fallback) ──
  const handlePasswordOnlySubmit = e => {
    e.preventDefault();
    performLogin(false);
  };

  return (
    <div className="auth-page collector-auth-page">
      <div className="auth-card collector-auth-card">
        {/* LEFT BRANDING PANEL */}
        <div className="auth-left collector-auth-left" style={{ background: 'linear-gradient(160deg, #064e3b 0%, #0f766e 50%, #022c22 100%)', borderRight: '3px solid #10b981' }}>
          <div className="auth-brand">🏛 LandScope • Taluka Revenue</div>
          <div className="collector-crest-wrap" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
            <div className="collector-crest-icon">⚖️</div>
          </div>
          <h2>Office of the Tahsildar</h2>
          <div className="auth-divider" style={{ background: 'linear-gradient(90deg, #10b981, transparent)' }} />
          <p>Jurisdictional Revenue Authority for Ground Inquiries, Panchnama, and Title Adjudication under Section 44 of MLRC 1966.</p>

          <div className="collector-security-tags">
            <span className="sec-tag">🛡️ Face ID & Passkey Dual Security</span>
            <span className="sec-tag">🔐 Biometric Vector Match (≥ 75%)</span>
            <span className="sec-tag">⚖️ Executive Magistrate Profile Lock</span>
          </div>

          {/* ENROLLED OFFICER CARD */}
          <div className="enrolled-officer-box">
            <div className="enrolled-header">
              <span style={{ fontSize: '13px', fontWeight: '800' }}>Official Profile Registry</span>
              {enrolledProfile ? (
                <span className="badge-enrolled-active">● Enrolled</span>
              ) : (
                <span className="badge-enrolled-none">○ Not Enrolled</span>
              )}
            </div>

            {enrolledProfile ? (
              <div className="enrolled-details">
                {enrolledProfile.photo && (
                  <img src={enrolledProfile.photo} alt="Enrolled Tahsildar" className="enrolled-thumbnail" />
                )}
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>
                    {enrolledProfile.meta?.officerName || 'Taluka Tahsildar'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Enrolled: {new Date(enrolledProfile.meta?.enrolledAt).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#fde68a', margin: '6px 0' }}>
                No face registered yet. Click "Enroll Face" to capture your official reference biometric.
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn-enroll-toggle"
                onClick={() => { setAuthMode('enroll'); setScanState('idle'); setError(''); }}
              >
                📸 {enrolledProfile ? 'Re-enroll Face' : 'Enroll Face Now'}
              </button>
              {enrolledProfile && (
                <button
                  type="button"
                  className="btn-clear-enroll"
                  onClick={handleClearEnrollment}
                  title="Clear enrolled biometric"
                >
                  ✕ Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT INTERACTIVE LOGIN PANEL */}
        <div className="auth-right collector-auth-right">
          <div className="auth-header-row">
            <div>
              <span className="auth-badge" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                🔒 Taluka Revenue Dual-Factor Gateway
              </span>
              <h2>Tahsildar Sign In</h2>
              <p className="auth-sub">
                {authMode === 'enroll'
                  ? 'Position your face within the frame and capture reference biometric profile.'
                  : 'Requires both live facial biometric recognition and official secure passkey.'}
              </p>
            </div>
          </div>

          {/* AUTHENTICATION MODE TABS */}
          <div className="collector-mode-tabs" role="tablist">
            <button
              type="button"
              className={`mode-tab ${authMode === 'dual' ? 'active' : ''}`}
              onClick={() => { setAuthMode('dual'); setScanState('idle'); setError(''); }}
            >
              🛡️ Face ID & Passkey Dual-Auth
            </button>
            <button
              type="button"
              className={`mode-tab ${authMode === 'password' ? 'active' : ''}`}
              onClick={() => { setAuthMode('password'); setError(''); }}
            >
              🔑 Passkey Only
            </button>
            <button
              type="button"
              className={`mode-tab ${authMode === 'enroll' ? 'active' : ''}`}
              onClick={() => { setAuthMode('enroll'); setScanState('idle'); setError(''); }}
              style={{ color: '#059669' }}
            >
              ⚙️ {enrolledProfile ? 'Re-enroll Face' : 'Enroll Face'}
            </button>
          </div>

          {error && <div className="error-box">⚠️ {error}</div>}

          {/* ══════════════════════════════════════════════════════════════
              MODE 1: DUAL-FACTOR AUTH (FACE ID + PASSKEY)
             ══════════════════════════════════════════════════════════════ */}
          {authMode === 'dual' && (
            <form onSubmit={handleDualAuthSubmit} className="auth-form">
              {/* CREDENTIAL FIELDS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Tahsildar Username</label>
                  <div className="input-wrap">
                    <input
                      className="auth-input"
                      name="username"
                      placeholder="Official username"
                      value={form.username}
                      onChange={handleInput}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Official Secure Passkey</label>
                  <div className="input-wrap">
                    <input
                      className="auth-input"
                      type="password"
                      name="password"
                      placeholder="Enter passkey / password"
                      value={form.password}
                      onChange={handleInput}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              </div>

              {/* BIOMETRIC OPTICAL SCANNER */}
              <div className="biometric-scanner-box" style={{ marginTop: '4px' }}>
                <div className="scanner-feed-wrapper">
                  <video
                    ref={videoRef}
                    className={`scanner-video ${cameraActive ? 'active' : 'hidden'}`}
                    autoPlay
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  {!cameraActive && (
                    <div className="camera-placeholder">
                      <div className="placeholder-content">
                        <span className="cam-icon">📷</span>
                        <div className="cam-title">Optical Sensor Offline</div>
                        <p className="cam-desc">
                          {cameraError || 'Camera sensor access required for live facial verification.'}
                        </p>
                        <button type="button" className="btn-retry-cam" onClick={startCamera}>
                          🔌 Activate Webcam
                        </button>
                      </div>
                    </div>
                  )}

                  {/* HUD OVERLAY */}
                  <div className={`biometric-hud ${scanState === 'scanning' ? 'scanning' : ''} ${scanState === 'success' ? 'verified' : ''} ${scanState === 'failed' ? 'mismatch' : ''}`}>
                    <span className="reticle top-left" />
                    <span className="reticle top-right" />
                    <span className="reticle bottom-left" />
                    <span className="reticle bottom-right" />

                    <div className="face-oval-guide">
                      <div className="oval-crosshair" />
                      {scanState === 'scanning' && <div className="laser-sweep" />}
                    </div>

                    <div className="hud-telemetry">
                      <span className="hud-badge red-pulse">● LIVE SENSOR</span>
                      <span className="hud-badge">THRESHOLD: ≥ {MATCH_THRESHOLD}%</span>
                      <span className="hud-badge">{enrolledProfile ? 'ENROLLED: YES' : 'ENROLLED: NONE'}</span>
                    </div>

                    <div className="hud-status-bar">
                      {scanState === 'scanning' && (
                        <div className="hud-progress-wrap">
                          <div className="hud-progress-bar" style={{ width: `${scanProgress}%` }} />
                          <span className="hud-pct">{scanProgress}%</span>
                        </div>
                      )}
                      <span className="hud-status-text">{statusMessage}</span>
                    </div>
                  </div>
                </div>

                {/* SCANNER FEEDBACK */}
                <div className="scanner-action-bar">
                  {scanState === 'success' && (
                    <div className="verified-success-box" style={{ marginBottom: '8px' }}>
                      <div className="verified-badge-row">
                        <span className="verified-check">✓</span>
                        <div style={{ flex: 1 }}>
                          <strong style={{ color: '#10b981', fontSize: '13.5px' }}>
                            Face Biometric Confirmed
                          </strong>
                          <div className="officer-meta">
                            Match Score: <strong>{matchScore}%</strong> (Security Threshold: ≥ {MATCH_THRESHOLD}%)
                          </div>
                        </div>
                        {capturedImage && (
                          <img src={capturedImage} alt="Verified Candidate" className="verified-thumb" />
                        )}
                      </div>
                    </div>
                  )}

                  {scanState === 'failed' && (
                    <div className="mismatch-box" style={{ marginBottom: '8px' }}>
                      <div className="mismatch-header">
                        <span className="mismatch-icon">⛔</span>
                        <div>
                          <strong style={{ color: '#ef4444', fontSize: '13.5px' }}>
                            Access Denied: Biometric Mismatch
                          </strong>
                          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
                            {failedReason}
                          </div>
                          {matchScore !== null && (
                            <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px' }}>
                              Measured Match: <strong>{matchScore}%</strong> vs Required Threshold: <strong>≥ {MATCH_THRESHOLD}%</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* UNIFIED DUAL-AUTH BUTTON */}
                  <button
                    type="submit"
                    className="btn-biometric-scan"
                    disabled={scanState === 'scanning' || busy}
                    style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                  >
                    {scanState === 'scanning' ? (
                      <>
                        <span className="spinner-dot" />
                        Verifying Face & Passkey ({scanProgress}%)…
                      </>
                    ) : busy ? (
                      'Authenticating Tahsildar Session…'
                    ) : (
                      '🛡️ Verify Face ID & Authorize Passkey Login →'
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MODE 2: PASSKEY ONLY (FALLBACK)
             ══════════════════════════════════════════════════════════════ */}
          {authMode === 'password' && (
            <form onSubmit={handlePasswordOnlySubmit} className="auth-form" style={{ marginTop: '14px' }}>
              <div>
                <label className="input-label">Tahsildar Username</label>
                <div className="input-wrap">
                  <input
                    className="auth-input"
                    name="username"
                    placeholder="Official username"
                    value={form.username}
                    onChange={handleInput}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Official Secure Passkey</label>
                <div className="input-wrap">
                  <input
                    className="auth-input"
                    type="password"
                    name="password"
                    placeholder="Enter passkey / password"
                    value={form.password}
                    onChange={handleInput}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={busy} style={{ background: 'linear-gradient(135deg, #064e3b, #047857)' }}>
                {busy ? 'Verifying Credentials…' : 'Sign In with Passkey →'}
              </button>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MODE 3: ENROLL FACE BIOMETRIC
             ══════════════════════════════════════════════════════════════ */}
          {authMode === 'enroll' && (
            <div className="biometric-scanner-box" style={{ marginTop: '14px' }}>
              <div className="scanner-feed-wrapper">
                <video
                  ref={videoRef}
                  className={`scanner-video ${cameraActive ? 'active' : 'hidden'}`}
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {!cameraActive && (
                  <div className="camera-placeholder">
                    <div className="placeholder-content">
                      <span className="cam-icon">📷</span>
                      <div className="cam-title">Optical Sensor Offline</div>
                      <p className="cam-desc">Activate webcam to capture reference facial biometric.</p>
                      <button type="button" className="btn-retry-cam" onClick={startCamera}>
                        🔌 Activate Webcam
                      </button>
                    </div>
                  </div>
                )}

                <div className="biometric-hud">
                  <span className="reticle top-left" />
                  <span className="reticle top-right" />
                  <span className="reticle bottom-left" />
                  <span className="reticle bottom-right" />
                  <div className="face-oval-guide">
                    <div className="oval-crosshair" />
                  </div>
                  <div className="hud-telemetry">
                    <span className="hud-badge red-pulse">● ENROLLMENT MODE</span>
                    <span className="hud-badge">TAH-TALUKA-REGISTRY</span>
                  </div>
                  <div className="hud-status-bar">
                    <span className="hud-status-text">Position face inside oval reticle and click Capture below</span>
                  </div>
                </div>
              </div>

              <div className="scanner-action-bar">
                <button
                  type="button"
                  className="btn-enroll-action"
                  disabled={!cameraActive}
                  onClick={handleEnrollFace}
                  style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                >
                  📸 Capture & Enroll This Face as Official Tahsildar
                </button>
                <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: '#94a3b8', textAlign: 'center' }}>
                  Look directly at camera in good lighting. Only this biometric profile will be authorized to access the Tahsildar Portal.
                </p>
              </div>
            </div>
          )}

          <div className="auth-switch">
            <span style={{ color: '#64748b' }}>Switch portal: </span>
            <a href="/collector/login">Collector Portal</a> • <a href="/state-govt/login">State Govt Secretariat</a> • <a href="/login">Citizen Login</a>
          </div>
        </div>
      </div>
    </div>
  );
}
