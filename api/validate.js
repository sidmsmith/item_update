// api/validate.js – Item Master Update
const fetch = require('node-fetch');

const HA_WEBHOOK_URL = process.env.HA_WEBHOOK_URL || "http://sidmsmith.zapto.org:8123/api/webhook/manhattan_app_usage";
const AUTH_HOST = "salep-auth.sce.manh.com";
const API_HOST = "salep.sce.manh.com";
const CLIENT_ID = "omnicomponent.1.0.0";
const CLIENT_SECRET = process.env.MANHATTAN_SECRET || "b4s8rgTyg55XYNun";
const PASSWORD = process.env.MANHATTAN_PASSWORD || "Blu3sk!es2300";
const USERNAME_BASE = "sdtadmin@";

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

  return res.status(400).json({ error: 'Unknown action' });
}

handler.config = { api: { bodyParser: true } };
module.exports = handler;
