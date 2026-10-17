'use strict';
/**
 * Local Lighthouse fallback — no API key, no quota, works fully offline
 * against localhost. Requires Node + a local Chrome/Chromium and (for the
 * first run) network access for npx to fetch the `lighthouse` package.
 */
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Pinned so repeated/compared runs use the same Lighthouse release (an
// unversioned `npx lighthouse` can resolve to different releases across
// hosts or collection dates) and so it stays compatible with this skill's
// documented Node 18+ requirement.
const LIGHTHOUSE_VERSION = 'lighthouse@12.6.0';

function isAvailable(timeoutMs = 60000) {
  // 60s, not a few seconds: on a first run npx must download the pinned
  // Lighthouse release before `--version` can even answer, and a timeout
  // here would be mistaken for "Lighthouse isn't available" even though it
  // would have worked given a little longer. Subsequent runs resolve from
  // npx's local cache and return almost immediately.
  return new Promise((resolve) => {
    const child = execFile(
      'npx',
      ['--yes', LIGHTHOUSE_VERSION, '--version'],
      { timeout: timeoutMs },
      (err) => resolve(!err)
    );
    child.on('error', () => resolve(false));
  });
}

/**
 * @param {{url: string, strategy?: 'mobile'|'desktop', timeoutMs?: number}} opts
 * @returns {Promise<object>} the parsed Lighthouse report JSON (top-level, no wrapper)
 */
function runLighthouse({ url, strategy = 'mobile', timeoutMs = 120000 }) {
  return new Promise((resolve, reject) => {
    const outPath = path.join(os.tmpdir(), `lh-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    const args = [
      '--yes',
      LIGHTHOUSE_VERSION,
      url,
      '--output=json',
      `--output-path=${outPath}`,
      '--quiet',
      '--only-categories=performance',
      '--chrome-flags=--headless=new --no-sandbox',
    ];
    if (strategy === 'desktop') args.push('--preset=desktop');

    execFile('npx', args, { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 50 }, (err) => {
      if (err) {
        try { fs.unlinkSync(outPath); } catch (e) { /* best-effort cleanup */ }
        return reject(err);
      }
      try {
        const report = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        fs.unlinkSync(outPath);
        resolve(report);
      } catch (e) {
        reject(e);
      }
    });
  });
}

module.exports = { isAvailable, runLighthouse };
