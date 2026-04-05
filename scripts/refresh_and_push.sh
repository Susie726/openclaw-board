#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

python3 scripts/generate_sample_data.py

git add sample-data.json README.md app.js index.html scripts/

if git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

STAMP=$(date '+%Y-%m-%d')
git commit -m "chore: refresh dashboard data ($STAMP)"
git push
