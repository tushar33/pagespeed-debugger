# PageSpeed / Core Web Vitals Report — {{URL}}

**Date:** {{DATE}}
**Strategy:** {{mobile|desktop}}
**Source:** {{psi-api (key) | psi-api (anonymous) | local-lighthouse | manual}}

## Scores

| Metric | Value | Threshold |
|---|---|---|
| Performance score | {{score}}/100 | ≥90 good, 50-89 needs improvement, <50 poor |
| LCP | {{value}} | ≤2.5s good, ≤4s needs improvement |
| FCP | {{value}} | ≤1.8s good |
| TBT | {{value}} | ≤200ms good |
| CLS | {{value}} | ≤0.1 good |
| Speed Index | {{value}} | ≤3.4s good |

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
