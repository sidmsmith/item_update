// api/validate.js – Item Master Update
const fetch = require('node-fetch');
const cloudinary = require('cloudinary').v2;

const HA_WEBHOOK_URL = process.env.HA_WEBHOOK_URL || "http://sidmsmith.zapto.org:8123/api/webhook/manhattan_app_usage";
const CLOUDINARY_PREFIX = process.env.CLOUDINARY_PREFIX || '';
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || '';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const AUTH_HOST = process.env.MANHATTAN_AUTH_HOST || "salep-auth.sce.manh.com";
const API_HOST = process.env.MANHATTAN_API_HOST || "salep.sce.manh.com";
const CLIENT_ID = process.env.MANHATTAN_CLIENT_ID || "omnicomponent.1.0.0";
const CLIENT_SECRET = process.env.MANHATTAN_SECRET;
const PASSWORD = process.env.MANHATTAN_PASSWORD;
const USERNAME_BASE = process.env.MANHATTAN_USERNAME_BASE || "sdtadmin@";

async function getToken(org) {
  const url = `https://${AUTH_HOST}/oauth/token`;
  const username = `${USERNAME_BASE}${org.toLowerCase()}`;
  const body = new URLSearchParams({
    grant_type: 'password',
    username,
    password: PASSWORD
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
    },
    body
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token;
}

async function apiCall(method, path, token, org, body = null) {
  const url = `https://${API_HOST}${path}`;
  const orgUpper = org ? org.toUpperCase() : org;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    selectedOrganization: orgUpper,
    selectedLocation: `${orgUpper}-DM1`
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let jsonResponse;
  try {
    jsonResponse = JSON.parse(text);
  } catch (e) {
    return { error: text, success: false };
  }
  return jsonResponse;
}

function buildImageUrl(prefix, folder, filename) {
  if (!filename || !String(filename).trim()) return '';
  const raw = (s) => (s == null ? '' : String(s).trim());
  let p = raw(prefix).replace(/\/+$/, '');
  let f = raw(folder).replace(/^\/+|\/+$/g, '');
  let fn = raw(filename).replace(/^\/+/, '');
  const parts = [];
  if (p) parts.push(p);
  if (f) parts.push(f);
  if (fn) parts.push(fn);
  return parts.join('/').replace(/([^:])\/\/+/g, '$1/');
}

function sanitizePublicId(s) {
  return (s || '').replace(/[^a-zA-Z0-9_.-]/g, '_');
}

async function handler(req, res) {
  console.log(`[API] ${req.method} ${req.url}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, org: orgFromBody } = req.body;
  const org = orgFromBody;

  if (action === 'app_opened') {
    return res.json({ success: true });
  }

  if (action === 'ha-track') {
    const { event_name, metadata } = req.body;
    try {
      const payload = {
        event_name,
        app_name: 'item-update',
        app_version: '1.0.0',
        ...metadata,
        timestamp: new Date().toISOString()
      };
      await fetch(HA_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.json({ success: true });
    } catch (error) {
      console.warn('[HA] Failed to track event:', error);
      return res.json({ success: true });
    }
  }

  if (action === 'auth') {
    const token = await getToken(org);
    if (!token) return res.json({ success: false, error: 'Auth failed' });
    return res.json({ success: true, token });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  if (action === 'search_item') {
    const itemId = req.body.itemId;
    const requestOrg = req.body.org;
    if (!itemId || !(itemId + '').trim()) {
      return res.status(400).json({ success: false, error: 'ItemId required' });
    }
    if (!requestOrg || !(requestOrg + '').trim()) {
      return res.status(400).json({ success: false, error: 'ORG required for item search' });
    }
    const id = (itemId + '').trim();
    const payload = {
      Query: `ItemId = '${id.replace(/'/g, "''")}'`,
      Size: 200,
      Template: {
        ItemId: null,
        Description: null,
        OriginalLength: null,
        OriginalWidth: null,
        OriginalHeight: null,
        OriginalWeight: null,
        ImageUrl: null
      }
    };
    const searchRes = await apiCall('POST', '/item-master/api/item-master/item/search', token, requestOrg, payload);
    if (searchRes.error) {
      return res.json({ success: false, error: searchRes.error });
    }
    if (searchRes.success === false && (searchRes.message || searchRes.error)) {
      return res.json({ success: false, error: searchRes.message || searchRes.error });
    }
    const list = searchRes.data && Array.isArray(searchRes.data) ? searchRes.data : [];
    const item = list.length > 0 ? list[0] : null;
    if (!item) {
      return res.json({ success: false, error: 'Item not found' });
    }
    return res.json({ success: true, item });
  }

  if (action === 'upload_image') {
    const requestOrg = req.body.org;
    const itemId = req.body.itemId;
    const fileData = req.body.fileData;
    if (!requestOrg || !(requestOrg + '').trim()) {
      return res.status(400).json({ success: false, error: 'ORG required for image upload' });
    }
    if (!itemId || !(itemId + '').trim()) {
      return res.status(400).json({ success: false, error: 'ItemId required' });
    }
    if (!fileData || typeof fileData !== 'string') {
      return res.status(400).json({ success: false, error: 'fileData (base64) required' });
    }
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return res.status(500).json({ success: false, error: 'Cloudinary env not configured' });
    }
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET
    });
    const base = sanitizePublicId((itemId + '').trim());
    const epoch = Date.now();
    const publicId = (base || 'item') + '_' + epoch;
    const filename = publicId + '.jpg';
    const folder = (CLOUDINARY_FOLDER || '').trim().replace(/^\/+|\/+$/g, '');
    const dataUri = fileData.startsWith('data:') ? fileData : `data:image/jpeg;base64,${fileData}`;
    try {
      const uploadOpts = { folder: folder || undefined, public_id: publicId };
      const result = await cloudinary.uploader.upload(dataUri, uploadOpts);
      const imageUrl = buildImageUrl(CLOUDINARY_PREFIX, CLOUDINARY_FOLDER, filename);
      return res.json({ success: true, imageUrl: imageUrl || (result.secure_url || result.url) });
    } catch (e) {
      console.warn('[upload_image]', e);
      return res.json({ success: false, error: e.message || 'Cloudinary upload failed' });
    }
  }

  if (action === 'save_item') {
    const { itemId, updates } = req.body;
    const requestOrg = req.body.org;
    if (!itemId || !(itemId + '').trim()) {
      return res.status(400).json({ success: false, error: 'ItemId required' });
    }
    if (!requestOrg || !(requestOrg + '').trim()) {
      return res.status(400).json({ success: false, error: 'ORG required for item save' });
    }
    const id = (itemId + '').trim();
    const payload = Object.assign({ ItemId: id }, updates || {});
    const saveRes = await apiCall('POST', '/item-master/api/item-master/item/save', token, requestOrg, payload);
    if (saveRes.error) {
      return res.json({ success: false, error: saveRes.error });
    }
    if (saveRes.success === false && (saveRes.message || saveRes.error)) {
      return res.json({ success: false, error: saveRes.message || saveRes.error });
    }
    return res.json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}

handler.config = { api: { bodyParser: true } };
module.exports = handler;
