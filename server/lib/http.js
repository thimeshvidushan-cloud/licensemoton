'use strict';

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [name, value] of Object.entries(extraHeaders)) res.setHeader(name, value);
  res.end(JSON.stringify(payload));
}

function methodNotAllowed(res, allowed) {
  return sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: allowed.join(', ') });
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === String(host).toLowerCase();
  } catch {
    return false;
  }
}

function requireSameOrigin(req, res) {
  if (isSameOrigin(req)) return true;
  sendJson(res, 403, { error: 'Request origin could not be verified. Refresh the page and try again.' });
  return false;
}

module.exports = { sendJson, methodNotAllowed, readJson, requireSameOrigin };
