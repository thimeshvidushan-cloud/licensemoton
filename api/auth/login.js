'use strict';

const { sendJson, methodNotAllowed, readJson, requireSameOrigin } = require('../../server/lib/http');
const { safeEqual, createSessionCookie } = require('../../server/lib/auth');

const attempts = new Map();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireSameOrigin(req, res)) return;

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, resetAt: now + 10 * 60 * 1000 };
  if (record.resetAt < now) { record.count = 0; record.resetAt = now + 10 * 60 * 1000; }
  if (record.count >= 8) return sendJson(res, 429, { error: 'Too many login attempts. Please wait 10 minutes and try again.' });

  try {
    const body = await readJson(req);
    const submitted = typeof body.password === 'string' ? body.password : '';
    const expected = process.env.ADMIN_PASSWORD || '';
    if (!expected || expected.length < 16) return sendJson(res, 503, { error: 'Admin password is not configured securely.' });
    if (!submitted || !safeEqual(submitted, expected)) {
      record.count += 1;
      attempts.set(ip, record);
      return sendJson(res, 401, { error: 'Incorrect password. Please try again.' });
    }
    attempts.delete(ip);
    createSessionCookie(res);
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    return sendJson(res, 400, { error: error.message === 'Unexpected end of JSON input' ? 'Please enter your password.' : 'Could not complete login.' });
  }
};
