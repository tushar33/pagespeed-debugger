# pagespeed-debugger

A [Claude Code](https://claude.com/claude-code) skill that diagnoses real
PageSpeed Insights / Core Web Vitals problems (slow LCP, high TBT, poor CLS,
a low Lighthouse performance score) on a **live URL** — using actual
Lighthouse data, not guesses from reading source code.

**Read-only by default. Never modifies application code and never touches
the target site beyond a normal page request.**

Works on any site, in any project, with any framework — nothing here is
specific to one codebase.

## Why this exists

A live LCP investigation (12+ second LCP on a set of production pages)
started as manual `curl` + one-off scripting against the PageSpeed Insights
API to get real numbers instead of guessing from the code. This skill turns
that into three reusable scripts so the same investigation runs the same
way every time, on any URL, in any project.

## Quick install (one line)

From your project's repo root:

```bash
curl -sL https://raw.githubusercontent.com/tushar33/pagespeed-debugger/main/install.sh | bash
```

This clones the skill into `.claude/skills/pagespeed-debugger` (and drops
the nested `.git`, so it doesn't create a submodule in your project).

## Manual install

Drop this into any project as a Claude Code skill:

```bash
# from your project root
git clone https://github.com/tushar33/pagespeed-debugger.git .claude/skills/pagespeed-debugger
```

(Or `git submodule add` if you want to track upstream changes. Or just copy
the folder if you don't need to pull updates.)

If your project already uses a different skill convention (e.g. a `skills/`
folder + `.claude/commands/` symlinks), place `SKILL.md` wherever your
convention expects it — everything in this repo resolves paths relative to
`SKILL.md`'s own location (`scripts/`, `templates/`, and the optional
`.psi-api-key` file all live next to it), so it works unchanged wherever you
put it.

## How to invoke

```
Use the pagespeed-debugger skill on https://example.com/slow-page
```

```
Use the pagespeed-debugger skill to compare https://example.com/page
before and after today's deploy.
```

```
Use the pagespeed-debugger skill on these 3 URLs, look for a shared cause:
https://example.com/a
https://example.com/b
https://example.com/c
```

Full workflow: [`SKILL.md`](SKILL.md).

## What it does NOT do

- Does not modify application code automatically.
- Does not deploy, invalidate caches, or touch the target site beyond a
  normal page request per audit run.
- Does not require any setup to get useful output — see the tiers below.

## Setup — completely optional, three tiers

**Tier 1 — no setup at all.** `collect.cjs` automatically falls back to
running a real Lighthouse audit locally via `npx lighthouse` (downloads
itself on first use, needs a local Chrome). No account, no key, no quota.
This is the easiest path and is enough for most one-off investigations.

**Tier 2 — a free PageSpeed Insights API key**, for faster/scriptable
repeated runs without spinning up a local Chrome each time, or for field
(real-user CrUX) data alongside lab data:

1. [console.cloud.google.com](https://console.cloud.google.com) → pick or
   create a project (free, no billing card needed for this API).
2. **APIs & Services → Library** → search "PageSpeed Insights API" → **Enable**.
3. **APIs & Services → Credentials → Create Credentials → API key**.
4. Restrict the key to just "PageSpeed Insights API" (Credentials → edit the
   key → API restrictions). Also check **Application restrictions** — if
   it's set to "HTTP referrers" it will reject non-browser calls (curl,
   Node) with a 403 `API_KEY_HTTP_REFERRER_BLOCKED`; set it to "None" or "IP
   addresses" for server-side/CLI use.
5. Use it one of three ways (checked in this order):
   - `export PSI_API_KEY=<key>` (recommended — never touches disk)
   - `node scripts/collect.cjs <url> --key <key>`
   - Save it to `.psi-api-key` next to this skill's own folder (gitignored —
     one key per line, nothing else). Convenience only; prefer the env var.

Default quota with your own key: 25,000 requests/day, 240/100s per user,
400/100s per project. Without a key, requests share Google's small
anonymous bucket and get 429'd easily — that's expected, not a bug, and is
exactly why `collect.cjs` tries local Lighthouse first when no key is set.

**Key rotation:** if a key is ever pasted into chat, Slack, or anywhere
outside a file only you control, treat it as exposed — Cloud Console → that
key → regenerate, or delete and create a new one.

**Tier 3 — fully manual.** If neither of the above is available (no
network for npx, no PSI access at all), `collect.cjs` prints the exact
steps to run [pagespeed.web.dev](https://pagespeed.web.dev) or Chrome
DevTools' Lighthouse panel by hand and save the JSON where `diagnose.cjs`
expects it.

## Scripts

```bash
# Collect a report (tries PSI-with-key -> local Lighthouse -> PSI-anonymous -> manual instructions)
node scripts/collect.cjs <url> [--strategy mobile|desktop] [--key <key>] [--out <path>] [--source auto|psi|lighthouse]

# Turn a saved report into a ranked bottleneck breakdown
node scripts/diagnose.cjs <path-to-report.json>

# Compare two saved reports (before/after, or two URLs)
node scripts/compare.cjs <reportA.json> <reportB.json>
```

Reports are saved by default under `reports/pagespeed-debugger/raw/`
(relative to wherever you run the script from — gitignore this directory in
whatever repo you drop this skill into, it may contain data about
unreleased/internal pages).

Requires Node 18+ (uses global `fetch`). No npm dependencies — plain Node
built-ins only.

## License

MIT — see [LICENSE](LICENSE).
