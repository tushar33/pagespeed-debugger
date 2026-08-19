#!/usr/bin/env bash
# Installs the pagespeed-debugger Claude Code skill into the current project.
# Usage (from your project's repo root):
#   curl -sL https://raw.githubusercontent.com/tushar33/pagespeed-debugger/main/install.sh | bash
set -euo pipefail

REPO="https://github.com/tushar33/pagespeed-debugger.git"
DEST=".claude/skills/pagespeed-debugger"

if [ -d "$DEST" ]; then
  echo "$DEST already exists — remove it first if you want to reinstall." >&2
  exit 1
fi

mkdir -p .claude/skills
git clone --depth 1 --quiet "$REPO" "$DEST"
rm -rf "$DEST/.git"

echo "Installed to $DEST."
echo 'Ask Claude Code: "Use the pagespeed-debugger skill on <url>" to get started.'
