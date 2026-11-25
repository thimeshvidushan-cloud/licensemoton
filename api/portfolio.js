'use strict';

const { sendJson, methodNotAllowed, readJson, requireSameOrigin } = require('../server/lib/http');
const { isAuthenticated } = require('../server/lib/auth');
const { supabaseRequest } = require('../server/lib/supabase');

const SELECT = 'id,title,category,media_type,media_url,poster_url,aspect_ratio,is_wide,sort_order,is_published,created_at,updated_at';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanString(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validMediaUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  if (/^\/images\/[a-z0-9][a-z0-9._-]*$/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

function normalizeRecord(body, partial = false) {
  const result = {};
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'title')) {
    result.title = cleanString(body.title, 120);
    if (result.title.length < 2) throw new Error('Project title must be at least 2 characters.');
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'category')) {
    result.category = cleanString(body.category, 40);
    if (!result.category) throw new Error('Choose a project category.');
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'media_type')) {
    result.media_type = body.media_type;
    if (!['image', 'video'].includes(result.media_type)) throw new Error('Media type must be image or video.');
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'media_url')) {
    result.media_url = cleanString(body.media_url, 2048);
    if (!validMediaUrl(result.media_url)) throw new Error('Use a Cloudinary HTTPS URL or a valid /images/ file path.');
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'poster_url')) {
    result.poster_url = cleanString(body.poster_url, 2048) || null;
    if (result.poster_url && !validMediaUrl(result.poster_url)) throw new Error('Poster must be a Cloudinary HTTPS URL or a valid /images/ file path.');
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'aspect_ratio')) {
    result.aspect_ratio = cleanString(body.aspect_ratio, 24) || null;
    if (result.aspect_ratio && !/^\d{1,5}(?:\.\d+)?\/\d{1,5}(?:\.\d+)?$/.test(result.aspect_ratio)) {
      throw new Error('Aspect ratio must look like 1920/1080 or 9/16.');
    }
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'is_wide')) result.is_wide = body.is_wide === true;
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'sort_order')) {
    const order = Number(body.sort_order ?? 0);
    if (!Number.isInteger(order) || order < 0 || order > 100000) throw new Error('Sort order must be a positive whole number.');
    result.sort_order = order;
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'is_published')) result.is_published = body.is_published !== false;
  return result;
}

module.exports = async function handler(req, res) {
  const admin = req.query?.admin === '1' || (typeof req.url === 'string' && req.url.includes('admin=1'));

  if (req.method === 'GET') {
    if (admin && !isAuthenticated(req)) return sendJson(res, 401, { error: 'Please log in again.' });
    try {
      const params = new URLSearchParams({ select: SELECT, order: 'sort_order.asc,created_at.desc' });
      if (!admin) params.set('is_published', 'eq.true');
      const rows = await supabaseRequest(`portfolio_items?${params.toString()}`);
      res.setHeader('Cache-Control', admin ? 'no-store' : 'public, s-maxage=30, stale-while-revalidate=60');
      return sendJson(res, 200, Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error('Portfolio read failed:', error.message);
      return sendJson(res, 503, { error: 'Portfolio is temporarily unavailable.' });
    }
  }

  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
  if (!requireSameOrigin(req, res)) return;
  if (!isAuthenticated(req)) return sendJson(res, 401, { error: 'Please log in again.' });

  try {
    if (req.method === 'POST') {
      const body = await readJson(req);
      const record = normalizeRecord(body);
      const rows = await supabaseRequest('portfolio_items', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(record)
      });
      return sendJson(res, 201, Array.isArray(rows) ? rows[0] : rows);
    }

    if (req.method === 'PATCH') {
      const body = await readJson(req);
      if (!UUID.test(String(body.id || ''))) return sendJson(res, 400, { error: 'Invalid project ID.' });
      const record = normalizeRecord(body, true);
      record.updated_at = new Date().toISOString();
      const params = new URLSearchParams({ id: `eq.${body.id}`, select: SELECT });
      const rows = await supabaseRequest(`portfolio_items?${params.toString()}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(record)
      });
      if (!Array.isArray(rows) || !rows.length) return sendJson(res, 404, { error: 'Project not found.' });
      return sendJson(res, 200, rows[0]);
    }

    const body = await readJson(req);
    if (!UUID.test(String(body.id || ''))) return sendJson(res, 400, { error: 'Invalid project ID.' });
    const params = new URLSearchParams({ id: `eq.${body.id}` });
    await supabaseRequest(`portfolio_items?${params.toString()}`, { method: 'DELETE' });
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error('Portfolio write failed:', error.message);
    if (error.message && !error.status) return sendJson(res, 400, { error: error.message });
    return sendJson(res, 502, { error: 'Could not save the portfolio item. Please check the fields and try again.' });
  }
};
