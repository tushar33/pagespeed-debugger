'use strict';
/**
 * Thin client for the public PageSpeed Insights (PSI) v5 API.
 * No dependencies beyond Node's built-in global fetch (Node 18+).
 * Read-only: a single GET per call, nothing is ever mutated.
 */
const fs = require('fs');
const path = require('path');

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
// Optional local key file, gitignored, for anyone who'd rather not export an
// env var every session. Purely a convenience — PSI_API_KEY always wins.
const DEFAULT_KEY_FILE = path.join(__dirname, '..', '..', '.psi-api-key');

function loadApiKey(explicitKey) {
  if (explicitKey) return { key: explicitKey, source: 'flag' };
  if (process.env.PSI_API_KEY) return { key: process.env.PSI_API_KEY, source: 'env:PSI_API_KEY' };
  if (fs.existsSync(DEFAULT_KEY_FILE)) {
    const key = fs.readFileSync(DEFAULT_KEY_FILE, 'utf8').trim();
    if (key) return { key, source: DEFAULT_KEY_FILE };
  }
  return { key: null, source: null };
}

/**
 * @param {{url: string, strategy?: 'mobile'|'desktop', category?: string, key?: string|null}} opts
 * @returns {Promise<object>} the raw PSI API response body (contains .lighthouseResult)
 */
async function runPsi({ url, strategy = 'mobile', category = 'performance', key = null }) {
  const params = new URLSearchParams({ url, strategy, category });
  if (key) params.set('key', key);
  const endpoint = `${PSI_ENDPOINT}?${params.toString()}`;

  const res = await fetch(endpoint, { signal: AbortSignal.timeout(90000) });
  const body = await res.json().catch(() => ({}));

  if (!res.ok || body.error) {
    const errObj = body.error || {};
    const reason = (errObj.errors && errObj.errors[0] && errObj.errors[0].reason) || null;
    const message = errObj.message || `HTTP ${res.status}`;
    const err = new Error(message);
    err.httpStatus = res.status;
    err.reason = reason;
    err.quotaExceeded = res.status === 429 || /quota/i.test(message);
    err.referrerBlocked = reason === 'API_KEY_HTTP_REFERRER_BLOCKED';
    err.invalidKey = res.status === 400 && /API key not valid/i.test(message);
    throw err;
  }
  return body;
}

module.exports = { loadApiKey, runPsi, PSI_ENDPOINT, DEFAULT_KEY_FILE };
