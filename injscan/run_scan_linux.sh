#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -x "$ROOT_DIR/.venv/bin/python" ]]; then
  echo "Run ./start_linux.sh first to create the Linux environment."
  exit 1
fi

exec "$ROOT_DIR/.venv/bin/python" "$ROOT_DIR/scanner/scanner.py"
