'use strict';

async function supabaseRequest(path, options = {}) {
  const projectUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!projectUrl || !secretKey) throw new Error('Supabase server environment is not configured.');

  const base = projectUrl.replace(/\/+$/, '');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: secretKey,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const message = data && typeof data === 'object' && data.message ? data.message : 'Database request failed.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

module.exports = { supabaseRequest };
