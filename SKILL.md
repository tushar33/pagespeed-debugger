---
name: pagespeed-debugger
description: Use when diagnosing a real PageSpeed Insights / Core Web Vitals problem (slow LCP, high TBT, poor CLS, a low Lighthouse performance score) on a live deployed URL — collects and ranks the actual bottlenecks from real Lighthouse data, works with or without a PSI API key, on any site or framework.
---

You are diagnosing a real-world PageSpeed / Core Web Vitals problem (slow
LCP, high TBT, poor CLS, a low Lighthouse performance score) on a **live,
deployed URL**. This is the live-data counterpart to a static code-review
performance skill — use this one when you need actual Lighthouse numbers
from a real request, not a read of the source.

This skill is project-agnostic. It never assumes a framework, a component
structure, or a specific site. It works on any URL you give it, in any repo
it's copied into.

# CORE SAFETY RULES

- Read-only. Every script here does at most one GET-style request per
  attempt (PSI API call, or a single local Lighthouse audit run against the
  target). Nothing is ever mutated on the target site.
- Never modify application code automatically. You may read code to locate a
  likely cause once a bottleneck is confirmed by live data, but don't edit
  anything unless the user explicitly asks for a fix, and scope the edit to
  exactly what the data supports.
- Don't hammer the target. One audit run per URL per invocation is normal.
  If checking several URLs, run them sequentially, not in a tight loop.
- Treat any API key pasted directly in chat as already exposed — tell the
  user to restrict it (scope to just the PageSpeed Insights API) and, if it
  was ever pasted somewhere more public than the current session, rotate it.
- Never write a key into a file this skill would commit. `.psi-api-key`
  (resolved relative to this file's own folder, wherever it's installed) is
  covered by this repo's `.gitignore` — if you copy this skill into a host
  project, make sure that project's `.gitignore` covers it too before
  creating one.

# HOW IT WORKS — TIERED DATA COLLECTION

`scripts/collect.cjs <url>` tries, in order, until one works:

1. **PSI API with a key** — `PSI_API_KEY` env var, a `.psi-api-key` file next
   to this skill's own folder, or `--key`. Best data (can include real-user
   CrUX field data alongside the lab run). Needs a free Google Cloud API key
   (see README).
2. **Local Lighthouse** (`npx lighthouse`) — no key, no quota, works with
   just Node + a local Chrome. This is the real "no API needed" path — treat
   it as the default for anyone who hasn't set up a PSI key.
3. **PSI API with no key** — Google's small shared anonymous quota. Flaky
   (shared across every anonymous caller worldwide, easily exhausted), tried
   as a last automated attempt.
4. **Manual** — prints exact steps to run PSI or DevTools Lighthouse by hand
   and where to save the JSON so the rest of the pipeline still works on it.

Never ask the user which tier to use — just run `collect.cjs` and let it
fall through. Report which tier actually succeeded (it's in the output) so
the user knows whether the data has field CrUX context or is lab-only.

# WORKFLOW

## Phase 1 — Understand the report
Record: affected URL(s), reported symptom (slow LCP, layout shift, low
score...), whether this is a regression (compare against a known-good prior
state) or a first-time investigation, and the device context that matters
most (mobile is usually the higher-stakes target — Google's default CWV
assessment is mobile-first).

## Phase 2 — Collect
```
node scripts/collect.cjs <url> --strategy mobile
node scripts/collect.cjs <url> --strategy desktop   # only if desktop matters here
```
This saves a normalized report under `reports/pagespeed-debugger/raw/`
(relative to wherever you're running from) and prints which source tier
succeeded. If Phase 1 is a before/after check, collect **both** states —
either two URLs, or the same URL now and again after a deploy — as separate
files so Phase 4 can diff them.

## Phase 3 — Diagnose
```
node scripts/diagnose.cjs <path-from-phase-2>
```
Gives, in order: core Web Vitals with pass/fail flags, spotlight audits
(LCP element identity, whether it's lazy-loaded, render-blocking resources,
server response time, third-party summary), then every opportunity/
diagnostic audit that scored below 1.0, ranked worst-first with the actual
wasteful resources named. Ends with a plain-language read of the FCP→LCP gap
and Total Blocking Time — these two numbers alone usually tell you whether
you're looking at a "JS blocking the main thread" problem or a "resource
itself is late/oversized" problem.

## Phase 4 — Compare (only if relevant)
```
node scripts/compare.cjs <before.json> <after.json>
```
Delta table across the core metrics with improved/regressed flags. Deltas
smaller than realistic Lighthouse run-to-run jitter are called out as noise,
not a false regression — don't over-read a single re-run's small swing.

## Phase 5 — Classify and locate a likely cause
Lighthouse's own audits already do most of the classification work — don't
invent a parallel taxonomy. Map what Phase 3 surfaced to one of these
buckets, then go find the actual code/config responsible:

- **Client-rendered LCP element** — large FCP→LCP gap, `lcp-lazy-loaded` or
  `prioritize-lcp-image` flagged, and the LCP resource URL isn't visible in
  the initial HTML (fetch it and grep). Fix direction: preconnect/preload
  hints, server-render the URL into initial HTML if possible, or at minimum
  `fetchpriority="high"` once resolved client-side.
- **Oversized/unoptimized LCP resource** — the LCP image is large in bytes
  relative to its displayed size, or is served in a legacy format when the
  CDN/pipeline already supports resizing/next-gen formats elsewhere on the
  same page (check for existing `?w=`/size-variant conventions in other
  image URLs on the page — if they exist, this one just isn't using them).
- **Main-thread JS blocking** — high `total-blocking-time`, `bootup-time`,
  `mainthread-work-breakdown`; sizeable `unused-javascript`. Fix direction:
  code-splitting, deferring non-critical scripts (analytics, surveys, chat
  widgets) to idle time, removing duplicate third-party script loads (check
  for the same third-party URL appearing twice in the waste list — that's
  usually an accidental double-init, not a real product need).
- **Server/network latency** — `server-response-time` itself is high, or TTFB
  dominates before any client-side work even starts. Not a frontend-code fix.
- **Layout shift** — `cumulative-layout-shift` audit's shifting elements;
  usually missing explicit image/embed dimensions or content injected above
  existing content after load.

## Phase 6 — Report
Save both a Markdown report (`templates/report-template.md`) and keep the
raw JSON evidence under `reports/pagespeed-debugger/`. State tier used
(field data available or lab-only), confidence (a single Lighthouse run has
real variance — note if a finding should be re-confirmed with a second run
before treating it as certain), and a prioritized fix list (impact vs
effort), not just a list of symptoms.

# INPUT MODES

**Single URL.** Run Phases 1-3, 5-6.

**Regression check (same URL, before vs after a deploy).** Collect both
states, run Phase 4, then Phase 5 only on what's still bad in the "after"
state.

**Two URLs (e.g. a fast reference page vs a slow one on the same site).**
Collect both, diagnose both, compare, and look specifically for what the
slow one does differently (extra third-party script, unresized hero image,
a heavier chunk on that route) rather than generic advice.

**Small list of URLs.** Run the single-URL workflow on each sequentially,
then look for a shared pattern across them (same third-party script on all,
same oversized image source, same template) before proposing one fix that
covers the whole list.

# RELATIONSHIP TO OTHER PERFORMANCE TOOLING

If the host project also has a static code-review performance skill, that
one audits a component/file you hand it for re-renders, bundle-size smells,
and missing lazy-loading — useful before a change ships. This skill audits
what's actually happening on a deployed URL right now — useful for triaging
a live complaint or verifying a fix actually moved the numbers. Use both
together: this skill tells you *what* is slow and *where* (which resource,
which script); the code-review skill helps you find *why* in the source
once you know what to look for.
