'use strict';

const crypto = require('node:crypto');

const COOKIE_NAME = 'lm_admin_session';
const SESSION_SECONDS = 60 * 60 * 12;

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return '';
}

function sign(value) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function createSessionCookie(res) {
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    nonce: crypto.randomBytes(16).toString('hex')
  })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

function isAuthenticated(req) {
  try {
    const token = getCookie(req, COOKIE_NAME);
    const separator = token.indexOf('.');
    if (!token || separator < 1) return false;
    const payload = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    if (!safeEqual(signature, sign(payload))) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isInteger(data.exp) && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

module.exports = { safeEqual, createSessionCookie, clearSessionCookie, isAuthenticated };
