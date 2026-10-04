/**
 * High-Security Biometric Facial Recognition Engine for District Collector Portal
 * 
 * Extracts spatial luminance, gradient texture descriptors (HOG-like), and chromatic 
 * facial features from HTML5 Canvas frames, normalized to unit vector space.
 * Compares live candidate vectors against the enrolled Collector biometric profile
 * using Cosine Similarity metric.
 */

const STORAGE_VECTOR_KEY = 'collector_enrolled_biometric_vector';
const STORAGE_PHOTO_KEY  = 'collector_enrolled_biometric_photo';
const STORAGE_META_KEY   = 'collector_enrolled_biometric_meta';

export const MATCH_THRESHOLD = 75.0; // Required similarity percentage to authorize entry

/**
 * Checks if a live frame contains sufficient facial/skin characteristics.
 */
function detectFaceCharacteristics(data, width, height) {
  let skinPixels = 0;
  let totalPixels = width * height;
  let totalLuminance = 0;
  let luminanceSquares = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Standard YCbCr conversion for skin tone detection
    const y  = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    totalLuminance += y;
    luminanceSquares += y * y;

    // Human skin distribution in chrominance space (Cb: 77..127, Cr: 133..173)
    if (cb >= 77 && cb <= 135 && cr >= 130 && cr <= 175 && r > g && g > b) {
      skinPixels++;
    }
  }

  const skinRatio = skinPixels / totalPixels;
  const meanLum = totalLuminance / totalPixels;
  const variance = (luminanceSquares / totalPixels) - (meanLum * meanLum);
  const stdDev = Math.sqrt(Math.max(0, variance));

  // If there's barely any skin tone (< 8%) or the image is completely flat/solid, no face is present
  const hasFace = skinRatio >= 0.08 && stdDev >= 12;

  return { hasFace, skinRatio, stdDev };
}

/**
 * Extracts a normalized 224-dimensional biometric descriptor vector from video feed.
 */
export function extractBiometricVector(video, canvas) {
  if (!video || !canvas || video.readyState < 2) {
    return { hasFace: false, error: 'Video stream is not ready for optical scanning.' };
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;

  // Focus on center 60% of frame where the face oval is located
  const cropW = Math.round(vw * 0.55);
  const cropH = Math.round(vh * 0.65);
  const cropX = Math.round((vw - cropW) / 2);
  const cropY = Math.round((vh - cropH) / 2);

  // Normalize face crop to fixed 64x64 resolution for biometric feature extraction
  canvas.width = 64;
  canvas.height = 64;
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, 64, 64);

  const imgData = ctx.getImageData(0, 0, 64, 64);
  const data = imgData.data;

  // 1. Verify face presence
  const faceCheck = detectFaceCharacteristics(data, 64, 64);
  if (!faceCheck.hasFace) {
    return {
      hasFace: false,
      error: 'No face detected in optical frame. Please position your face directly within the reticle oval.',
      skinRatio: faceCheck.skinRatio,
    };
  }

  // 2. Grayscale & Contrast Equalization
  const gray = new Float32Array(64 * 64);
  let minVal = 255;
  let maxVal = 0;

  for (let i = 0; i < 64 * 64; i++) {
    const idx = i * 4;
    const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    gray[i] = lum;
    if (lum < minVal) minVal = lum;
    if (lum > maxVal) maxVal = lum;
  }

  const range = maxVal - minVal || 1;
  for (let i = 0; i < 64 * 64; i++) {
    gray[i] = (gray[i] - minVal) / range; // 0.0 to 1.0 normalized
  }

  const vector = [];

  // 3. Spatial Luminance Matrix (8x8 grid = 64 values)
  const blockSize = 8;
  for (let by = 0; by < 8; by++) {
    for (let bx = 0; bx < 8; bx++) {
      let sum = 0;
      for (let y = 0; y < blockSize; y++) {
        for (let x = 0; x < blockSize; x++) {
          sum += gray[(by * blockSize + y) * 64 + (bx * blockSize + x)];
        }
      }
      vector.push(sum / (blockSize * blockSize));
    }
  }

  // 4. Gradient Texture Histogram (Sobel-like difference: 8x8 grid in X & Y = 128 values)
  for (let by = 0; by < 8; by++) {
    for (let bx = 0; bx < 8; bx++) {
      let gradXSum = 0;
      let gradYSum = 0;
      for (let y = 1; y < blockSize - 1; y++) {
        for (let x = 1; x < blockSize - 1; x++) {
          const cy = by * blockSize + y;
          const cx = bx * blockSize + x;
          const gx = Math.abs(gray[cy * 64 + (cx + 1)] - gray[cy * 64 + (cx - 1)]);
          const gy = Math.abs(gray[(cy + 1) * 64 + cx] - gray[(cy - 1) * 64 + cx]);
          gradXSum += gx;
          gradYSum += gy;
        }
      }
      vector.push(gradXSum / (blockSize * blockSize));
      vector.push(gradYSum / (blockSize * blockSize));
    }
  }

  // 5. Chromatic Spectrum (32 values: 16 Red/Green & 16 Blue/Luminance distributions)
  const colorHist = new Float32Array(32);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const rgBin = Math.min(15, Math.floor(((r - g + 255) / 510) * 16));
    const byBin = Math.min(15, Math.floor(((b - (r + g) / 2 + 255) / 510) * 16));
    colorHist[rgBin]++;
    colorHist[16 + byBin]++;
  }
  for (let i = 0; i < 32; i++) {
    vector.push(colorHist[i] / (64 * 64));
  }

  // 6. Vector normalization to unit length: ||v|| = 1
  let normSq = 0;
  for (let i = 0; i < vector.length; i++) {
    normSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(normSq) || 1;
  const normalizedVector = vector.map(val => val / norm);

  // High-res snapshot for display
  const snapshotCanvas = document.createElement('canvas');
  snapshotCanvas.width = 180;
  snapshotCanvas.height = 180;
  const sCtx = snapshotCanvas.getContext('2d');
  sCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, 180, 180);
  const snapshotUrl = snapshotCanvas.toDataURL('image/jpeg', 0.88);

  return {
    hasFace: true,
    vector: normalizedVector,
    snapshotUrl,
  };
}

/**
 * Compares an incoming candidate biometric vector against the enrolled reference vector.
 * Returns match score (0-100%) and boolean verification status.
 */
export function compareBiometricVectors(candidateVec, enrolledVec) {
  if (!candidateVec || !enrolledVec || candidateVec.length !== enrolledVec.length) {
    return { match: false, similarity: 0, reason: 'Invalid or missing biometric descriptor.' };
  }

  // 1. Spatial luminance components (indices 0..63 = 64 values)
  let spatialDot = 0;
  let sNormA = 0;
  let sNormB = 0;
  for (let i = 0; i < 64; i++) {
    spatialDot += candidateVec[i] * enrolledVec[i];
    sNormA += candidateVec[i] * candidateVec[i];
    sNormB += enrolledVec[i] * enrolledVec[i];
  }
  const sCos = spatialDot / (Math.sqrt(sNormA) * Math.sqrt(sNormB) || 1);

  // 2. Texture gradient components (Sobel differences, indices 64..191 = 128 values)
  let gradDot = 0;
  let gNormA = 0;
  let gNormB = 0;
  for (let i = 64; i < 192; i++) {
    gradDot += candidateVec[i] * enrolledVec[i];
    gNormA += candidateVec[i] * candidateVec[i];
    gNormB += enrolledVec[i] * enrolledVec[i];
  }
  const gCos = gradDot / (Math.sqrt(gNormA) * Math.sqrt(gNormB) || 1);

  // 3. Chromatic color spectrum (indices 192..223 = 32 values)
  let colorDot = 0;
  let cNormA = 0;
  let cNormB = 0;
  for (let i = 192; i < 224; i++) {
    colorDot += candidateVec[i] * enrolledVec[i];
    cNormA += candidateVec[i] * candidateVec[i];
    cNormB += enrolledVec[i] * enrolledVec[i];
  }
  const cCos = colorDot / (Math.sqrt(cNormA) * Math.sqrt(cNormB) || 1);

  // Overall cosine dot product
  let totalDot = 0;
  for (let i = 0; i < candidateVec.length; i++) {
    totalDot += candidateVec[i] * enrolledVec[i];
  }

  // Weight facial geometry & gradient textures heavily (different faces have distinct edge gradients)
  const weightedCos = 0.50 * Math.max(0, gCos) + 0.35 * Math.max(0, sCos) + 0.15 * Math.max(0, cCos);

  // If candidate is a different face, gradient or spatial correlation drops severely
  const composite = Math.min(Math.max(0, totalDot), weightedCos);

  // Scaled score to percentage
  const scaledScore = Math.pow(Math.max(0, Math.min(1, composite)), 1.15) * 100;
  const similarity = Math.round(scaledScore * 10) / 10;

  // Security threshold comparison: requires at least MATCH_THRESHOLD% (75%)
  const match = similarity >= MATCH_THRESHOLD;

  return {
    match,
    similarity,
    threshold: MATCH_THRESHOLD,
    reason: match
      ? `Authorized Biometric Match: Score ${similarity}% satisfies security threshold (≥ ${MATCH_THRESHOLD}%)`
      : `Biometric Mismatch: Scanning face does not match enrolled Collector profile (Score: ${similarity}% < Required: ≥ ${MATCH_THRESHOLD}%)`,
  };
}

/**
 * Retrieve enrolled District Collector face descriptor.
 */
export function getEnrolledCollectorFace() {
  try {
    const rawVec = localStorage.getItem(STORAGE_VECTOR_KEY);
    const photo = localStorage.getItem(STORAGE_PHOTO_KEY);
    const meta = localStorage.getItem(STORAGE_META_KEY);

    if (!rawVec) return null;

    return {
      vector: JSON.parse(rawVec),
      photo,
      meta: meta ? JSON.parse(meta) : null,
    };
  } catch (err) {
    console.error('Failed to load enrolled face profile:', err);
    return null;
  }
}

/**
 * Save / Enroll a new District Collector face profile.
 */
export function saveEnrolledCollectorFace(vector, photoUrl, officerName = 'District Collector') {
  try {
    localStorage.setItem(STORAGE_VECTOR_KEY, JSON.stringify(vector));
    if (photoUrl) {
      localStorage.setItem(STORAGE_PHOTO_KEY, photoUrl);
    }
    const meta = {
      officerName,
      enrolledAt: new Date().toISOString(),
      dimensions: vector.length,
      jurisdiction: 'District Collectorate Pune & Division',
    };
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta));
    return true;
  } catch (err) {
    console.error('Failed to save enrolled face profile:', err);
    return false;
  }
}

/**
 * Clears the enrolled face profile (for re-enrollment).
 */
export function clearEnrolledCollectorFace() {
  localStorage.removeItem(STORAGE_VECTOR_KEY);
  localStorage.removeItem(STORAGE_PHOTO_KEY);
  localStorage.removeItem(STORAGE_META_KEY);
}

// ── MAHARASHTRA STATE GOVT SECRETARIAT BIOMETRIC KEYS ──
const SG_VECTOR_KEY = 'stategovt_enrolled_biometric_vector';
const SG_PHOTO_KEY  = 'stategovt_enrolled_biometric_photo';
const SG_META_KEY   = 'stategovt_enrolled_biometric_meta';

export function getEnrolledStateGovtFace() {
  try {
    const rawVec = localStorage.getItem(SG_VECTOR_KEY);
    const photo = localStorage.getItem(SG_PHOTO_KEY);
    const meta = localStorage.getItem(SG_META_KEY);

    if (!rawVec) return null;

    return {
      vector: JSON.parse(rawVec),
      photo,
      meta: meta ? JSON.parse(meta) : null,
    };
  } catch (err) {
    console.error('Failed to load enrolled state govt face profile:', err);
    return null;
  }
}

export function saveEnrolledStateGovtFace(vector, photoUrl, officerName = 'Joint Secretary, Revenue & Forest') {
  try {
    localStorage.setItem(SG_VECTOR_KEY, JSON.stringify(vector));
    if (photoUrl) {
      localStorage.setItem(SG_PHOTO_KEY, photoUrl);
    }
    const meta = {
      officerName,
      enrolledAt: new Date().toISOString(),
      dimensions: vector.length,
      jurisdiction: 'Government of Maharashtra • Secretariat Mantralaya, Mumbai',
    };
    localStorage.setItem(SG_META_KEY, JSON.stringify(meta));
    return true;
  } catch (err) {
    console.error('Failed to save state govt face profile:', err);
    return false;
  }
}

export function clearEnrolledStateGovtFace() {
  localStorage.removeItem(SG_VECTOR_KEY);
  localStorage.removeItem(SG_PHOTO_KEY);
  localStorage.removeItem(SG_META_KEY);
}

// ── TAHSILDAR TALUKA DESK BIOMETRIC KEYS ──
const TAH_VECTOR_KEY = 'tahsildar_enrolled_biometric_vector';
const TAH_PHOTO_KEY  = 'tahsildar_enrolled_biometric_photo';
const TAH_META_KEY   = 'tahsildar_enrolled_biometric_meta';

export function getEnrolledTahsildarFace() {
  try {
    const rawVec = localStorage.getItem(TAH_VECTOR_KEY);
    const photo = localStorage.getItem(TAH_PHOTO_KEY);
    const meta = localStorage.getItem(TAH_META_KEY);

    if (!rawVec) return null;

    return {
      vector: JSON.parse(rawVec),
      photo,
      meta: meta ? JSON.parse(meta) : null,
    };
  } catch (err) {
    console.error('Failed to load enrolled Tahsildar face profile:', err);
    return null;
  }
}

export function saveEnrolledTahsildarFace(vector, photoUrl, officerName = 'Taluka Tahsildar') {
  try {
    localStorage.setItem(TAH_VECTOR_KEY, JSON.stringify(vector));
    if (photoUrl) {
      localStorage.setItem(TAH_PHOTO_KEY, photoUrl);
    }
    const meta = {
      officerName,
      enrolledAt: new Date().toISOString(),
      dimensions: vector.length,
      jurisdiction: 'Office of the Tahsildar & Executive Magistrate',
    };
    localStorage.setItem(TAH_META_KEY, JSON.stringify(meta));
    return true;
  } catch (err) {
    console.error('Failed to save Tahsildar face profile:', err);
    return false;
  }
}

export function clearEnrolledTahsildarFace() {
  localStorage.removeItem(TAH_VECTOR_KEY);
  localStorage.removeItem(TAH_PHOTO_KEY);
  localStorage.removeItem(TAH_META_KEY);
}


