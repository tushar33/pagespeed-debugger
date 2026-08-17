# Changelog

## 1.0.1 — 2026-08-17

Fixed `diagnose.cjs` missing most findings on Lighthouse 12+ reports.

- Lighthouse 12+ moved almost everything previously under the
  `load-opportunities` audit group into a new `insights` group with renamed
  audit ids (`lcp-breakdown-insight`, `render-blocking-insight`,
  `third-parties-insight`, `image-delivery-insight`, etc.). The ranked sweep
  only checked for `load-opportunities`/`diagnostics`, so on any report from
  Lighthouse 12+ (including current PSI API responses) it silently missed
  16 audits — found running this against a real production homepage.
- `fmtItem()` now formats the nested `table`/`node`/`checklist` detail
  shapes these insight audits use (e.g. `lcp-breakdown-insight`'s four-part
  TTFB/load-delay/load-duration/render-delay breakdown, and
  `lcp-discovery-insight`'s pass/fail checklist) instead of dumping raw
  truncated JSON.
- Added a dedicated formatter for the `{entity, transferSize,
  mainThreadTime}` shape used by `third-parties-insight` (and the older
  `third-party-summary`) so third-party script cost prints as
  `Google Tag Manager — 183 KiB — 200 ms main-thread` instead of raw JSON.
- `SPOTLIGHT_AUDITS` now lists both the pre-12 and 12+ audit ids so this
  works regardless of which Lighthouse version produced the report.

## 1.0.0 — 2026-08-17

Initial release.

- `scripts/collect.cjs` — tiered collection: PSI API with key → local
  Lighthouse (`npx lighthouse`, no key needed) → anonymous PSI → manual
  fallback instructions.
- `scripts/diagnose.cjs` — ranked bottleneck breakdown from a saved report:
  Core Web Vitals, LCP-element/image-optimization spotlight audits, every
  opportunity/diagnostic audit scoring below 1.0 sorted worst-first, and a
  plain-language read of the FCP→LCP gap and Total Blocking Time.
- `scripts/compare.cjs` — before/after or two-URL delta table, with a
  per-metric noise floor so normal Lighthouse run-to-run jitter isn't
  reported as a false regression.
- `SKILL.md` — full workflow (collect → diagnose → compare → classify →
  report), a five-bucket root-cause classification grounded in specific
  Lighthouse audit ids, and core safety rules (read-only, no auto-fixes,
  key-exposure handling).
