#!/usr/bin/env node
'use strict';
/**
 * Collects a Lighthouse performance report for a URL, trying progressively
 * more available sources so this works with zero setup:
 *
 *   1. PageSpeed Insights API with a key (PSI_API_KEY env, .psi-api-key file,
 *      or --key) — best data, includes real-user CrUX field data when available.
 *   2. Local Lighthouse via `npx lighthouse` — no key/quota needed at all,
 *      just Node + a local Chrome. This is the default "no API" path.
 *   3. PageSpeed Insights API with no key — Google's small shared anonymous
 *      quota. Flaky (easily exhausted by other callers worldwide), tried only
 *      as a last automated attempt before giving up.
 *   4. Manual fallback — prints exact instructions to run PSI/Lighthouse by
 *      hand and where to save the JSON so diagnose.cjs can still use it.
 *
 * Never modifies anything — a single read against the target URL per attempt.
 *
 * Usage:
 *   node collect.cjs <url> [--strategy mobile|desktop] [--key <psiApiKey>]
 *                          [--out <path>] [--source auto|psi|lighthouse]
 */
const fs = require('fs');
const path = require('path');
const { loadApiKey, runPsi } = require('./lib/psi-client.cjs');
const lighthouseLocal = require('./lib/lighthouse-local.cjs');

function parseArgs(argv) {
  const args = { _: [], strategy: 'mobile', source: 'auto' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--strategy') args.strategy = argv[++i];
    else if (a === '--key') args.key = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--source') args.source = argv[++i];
    else args._.push(a);
  }
  return args;
}

function defaultOutPath(url, strategy) {
  const slug = url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  const dir = path.join(process.cwd(), 'reports', 'pagespeed-debugger', 'raw');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${slug}-${strategy}.json`);
}

function normalize({ source, url, strategy, lighthouseResult, note }) {
  return {
    meta: {
      source,
      url,
      strategy,
      collectedAt: new Date().toISOString(),
      note: note || null,
    },
    lighthouseResult,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = args._[0];
  if (!url) {
    console.error('Usage: node collect.cjs <url> [--strategy mobile|desktop] [--key <key>] [--out <path>] [--source auto|psi|lighthouse]');
    process.exit(1);
  }

  const attempts = [];
  const wantPsi = args.source === 'auto' || args.source === 'psi';
  const wantLighthouse = args.source === 'auto' || args.source === 'lighthouse';

  // Tier 1: PSI with a configured key.
  if (wantPsi) {
    const creds = loadApiKey(args.key);
    if (creds.key) {
      try {
        const body = await runPsi({ url, strategy: args.strategy, key: creds.key });
        return emit(normalize({
          source: `psi-api (key: ${creds.source})`,
          url, strategy: args.strategy,
          lighthouseResult: body.lighthouseResult,
        }), args, url);
      } catch (err) {
        attempts.push(`psi-api-with-key: ${err.message}${err.reason ? ` (${err.reason})` : ''}`);
      }
    } else {
      attempts.push('psi-api-with-key: no key configured (PSI_API_KEY env / --key / .psi-api-key file)');
    }
  }

  // Tier 2: local Lighthouse — the real "no API key needed" path.
  if (wantLighthouse) {
    const available = await lighthouseLocal.isAvailable();
    if (available) {
      try {
        const report = await lighthouseLocal.runLighthouse({ url, strategy: args.strategy });
        return emit(normalize({
          source: 'local-lighthouse',
          url, strategy: args.strategy,
          lighthouseResult: report,
        }), args, url);
      } catch (err) {
        attempts.push(`local-lighthouse: ${err.message}`);
      }
    } else {
      attempts.push('local-lighthouse: not available (no npx/network/Chrome, or first-run install failed)');
    }
  }

  // Tier 3: PSI with no key at all — small shared anonymous quota, worth one try.
  if (wantPsi) {
    try {
      const body = await runPsi({ url, strategy: args.strategy, key: null });
      return emit(normalize({
        source: 'psi-api (anonymous, no key)',
        url, strategy: args.strategy,
        lighthouseResult: body.lighthouseResult,
        note: 'Used the small shared anonymous PSI quota — get your own key (see README) for reliable repeated use.',
      }), args, url);
    } catch (err) {
      attempts.push(`psi-api-anonymous: ${err.message}${err.reason ? ` (${err.reason})` : ''}`);
    }
  }

  // Tier 4: manual.
  console.log(JSON.stringify({
    automated: false,
    url,
    strategy: args.strategy,
    attemptsFailed: attempts,
    manualFallback: [
      `1. Open https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=${args.strategy}`,
      '2. Run the analysis, then click the "..." menu (top right of the report) → "Save as JSON".',
      `3. Save the downloaded file to: ${args.out || defaultOutPath(url, args.strategy)}`,
      '   (wrap it as { "meta": {...}, "lighthouseResult": <the JSON you saved> } — or just pass the raw',
      '    PSI export straight to diagnose.cjs, it detects and unwraps a bare lighthouseResult automatically)',
      '4. Then run: node diagnose.cjs <that path>',
    ],
  }, null, 2));
}

function emit(normalized, args, url) {
  const outPath = args.out || defaultOutPath(url, normalized.meta.strategy);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(normalized, null, 2));
  console.log(JSON.stringify({
    automated: true,
    source: normalized.meta.source,
    url: normalized.meta.url,
    strategy: normalized.meta.strategy,
    savedTo: outPath,
    note: normalized.meta.note,
  }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ automated: false, error: err.message }));
  process.exit(1);
});
