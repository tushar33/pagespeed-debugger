#!/usr/bin/env node
'use strict';
/**
 * Turns a saved Lighthouse report (from collect.cjs, the PSI web UI export,
 * or a raw `lighthouse --output=json` file) into a ranked, human-readable
 * bottleneck breakdown. Works on any site's report — nothing here is
 * project-specific.
 *
 * Usage: node diagnose.cjs <path-to-report.json>
 */
const fs = require('fs');

const CORE_METRICS = [
  ['largest-contentful-paint', 'LCP'],
  ['first-contentful-paint', 'FCP'],
  ['total-blocking-time', 'TBT'],
  ['cumulative-layout-shift', 'CLS'],
  ['speed-index', 'SI'],
  ['interactive', 'TTI'],
  ['max-potential-fid', 'Max Potential FID'],
];

// Audits worth calling out explicitly when present, beyond the generic
// opportunities/diagnostics sweep below.
const SPOTLIGHT_AUDITS = [
  'largest-contentful-paint-element',
  'lcp-lazy-loaded',
  'prioritize-lcp-image',
  'render-blocking-resources',
  'server-response-time',
  'third-party-summary',
  'font-display',
  'critical-request-chains',
];

function loadReport(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  // Accept: collect.cjs's { meta, lighthouseResult } shape, a raw PSI API
  // body ({ lighthouseResult }), or a bare Lighthouse report (has `audits`).
  if (raw.lighthouseResult) return { meta: raw.meta || null, lh: raw.lighthouseResult };
  if (raw.audits) return { meta: null, lh: raw };
  throw new Error('Unrecognized report shape — expected {lighthouseResult}, {meta,lighthouseResult}, or a raw Lighthouse report with .audits');
}

function fmtItem(item) {
  const parts = [];
  if (item.url) parts.push(item.url.length > 90 ? item.url.slice(0, 87) + '...' : item.url);
  if (item.wastedBytes) parts.push(`${Math.round(item.wastedBytes / 1024)} KiB wasted`);
  if (item.wastedMs) parts.push(`${Math.round(item.wastedMs)} ms wasted`);
  if (item.total !== undefined) parts.push(`${Math.round(item.total)} ms total`);
  return parts.join(' — ') || JSON.stringify(item).slice(0, 120);
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node diagnose.cjs <path-to-report.json>');
    process.exit(1);
  }

  const { meta, lh } = loadReport(filePath);
  const audits = lh.audits || {};
  const perfCategory = lh.categories && lh.categories.performance;

  console.log('='.repeat(70));
  if (meta) {
    console.log(`URL:        ${meta.url}`);
    console.log(`Strategy:   ${meta.strategy}`);
    console.log(`Source:     ${meta.source}`);
    console.log(`Collected:  ${meta.collectedAt}`);
  } else {
    console.log(`URL:        ${lh.requestedUrl || lh.finalUrl || '(unknown — no meta block)'}`);
  }
  if (perfCategory) console.log(`Perf score: ${Math.round(perfCategory.score * 100)} / 100`);
  console.log('='.repeat(70));

  console.log('\n-- Core Web Vitals / metrics --');
  for (const [id, label] of CORE_METRICS) {
    const a = audits[id];
    if (!a) continue;
    const flag = a.score !== null && a.score < 0.5 ? ' ⚠' : a.score !== null && a.score < 0.9 ? ' ~' : '';
    console.log(`  ${label.padEnd(20)} ${String(a.displayValue || '').padEnd(12)}${flag}`);
  }

  console.log('\n-- Spotlight audits --');
  for (const id of SPOTLIGHT_AUDITS) {
    const a = audits[id];
    if (!a) continue;
    console.log(`  [${id}] score=${a.score} ${a.displayValue || ''}`);
    if (a.details && Array.isArray(a.details.items)) {
      a.details.items.slice(0, 3).forEach((item) => console.log(`    - ${fmtItem(item)}`));
    }
  }

  console.log('\n-- Ranked opportunities & diagnostics (worst first) --');
  if (perfCategory && Array.isArray(perfCategory.auditRefs)) {
    const findings = perfCategory.auditRefs
      .filter((r) => r.group === 'load-opportunities' || r.group === 'diagnostics')
      .map((r) => ({ ref: r, audit: audits[r.id] }))
      .filter((x) => x.audit && x.audit.score !== null && x.audit.score < 1)
      .sort((a, b) => a.audit.score - b.audit.score);

    if (findings.length === 0) {
      console.log('  (none flagged — this run scored well on every opportunity/diagnostic audit)');
    }
    for (const { ref, audit } of findings) {
      console.log(`\n  [score ${audit.score}] ${ref.id} — ${audit.displayValue || audit.title || ''}`);
      if (audit.details && Array.isArray(audit.details.items)) {
        audit.details.items.slice(0, 5).forEach((item) => console.log(`    - ${fmtItem(item)}`));
      }
    }
  }

  console.log('\n-- Quick read --');
  const lcp = audits['largest-contentful-paint'];
  const fcp = audits['first-contentful-paint'];
  const tbt = audits['total-blocking-time'];
  if (lcp && fcp && lcp.numericValue && fcp.numericValue) {
    const gapMs = lcp.numericValue - fcp.numericValue;
    if (gapMs > 4000) {
      console.log(`  FCP→LCP gap is ${Math.round(gapMs)}ms — the page paints something quickly, but the`);
      console.log('  actual LCP element shows up much later. Usual causes: LCP element only resolves after');
      console.log('  a client-side data fetch (not discoverable in initial HTML), heavy main-thread JS');
      console.log('  blocking the render, or the LCP resource itself is oversized/slow to fetch+decode.');
    }
  }
  if (tbt && tbt.numericValue > 300) {
    console.log(`  Total Blocking Time is ${tbt.displayValue} — main-thread JS is busy long enough to delay`);
    console.log('  interactivity and can push back paint timing too. Check bootup-time / mainthread-work-breakdown above.');
  }
}

main();
