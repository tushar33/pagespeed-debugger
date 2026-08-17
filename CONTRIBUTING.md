# Contributing

This is a Claude Code skill: a Markdown instruction file (`SKILL.md`) plus a
set of small, dependency-free Node scripts it calls. Contributions are
welcome.

## Ground rules

- **Read-only by default.** Any new script must not modify the target site,
  and must not write anything outside `reports/` without explicit user
  approval baked into the workflow, not just the script.
- **No new dependencies without a strong reason.** Everything here runs with
  plain Node (`fetch`/`fs`/`path`/`child_process` built-ins). Before adding a
  package, check whether a built-in module can do it.
- **Never invent or hardcode credentials.** The PSI API key stays in an
  environment variable or a gitignored `.psi-api-key` file, loaded via
  `scripts/lib/psi-client.cjs`'s `loadApiKey()`. Never a literal string in a
  script.
- **Project-agnostic.** Nothing in `SKILL.md` or the scripts should assume a
  specific framework, hosting provider, or site. If you're adding something
  that's genuinely site-specific, it belongs in the host project's own
  config/notes, not here.
- **Every path resolves relative to `SKILL.md`'s own folder** (or, for
  output, relative to the caller's working directory under `reports/`) —
  never a hardcoded absolute path — so this skill keeps working no matter
  where it's installed.

## Reporting a bug in the tool itself

Open an issue with: which script, the exact command, and (with any API key
redacted) the output you got vs. expected.

## Adding a new script

- One script, one responsibility (see the existing `scripts/*.cjs` for the
  pattern — CLI wrapper + shared logic in `scripts/lib/`).
- Print JSON to stdout for automated consumption, human-readable diagnostics
  to stdout are fine for `diagnose.cjs`/`compare.cjs` specifically since
  they're meant to be read directly. Errors to stderr, non-zero exit on
  failure.
- Update `SKILL.md` (which phase it belongs to) and `README.md`'s scripts
  table.

## Adding a new classification bucket (Phase 5 in `SKILL.md`)

Ground it in an actual Lighthouse audit id, not a vibe — cite the audit(s)
that would surface it and what values indicate it, the way the existing five
buckets do.

## Code style

- CommonJS (`.cjs`), `'use strict'` at the top of every file.
- No new dependencies (see above).
- Keep functions small and testable by hand (`node scripts/x.cjs <args>`
  should be enough to sanity-check any change — there's no test framework
  here, that's intentional given the size of this project).
