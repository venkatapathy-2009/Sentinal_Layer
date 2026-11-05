#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(cd "$ROOT_DIR/.." && pwd)"

echo "Starting InjScan + TrustShield Ecosystem..."

# Check Ollama
if command -v ollama >/dev/null 2>&1; then
    if ! curl -s http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
        echo "Starting local Ollama service in background..."
        ollama serve >/dev/null 2>&1 &
        sleep 2
    fi
fi

trap 'kill 0' INT TERM EXIT

(
  cd "$ROOT_DIR/backend"
  exec python "$ROOT_DIR/backend/run_bank_bot.py" 9000
) &

(
  cd "$PARENT_DIR"
  exec python manage.py runserver 0.0.0.0:8000
) &

(
  cd "$ROOT_DIR/frontend"
  exec python -m http.server 3001
) &

echo "Bank website: http://127.0.0.1:3001"
echo "Bank API (Llama): http://127.0.0.1:9000"
echo "TrustShield Dashboard: http://127.0.0.1:5173"
wait
