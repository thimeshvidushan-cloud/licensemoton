'use strict';

const { sendJson, methodNotAllowed, requireSameOrigin } = require('../../server/lib/http');
const { clearSessionCookie } = require('../../server/lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireSameOrigin(req, res)) return;
  clearSessionCookie(res);
  return sendJson(res, 200, { ok: true });
};
