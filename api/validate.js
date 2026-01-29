// api/validate.js – Item Master Update
// Auth, app_opened, and ha-track only. Item APIs to be added later.
import fetch from 'node-fetch';

const HA_WEBHOOK_URL = process.env.HA_WEBHOOK_URL || "http://sidmsmith.zapto.org:8123/api/webhook/manhattan_app_usage";
const AUTH_HOST = "salep-auth.sce.manh.com";
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

export default async function handler(req, res) {
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

  return res.status(400).json({ error: 'Unknown action' });
}

export const config = { api: { bodyParser: true } };
