# Changelog

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
