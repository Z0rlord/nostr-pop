#!/bin/bash
# Recreate .venv-drive with uv + Python 3.11+ (see pyproject.toml)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v uv >/dev/null 2>&1; then
  echo "ERROR: uv not found. Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi

echo "Using $(uv --version)"

rm -rf .venv-drive
UV_PROJECT_ENVIRONMENT=.venv-drive uv sync --python 3.11

echo ""
echo "OK: .venv-drive → $(.venv-drive/bin/python3 --version)"
echo "Test: .venv-drive/bin/python3 scripts/backup-obsidian-to-drive.py --all --dry-run"
