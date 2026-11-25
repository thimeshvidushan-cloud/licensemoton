'use strict';

const { sendJson, methodNotAllowed } = require('../../server/lib/http');
const { isAuthenticated } = require('../../server/lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  return sendJson(res, 200, { authenticated: isAuthenticated(req) });
};
