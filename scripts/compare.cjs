#!/usr/bin/env node
'use strict';
/**
 * Compares two saved reports (both produced by collect.cjs, or any mix of
 * PSI-shaped JSON) — same URL before/after a fix, or two different URLs.
 *
 * Usage: node compare.cjs <reportA.json> <reportB.json>
 */
const fs = require('fs');

// noiseFloor: deltas smaller than this are run-to-run jitter, not a real
// change — Lighthouse lab metrics vary a few % between identical runs.
const METRICS = [
  ['largest-contentful-paint', 'LCP', 'ms', true, 200],
  ['first-contentful-paint', 'FCP', 'ms', true, 100],
  ['total-blocking-time', 'TBT', 'ms', true, 100],
  ['cumulative-layout-shift', 'CLS', '', true, 0.01],
  ['speed-index', 'SI', 'ms', true, 200],
];

function loadReport(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const lh = raw.lighthouseResult || raw;
  const label = (raw.meta && `${raw.meta.url} (${raw.meta.strategy}, ${raw.meta.source})`) || lh.requestedUrl || filePath;
  return { lh, label };
}

function main() {
  const [pathA, pathB] = process.argv.slice(2);
  if (!pathA || !pathB) {
    console.error('Usage: node compare.cjs <reportA.json> <reportB.json>');
    process.exit(1);
  }

  const a = loadReport(pathA);
  const b = loadReport(pathB);

  console.log(`A: ${a.label}`);
  console.log(`B: ${b.label}`);
  console.log('');

  const scoreA = a.lh.categories && a.lh.categories.performance && Math.round(a.lh.categories.performance.score * 100);
  const scoreB = b.lh.categories && b.lh.categories.performance && Math.round(b.lh.categories.performance.score * 100);
  console.log(`Perf score:  A=${scoreA}  B=${scoreB}  delta=${scoreB - scoreA >= 0 ? '+' : ''}${scoreB - scoreA}`);
  console.log('');

  console.log('Metric'.padEnd(8) + 'A'.padEnd(14) + 'B'.padEnd(14) + 'Delta');
  console.log('-'.repeat(50));
  for (const [id, label, unit, lowerIsBetter, noiseFloor] of METRICS) {
    const auditA = a.lh.audits && a.lh.audits[id];
    const auditB = b.lh.audits && b.lh.audits[id];
    if (!auditA || !auditB) continue;
    const valA = auditA.numericValue;
    const valB = auditB.numericValue;
    const delta = valB - valA;
    const withinNoise = Math.abs(delta) < noiseFloor;
    const better = !withinNoise && (lowerIsBetter ? delta < 0 : delta > 0);
    const worse = !withinNoise && (lowerIsBetter ? delta > 0 : delta < 0);
    const flag = better ? ' ✓ improved' : worse ? ' ✗ regressed' : withinNoise ? ' (within run-to-run noise)' : '';
    console.log(
      label.padEnd(8) +
      String(auditA.displayValue || valA).padEnd(14) +
      String(auditB.displayValue || valB).padEnd(14) +
      `${delta >= 0 ? '+' : ''}${Math.round(delta)}${unit}${flag}`
    );
  }
}

main();
