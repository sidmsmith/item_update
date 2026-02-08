// Item Master Update App - Main Script
const orgInput = document.getElementById('org');
const authSection = document.getElementById('authSection');
const mainUI = document.getElementById('mainUI');
const itemInput = document.getElementById('itemInput');
const cameraBtn = document.getElementById('cameraBtn');
const statusEl = document.getElementById('status');
const cameraModal = document.getElementById('cameraModal');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const cameraViewport = document.getElementById('cameraViewport');
const authStatusEl = document.getElementById('authStatus');
const themeSelectorBtn = document.getElementById('themeSelectorBtn');
const themeModal = document.getElementById('themeModal');
const themeList = document.getElementById('themeList');
const modalBackdrop = document.getElementById('modalBackdrop');
const errorModal = document.getElementById('errorModal');
const errorModalMessage = document.getElementById('errorModalMessage');
const errorModalCloseBtn = document.getElementById('errorModalCloseBtn');
const itemInfo = document.getElementById('itemInfo');
const itemIdEl = document.getElementById('itemId');
const itemDescriptionEl = document.getElementById('itemDescription');
const itemOriginalLengthEl = document.getElementById('itemOriginalLength');
const itemOriginalWidthEl = document.getElementById('itemOriginalWidth');
const itemOriginalHeightEl = document.getElementById('itemOriginalHeight');
const itemOriginalWeightEl = document.getElementById('itemOriginalWeight');
const noImagePlaceholder = document.getElementById('noImagePlaceholder');
const itemImage = document.getElementById('itemImage');
const updateItemBtn = document.getElementById('updateItemBtn');
const imageCameraBtn = document.getElementById('imageCameraBtn');
const photoModal = document.getElementById('photoModal');
const photoVideo = document.getElementById('photoVideo');
const photoCanvas = document.getElementById('photoCanvas');
const photoCaptureBtn = document.getElementById('photoCaptureBtn');
const photoCloseBtn = document.getElementById('photoCloseBtn');
const previewOverlay = document.getElementById('previewOverlay');

let token = null;
let originalItem = null;
let currentOrg = null;
let isScanning = false;
let qrScanInterval = null;
let cameraModalHistoryState = null;
let capturedImageDataUrl = null;
let photoStream = null;

const SESSION_STORAGE_KEY = 'item_update_session';
let sessionId = null;
let pageLoadTime = null;
let authAttemptCount = 0;
let firstAuthSuccess = true;

(function initSession() {
  pageLoadTime = Date.now();
  sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  const hasSavedPreferences = localStorage.getItem('itemUpdateTheme') !== null;
  window._appSession = { sessionId, pageLoadTime, hasSavedPreferences };
})();

function getCommonMetadata(additionalMetadata = {}) {
  const now = Date.now();
  const timeOnPage = pageLoadTime ? Math.floor((now - pageLoadTime) / 1000) : 0;
  const ua = navigator.userAgent;
  const browserInfo = parseUserAgent(ua);
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const screenResolution = `${screenWidth}x${screenHeight}`;
  const urlParamsObj = {};
  const currentUrlParams = new URLSearchParams(window.location.search);
  for (const [key, value] of currentUrlParams.entries()) {
    urlParamsObj[key] = value;
  }
  const currentTheme = localStorage.getItem('itemUpdateTheme') || 'manhattan';
  const urlOrg = urlParamsObj.Organization || urlParamsObj.ORG || null;

  return {
    user_agent: ua,
    browser_name: browserInfo.name,
    browser_version: browserInfo.version,
    device_type: getDeviceType(),
    os_name: browserInfo.os,
    os_version: browserInfo.osVersion,
    screen_resolution: screenResolution,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language || navigator.userLanguage,
    session_id: sessionId,
    page_load_time: pageLoadTime ? new Date(pageLoadTime).toISOString() : null,
    time_on_page: timeOnPage,
    referrer: document.referrer || null,
    url_params: Object.keys(urlParamsObj).length > 0 ? urlParamsObj : null,
    auto_authenticated: !!urlOrg,
    theme: currentTheme,
    has_saved_preferences: window._appSession?.hasSavedPreferences || false,
    auth_method: urlOrg ? 'url_param' : 'manual',
    auth_attempt_count: authAttemptCount,
    first_auth_success: firstAuthSuccess,
    source_app: urlOrg ? 'cross_app' : null,
    integration_type: urlOrg ? 'url_params' : 'direct',
    request_origin: window.location.origin,
    ...additionalMetadata
  };
}

function parseUserAgent(ua) {
  let name = 'Unknown', version = 'Unknown', os = 'Unknown', osVersion = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    name = 'Chrome';
    const m = ua.match(/Chrome\/([\d.]+)/);
    version = m ? m[1] : 'Unknown';
  } else if (ua.includes('Firefox')) {
    name = 'Firefox';
    const m = ua.match(/Firefox\/([\d.]+)/);
    version = m ? m[1] : 'Unknown';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    name = 'Safari';
    const m = ua.match(/Version\/([\d.]+)/);
    version = m ? m[1] : 'Unknown';
  } else if (ua.includes('Edg')) {
    name = 'Edge';
    const m = ua.match(/Edg\/([\d.]+)/);
    version = m ? m[1] : 'Unknown';
  }
  if (ua.includes('Windows')) {
    os = 'Windows';
    const m = ua.match(/Windows NT ([\d.]+)/);
    if (m) {
      const v = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
      osVersion = v[m[1]] || m[1];
    }
  } else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) {
    os = 'macOS';
    const m = ua.match(/Mac OS X ([\d_]+)/);
    if (m) osVersion = m[1].replace(/_/g, '.');
  } else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) {
    os = 'Android';
    const m = ua.match(/Android ([\d.]+)/);
    osVersion = m ? m[1] : 'Unknown';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
    const m = ua.match(/OS ([\d_]+)/);
    if (m) osVersion = m[1].replace(/_/g, '.');
  }
  return { name, version, os, osVersion };
}

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

async function trackEvent(eventName, metadata = {}) {
  try {
    const fullMetadata = getCommonMetadata(metadata);
    await apiCall('ha-track', { event_name: eventName, metadata: fullMetadata });
  } catch (e) {
    console.warn('[HA] Failed to track event:', e);
  }
}

function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';
}

function hideStatus() {
  statusEl.style.display = 'none';
}

function showErrorModal(message) {
  if (errorModal && errorModalMessage) {
    errorModalMessage.textContent = message;
    errorModal.removeAttribute('hidden');
  } else {
    showStatus(message, 'error');
  }
}

function hideErrorModal() {
  if (errorModal) errorModal.setAttribute('hidden', '');
}

function showAuthStatus(message, type = 'info') {
  if (authStatusEl) {
    authStatusEl.textContent = message;
    authStatusEl.className = `status ${type}`;
    authStatusEl.style.display = 'block';
  }
}

function hideAuthStatus() {
  if (authStatusEl) authStatusEl.style.display = 'none';
}

async function apiCall(action, data = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch('/api/validate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...data })
  }).then(r => r.json());
}

function checkAutoAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlOrg = urlParams.get('Organization') || urlParams.get('ORG');
  const urlItem = urlParams.get('Item') || urlParams.get('ItemId');

  if (urlItem && urlItem.trim()) {
    window.urlItem = urlItem.trim();
  }

  if (urlOrg && urlOrg.trim()) {
    orgInput.value = urlOrg.trim();
    authenticate();
  }
}

async function authenticate() {
  const org = orgInput.value.trim();
  if (!org) {
    showAuthStatus('ORG required', 'error');
    return;
  }

  authAttemptCount++;
  const authStartTime = Date.now();
  trackEvent('auth_attempt', { org: org || 'unknown', auth_attempt_count: authAttemptCount });
  showAuthStatus('Authenticating...', 'info');

  try {
    const res = await apiCall('auth', { org });
    const authDuration = Date.now() - authStartTime;

    if (!res.success) {
      showAuthStatus('Authentication Failed!', 'error');
      mainUI.style.display = 'none';
      trackEvent('auth_failed', {
        org: org || 'unknown',
        error: res.error || 'Auth failed',
        error_message: res.error || 'Auth failed',
        auth_attempt_count: authAttemptCount,
        auth_duration_ms: authDuration,
        token_received: false
      });
      firstAuthSuccess = false;
      return;
    }

    token = res.token;
    currentOrg = org.toUpperCase();
    hideAuthStatus();
    authSection.style.display = 'none';
    mainUI.style.display = 'block';

    trackEvent('auth_success', {
      org,
      auth_attempt_count: authAttemptCount,
      auth_duration_ms: authDuration,
      token_received: true,
      first_auth_success: firstAuthSuccess
    });
    firstAuthSuccess = false;

    if (window.urlItem) {
      itemInput.value = window.urlItem;
      const prefill = window.urlItem;
      window.urlItem = null;
      setTimeout(() => searchItem(prefill), 300);
    }
  } catch (error) {
    console.error('Authentication error:', error);
    showAuthStatus('Authentication Failed!', 'error');
    mainUI.style.display = 'none';
    trackEvent('auth_failed', {
      org: org || 'unknown',
      error: error.message || 'Unknown error',
      error_message: error.message || 'Unknown error',
      auth_attempt_count: authAttemptCount,
      auth_duration_ms: Date.now() - authStartTime,
      token_received: false
    });
    firstAuthSuccess = false;
  }
}

function setItemImage(url) {
  if (!itemImage || !noImagePlaceholder) return;
  capturedImageDataUrl = null;
  if (previewOverlay) previewOverlay.style.display = 'none';
  const u = (url != null && url !== '') ? String(url).trim() : '';
  if (u) {
    itemImage.style.display = 'none';
    itemImage.removeAttribute('src');
    itemImage.alt = 'Item image';
    noImagePlaceholder.style.display = 'flex';
    itemImage.onerror = () => {
      itemImage.style.display = 'none';
      itemImage.removeAttribute('src');
      itemImage.onerror = null;
      itemImage.onload = null;
      noImagePlaceholder.style.display = 'flex';
    };
    itemImage.onload = () => {
      itemImage.onerror = null;
      itemImage.onload = null;
      noImagePlaceholder.style.display = 'none';
      itemImage.style.display = 'block';
    };
    itemImage.src = u;
  } else {
    itemImage.style.display = 'none';
    itemImage.removeAttribute('src');
    itemImage.onerror = null;
    itemImage.onload = null;
    noImagePlaceholder.style.display = 'flex';
  }
}

function setCapturedImage(dataUrl) {
  if (!itemImage || !noImagePlaceholder) return;
  capturedImageDataUrl = dataUrl;
  noImagePlaceholder.style.display = 'none';
  itemImage.alt = 'Captured photo';
  itemImage.src = dataUrl;
  itemImage.style.display = 'block';
  itemImage.onerror = null;
  if (previewOverlay) previewOverlay.style.display = 'block';
}

function closePhotoModal() {
  if (photoStream) {
    photoStream.getTracks().forEach((t) => t.stop());
    photoStream = null;
  }
  if (photoVideo) photoVideo.srcObject = null;
  if (photoModal) photoModal.classList.remove('active');
}

async function openPhotoModal() {
  if (!photoModal || !photoVideo) return;
  try {
    photoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    photoVideo.srcObject = photoStream;
    photoModal.classList.add('active');
    await photoVideo.play().catch(() => {});
  } catch (e) {
    console.error('Camera error:', e);
    showStatus('Could not access camera.', 'error');
  }
}

function capturePhoto() {
  if (!photoVideo || !photoCanvas || !itemImage || !noImagePlaceholder) return;
  const v = photoVideo;
  if (v.readyState !== v.HAVE_ENOUGH_DATA || v.videoWidth === 0) return;
  const w = v.videoWidth;
  const h = v.videoHeight;
  photoCanvas.width = w;
  photoCanvas.height = h;
  const ctx = photoCanvas.getContext('2d');
  ctx.drawImage(v, 0, 0, w, h);
  const dataUrl = photoCanvas.toDataURL('image/jpeg', 0.9);
  setCapturedImage(dataUrl);
  closePhotoModal();
}

const EDITABLE_KEYS = ['Description', 'OriginalLength', 'OriginalWidth', 'OriginalHeight', 'OriginalWeight'];
const NUMERIC_KEYS = ['OriginalLength', 'OriginalWidth', 'OriginalHeight', 'OriginalWeight'];

function getCurrentItemFields() {
  const v = (el) => (el ? String(el.value || '').trim() : '');
  return {
    Description: v(itemDescriptionEl),
    OriginalLength: v(itemOriginalLengthEl),
    OriginalWidth: v(itemOriginalWidthEl),
    OriginalHeight: v(itemOriginalHeightEl),
    OriginalWeight: v(itemOriginalWeightEl)
  };
}

function getChangedFields(orig, current) {
  const out = {};
  for (const k of EDITABLE_KEYS) {
    const a = orig[k] != null ? String(orig[k]) : '';
    const b = current[k] != null ? String(current[k]) : '';
    if (a !== b) {
      if (b === '') out[k] = null;
      else if (NUMERIC_KEYS.includes(k) && isNumeric(b)) out[k] = parseFloat(b);
      else out[k] = b;
    }
  }
  return out;
}

function isNumeric(s) {
  if (typeof s !== 'string' || !s) return false;
  return !isNaN(parseFloat(s)) && isFinite(s);
}

function populateItemFields(item) {
  const v = (x) => (x == null || x === undefined ? '' : String(x));
  if (itemIdEl) itemIdEl.value = v(item.ItemId);
  if (itemDescriptionEl) itemDescriptionEl.value = v(item.Description);
  if (itemOriginalLengthEl) itemOriginalLengthEl.value = v(item.OriginalLength);
  if (itemOriginalWidthEl) itemOriginalWidthEl.value = v(item.OriginalWidth);
  if (itemOriginalHeightEl) itemOriginalHeightEl.value = v(item.OriginalHeight);
  if (itemOriginalWeightEl) itemOriginalWeightEl.value = v(item.OriginalWeight);
  capturedImageDataUrl = null;
  setItemImage(item.ImageUrl);
  originalItem = {
    ItemId: item.ItemId,
    Description: v(item.Description),
    OriginalLength: v(item.OriginalLength),
    OriginalWidth: v(item.OriginalWidth),
    OriginalHeight: v(item.OriginalHeight),
    OriginalWeight: v(item.OriginalWeight),
    ImageUrl: v(item.ImageUrl)
  };
}

async function searchItem(item) {
  const v = (item || '').trim();
  if (!v) {
    showStatus('Please enter or scan an item', 'error');
    return;
  }
  itemInput.value = v;
  showStatus('Searching item...', 'info');
  if (itemInfo) itemInfo.style.display = 'none';

  try {
    const res = await apiCall('search_item', { org: currentOrg, itemId: v });
    if (!res.success) {
      showStatus(res.error || 'Item not found', 'error');
      itemInfo.style.display = 'none';
      itemInput.focus();
      return;
    }
    populateItemFields(res.item);
    if (itemInfo) itemInfo.style.display = 'block';
    hideStatus();
    itemInput.focus();
  } catch (err) {
    console.error('Item search error:', err);
    showStatus(err.message || 'Search failed', 'error');
    if (itemInfo) itemInfo.style.display = 'none';
    itemInput.focus();
  }
}

async function updateItem() {
  if (!originalItem || !itemIdEl) return;
  const itemId = String(itemIdEl.value || '').trim();
  if (!itemId) {
    showStatus('No item loaded.', 'error');
    return;
  }
  const current = getCurrentItemFields();
  const changed = getChangedFields(originalItem, current);
  const hasNewImage = !!capturedImageDataUrl;
  if (Object.keys(changed).length === 0 && !hasNewImage) {
    showStatus('No changes to save.', 'info');
    return;
  }
  if (!updateItemBtn) return;
  updateItemBtn.disabled = true;
  const origHtml = updateItemBtn.innerHTML;
  updateItemBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  showStatus(hasNewImage ? 'Uploading image...' : 'Saving...', 'info');
  try {
    if (hasNewImage) {
      const up = await apiCall('upload_image', {
        org: currentOrg,
        itemId,
        fileData: capturedImageDataUrl
      });
      if (!up.success) {
        showStatus(up.error || 'Image upload failed', 'error');
        return;
      }
      if (up.imageUrl) changed.ImageUrl = up.imageUrl;
      showStatus('Saving...', 'info');
    }
    const res = await apiCall('save_item', { org: currentOrg, itemId, updates: changed });
    if (!res.success) {
      showStatus(res.error || 'Save failed', 'error');
      return;
    }
    originalItem = { ...originalItem, ...current };
    if (changed.ImageUrl) {
      originalItem.ImageUrl = changed.ImageUrl;
      setItemImage(changed.ImageUrl);
      capturedImageDataUrl = null;
      if (previewOverlay) previewOverlay.style.display = 'none';
    }
    showStatus('Item updated successfully.', 'success');
  } catch (err) {
    console.error('Save error:', err);
    showStatus(err.message || 'Save failed', 'error');
  } finally {
    updateItemBtn.disabled = false;
    updateItemBtn.innerHTML = origHtml;
  }
}

function initBarcodeScanner() {
  if (isScanning) return;
  const maxWidth = Math.min(400, window.innerWidth * 0.9);
  const maxHeight = Math.min(300, window.innerHeight * 0.6);

  Quagga.init({
    inputStream: {
      name: 'Live',
      type: 'LiveStream',
      target: cameraViewport,
      constraints: {
        width: { min: 320, ideal: 640, max: 1280 },
        height: { min: 240, ideal: 480, max: 720 },
        facingMode: 'environment'
      }
    },
    decoder: {
      readers: [
        'code_128_reader',
        'code_39_reader',
        'code_39_vin_reader',
        'ean_reader',
        'ean_8_reader',
        'codabar_reader',
        'upc_reader',
        'upc_e_reader',
        'i2of5_reader'
      ],
      debug: { drawBoundingBox: true, showFrequency: false, drawScanline: true, showPattern: false },
      patchSize: 'medium',
      showCanvas: false,
      showPatches: false
    },
    locate: true,
    numOfWorkers: 4,
    frequency: 30,
    halfSample: false
  }, (err) => {
    if (err) {
      console.error('QuaggaJS initialization error:', err);
      showStatus('Camera initialization failed. Please use manual entry.', 'error');
      closeCamera();
      return;
    }
    isScanning = true;
    Quagga.start();
    showStatus('Camera ready. Point at barcode or QR code to scan.', 'info');
  });

  Quagga.onDetected((result) => {
    const code = result.codeResult.code;
    const format = result.codeResult.format;
    const confidence = result.codeResult.decodedCodes
      ? result.codeResult.decodedCodes.filter(x => x.error === 0).length / result.codeResult.decodedCodes.length
      : 0;
    if (!code) return;
    const minConfidence = (format === 'code_128' || format === 'code_39') ? 0.25 : 0.4;
    if (confidence < minConfidence) return;
    processScannedCode(code, '1D Barcode: ' + format);
  });

  startQRCodeScanning();
}

function startQRCodeScanning() {
  if (!window.jsQR) return;
  const video = cameraViewport.querySelector('video');
  if (!video) {
    setTimeout(startQRCodeScanning, 500);
    return;
  }
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  qrScanInterval = setInterval(() => {
    if (!isScanning || !video || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) processScannedCode(code.data, 'QR Code');
  }, 300);
}

function processScannedCode(code, source) {
  trackEvent('item_scanned', {
    org: currentOrg || 'unknown',
    scan_source: source === 'QR Code' ? 'qr_code' : 'camera',
    item: code.substring(0, 100),
    code_length: String(code.length),
    camera_used: true
  });
  if (code.length > 0 && /^[A-Z0-9]+$/i.test(code)) {
    closeCamera();
    searchItem(code);
  } else {
    showStatus(`Scanned: "${code}" – Does not look like a valid item. Try again.`, 'error');
  }
}

function openCamera() {
  cameraModal.classList.add('active');
  if (history.pushState) {
    cameraModalHistoryState = { modal: 'camera', timestamp: Date.now() };
    history.pushState(cameraModalHistoryState, '', window.location.href);
  }
  setTimeout(initBarcodeScanner, 100);
}

function closeCamera() {
  if (isScanning) {
    Quagga.stop();
    isScanning = false;
  }
  if (qrScanInterval) {
    clearInterval(qrScanInterval);
    qrScanInterval = null;
  }
  cameraModal.classList.remove('active');
  cameraViewport.innerHTML = '';
  if (cameraModalHistoryState && history.state && history.state.modal === 'camera') {
    history.replaceState(null, '', window.location.href);
    cameraModalHistoryState = null;
  }
}

const DEFAULT_THEME_KEY = 'manhattan';
const THEMES = {
  default: {
    name: 'Default (Dark)',
    colors: {
      '--bg-color': '#121212', '--text-color': '#e0e0e0', '--text-muted': '#bbbbbb',
      '--card-bg': '#1e1e1e', '--border-color': '#333', '--input-bg': '#2d2d2d',
      '--input-border': '#444', '--input-focus-bg': '#333', '--input-focus-border': '#0d6efd',
      '--input-focus-shadow': 'rgba(13, 110, 253, 0.25)', '--primary-color': '#0d6efd',
      '--primary-hover': '#0b5ed7', '--success-color': '#28a745', '--danger-color': '#dc3545',
      '--header-bg': '#111827', '--header-text': '#e5e7eb'
    }
  },
  loves: {
    name: "Love's Travel Stops",
    colors: {
      '--bg-color': '#f8f9fa', '--text-color': '#212529', '--text-muted': '#6c757d',
      '--card-bg': '#ffffff', '--border-color': '#dee2e6', '--input-bg': '#f5f5f5',
      '--input-border': '#ced4da', '--input-focus-bg': '#ffffff', '--input-focus-border': '#E31837',
      '--input-focus-shadow': 'rgba(227, 24, 55, 0.25)', '--primary-color': '#E31837',
      '--primary-hover': '#C0142D', '--success-color': '#28a745', '--danger-color': '#dc3545',
      '--header-bg': '#f1f5f9', '--header-text': '#1f2933'
    }
  },
  manhattan: {
    name: 'Manhattan',
    colors: {
      '--bg-color': '#f5f7fa', '--text-color': '#1a1a1a', '--text-muted': '#4a5568',
      '--card-bg': '#ffffff', '--border-color': '#e1e8ed', '--input-bg': '#f0f2f5',
      '--input-border': '#cbd5e0', '--input-focus-bg': '#ffffff', '--input-focus-border': '#0066cc',
      '--input-focus-shadow': 'rgba(0, 102, 204, 0.25)', '--primary-color': '#0066cc',
      '--primary-hover': '#0052a3', '--success-color': '#28a745', '--danger-color': '#dc3545',
      '--header-bg': '#dce7f5', '--header-text': '#0f172a'
    }
  },
  msc: {
    name: 'MSC Industrial',
    colors: {
      '--bg-color': '#fafafa', '--text-color': '#1a1a1a', '--text-muted': '#757575',
      '--card-bg': '#ffffff', '--border-color': '#e0e0e0', '--input-bg': '#f0f0f0',
      '--input-border': '#bdbdbd', '--input-focus-bg': '#ffffff', '--input-focus-border': '#003d82',
      '--input-focus-shadow': 'rgba(0,61,130,0.25)', '--primary-color': '#003d82',
      '--primary-hover': '#002d5f', '--success-color': '#28a745', '--danger-color': '#dc3545',
      '--header-bg': '#e5e7eb', '--header-text': '#1f1f1f'
    }
  },
  'corporate-blue': {
    name: 'Corporate Blue',
    colors: {
      '--bg-color': '#e3f2fd', '--text-color': '#0d47a1', '--text-muted': '#1976d2',
      '--card-bg': '#ffffff', '--border-color': '#90caf9', '--input-bg': '#f5f5f5',
      '--input-border': '#90caf9', '--input-focus-bg': '#ffffff', '--input-focus-border': '#1565c0',
      '--input-focus-shadow': 'rgba(21,101,192,0.25)', '--primary-color': '#1565c0',
      '--primary-hover': '#0d47a1', '--success-color': '#28a745', '--danger-color': '#dc3545',
      '--header-bg': '#bbdefb', '--header-text': '#0d47a1'
    }
  },
  'minimal-light': {
    name: 'Minimal Light',
    colors: {
      '--bg-color': '#ffffff', '--text-color': '#1f2933', '--text-muted': '#616e7c',
      '--card-bg': '#f8fafc', '--border-color': '#d9e2ec', '--input-bg': '#ffffff',
      '--input-border': '#cbd5e0', '--input-focus-bg': '#ffffff', '--input-focus-border': '#5a67d8',
      '--input-focus-shadow': 'rgba(90,103,216,0.25)', '--primary-color': '#5a67d8',
      '--primary-hover': '#4c51bf', '--success-color': '#28a745', '--danger-color': '#dc3545',
      '--header-bg': '#d9e2ec', '--header-text': '#1f2933'
    }
  }
};

function applyTheme(themeKey) {
  const theme = THEMES[themeKey];
  if (!theme) return;
  Object.entries(theme.colors).forEach(([prop, value]) => {
    document.documentElement.style.setProperty(prop, value);
  });
  localStorage.setItem('itemUpdateTheme', themeKey);
}

function loadTheme() {
  const saved = localStorage.getItem('itemUpdateTheme') || DEFAULT_THEME_KEY;
  applyTheme(saved);
}

function renderThemeList() {
  if (!themeList) return;
  const current = localStorage.getItem('itemUpdateTheme') || DEFAULT_THEME_KEY;
  themeList.innerHTML = '';
  Object.entries(THEMES).forEach(([key, theme]) => {
    const btn = document.createElement('button');
    btn.textContent = theme.name;
    btn.className = key === current ? 'active' : '';
    btn.onclick = () => {
      applyTheme(key);
      closeThemeModal();
    };
    themeList.appendChild(btn);
  });
}

function isModalVisible(el) {
  return el && !el.hidden;
}

function showBackdrop() {
  if (modalBackdrop) modalBackdrop.hidden = false;
}

function hideBackdropIfNone() {
  if (modalBackdrop && !isModalVisible(themeModal)) modalBackdrop.hidden = true;
}

function openThemeModal() {
  if (!themeModal) return;
  renderThemeList();
  themeModal.removeAttribute('hidden');
  themeModal.style.display = 'flex';
  themeModal.style.visibility = 'visible';
  themeModal.style.opacity = '1';
  themeModal.style.zIndex = '1001';
  showBackdrop();
}

function closeThemeModal() {
  if (!themeModal) return;
  themeModal.setAttribute('hidden', '');
  themeModal.style.display = 'none';
  hideBackdropIfNone();
}

orgInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') authenticate();
});

itemInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchItem(itemInput.value);
});

cameraBtn.addEventListener('click', openCamera);
closeCameraBtn.addEventListener('click', closeCamera);
imageCameraBtn?.addEventListener('click', openPhotoModal);
photoCaptureBtn?.addEventListener('click', capturePhoto);
photoCloseBtn?.addEventListener('click', closePhotoModal);
updateItemBtn?.addEventListener('click', updateItem);
errorModalCloseBtn?.addEventListener('click', hideErrorModal);
errorModal?.addEventListener('click', (e) => {
  if (e.target === errorModal) hideErrorModal();
});
themeSelectorBtn?.addEventListener('click', openThemeModal);
modalBackdrop?.addEventListener('click', () => {
  if (isModalVisible(themeModal)) closeThemeModal();
});
cameraModal.addEventListener('click', (e) => {
  if (e.target === cameraModal) closeCamera();
});
photoModal?.addEventListener('click', (e) => {
  if (e.target === photoModal) closePhotoModal();
});

window.addEventListener('popstate', (event) => {
  if (cameraModal.classList.contains('active')) {
    if (isScanning) {
      Quagga.stop();
      isScanning = false;
    }
    if (qrScanInterval) {
      clearInterval(qrScanInterval);
      qrScanInterval = null;
    }
    cameraModal.classList.remove('active');
    cameraViewport.innerHTML = '';
    cameraModalHistoryState = null;
    return;
  }
  if (event.state && event.state.modal === 'camera') cameraModalHistoryState = null;
});

window.addEventListener('load', async () => {
  loadTheme();
  trackEvent('app_opened', {});
  await apiCall('app_opened');
  checkAutoAuth();
});
