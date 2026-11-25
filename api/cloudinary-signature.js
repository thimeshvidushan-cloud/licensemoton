'use strict';

const crypto = require('node:crypto');
const { sendJson, methodNotAllowed, readJson, requireSameOrigin } = require('../server/lib/http');
const { isAuthenticated } = require('../server/lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireSameOrigin(req, res)) return;
  if (!isAuthenticated(req)) return sendJson(res, 401, { error: 'Please log in again.' });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return sendJson(res, 503, { error: 'Cloudinary is not configured on the server.' });

  try {
    const body = await readJson(req);
    const resourceType = body.resourceType;
    if (!['image', 'video'].includes(resourceType)) return sendJson(res, 400, { error: 'Choose an image or video file.' });

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'licensemotion/portfolio';
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    return sendJson(res, 200, {
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
      resourceType
    });
  } catch (error) {
    console.error('Cloudinary signature error:', error.message);
    return sendJson(res, 400, { error: 'Could not prepare the upload.' });
  }
};
