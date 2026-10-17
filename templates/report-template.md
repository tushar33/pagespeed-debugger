# PageSpeed / Core Web Vitals Report — {{URL}}

**Date:** {{DATE}}
**Strategy:** {{mobile|desktop}}
**Source:** {{psi-api (key) | psi-api (anonymous) | local-lighthouse | manual}}

## Scores

Lighthouse scores LCP/FCP/TBT/Speed Index against different curves for
mobile vs desktop (desktop is held to stricter raw numbers) — use the table
matching `{{strategy}}` for this run. CLS and the overall performance-score
bands are the same for both. Verify against the current Lighthouse scoring
docs if these have drifted since a Lighthouse version bump.

| Metric | Value | Mobile threshold | Desktop threshold |
|---|---|---|---|
| Performance score | {{score}}/100 | ≥90 good, 50-89 needs improvement, <50 poor | (same) |
| LCP | {{value}} | ≤2.5s good, ≤4s needs improvement | ≤1.2s good |
| FCP | {{value}} | ≤1.8s good | ≤0.9s good |
| TBT | {{value}} | ≤200ms good | ≤150ms good |
| CLS | {{value}} | ≤0.1 good | (same) |
| Speed Index | {{value}} | ≤3.4s good | ≤1.3s good |

## FCP → LCP gap

{{gap in ms}} — {{note if large: LCP element likely resolves after a client-side
data fetch / is blocked by main-thread JS / is an oversized resource}}

## Top findings (ranked by diagnose.cjs, worst first)

1. **{{audit id}}** — {{displayValue}}
   - {{top wasteful items}}
   - Likely owner: {{frontend bundle / image pipeline / third-party script / infra}}
   - Suggested fix: {{...}}

## Comparison (if before/after or two URLs)

| Metric | Before/A | After/B | Delta |
|---|---|---|---|
| Perf score | | | |
| LCP | | | |
| TBT | | | |

## Recommendation

{{one paragraph: what to fix first, expected impact, effort}}

## Raw data

- Report A: `{{path under reports/pagespeed-debugger/raw/}}`
- Report B (if compared): `{{path}}`
