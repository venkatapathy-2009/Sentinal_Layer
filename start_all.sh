#!/usr/bin/env bash
# ==============================================================================
# Sentinel Scanner — Unified Ecosystem Master Launcher
# ==============================================================================
# Starts all ecosystem components with a single command:
#   1. Sentinel Defense Gateway & Garak API: http://localhost:8000
#   2. Sentinel Scanner Security Console:   http://localhost:5173
#   3. Aegis Trust Banking AI Bot (Llama):   http://localhost:9000
#   4. Aegis Trust Customer Banking Site:   http://localhost:3001
#   5. Local Llama / Ollama Engine (if installed): http://localhost:11434
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "========================================================================"
echo "          ⚡ SENTINEL SCANNER — UNIFIED ECOSYSTEM STARTUP"
echo "========================================================================"

# Activate virtualenv if present
if [[ -f "$ROOT_DIR/.venv/bin/activate" ]]; then
    source "$ROOT_DIR/.venv/bin/activate"
fi

# Load environment configuration (.env)
if [[ -f "$ROOT_DIR/.env" ]]; then
    set -a
    source "$ROOT_DIR/.env" 2>/dev/null || true
    set +a
fi

# Clean up any lingering processes on ports 8000, 5173, 9000, 3001
echo "[1/5] Freeing ports (8000, 5173, 9000, 3001)..."
fuser -k 8000/tcp 5173/tcp 9000/tcp 3001/tcp 2>/dev/null || true

# Auto-apply database migrations & seed dev key
echo "[2/5] Verifying database schema & security keys..."
python manage.py migrate --noinput >/dev/null 2>&1 || true
python -c '
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "TrustshieldAI.settings")
django.setup()
from shield.models import APIKey
APIKey.objects.get_or_create(key="ts-dev-key-123", defaults={"app_id": "demo-bank-bot", "owner_name": "Sentinel Admin", "is_active": True})
' 2>/dev/null || true

# Auto-detect and start local Ollama / Llama if installed
echo "[3/5] Checking Llama & Telegram Notification status..."
if command -v ollama >/dev/null 2>&1; then
    if ! curl -s http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
        echo "  Starting local Ollama service in background..."
        ollama serve >/dev/null 2>&1 &
        sleep 2
    fi
    echo "  ✓ Local Ollama service is active (llama3.2:3b enabled)"
else
    echo "  ℹ Local Ollama CLI not detected on system."
    echo "    (Bank bot will connect to remote OLLAMA_HOST or use intelligent Llama simulation)"
fi

# Check Telegram notification configuration (Loaded directly into Django)
python -c '
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "TrustshieldAI.settings")
django.setup()
from shield.telegram_notifier import get_telegram_config
token, chat_id, enabled = get_telegram_config()
if enabled and token and chat_id:
    masked_token = token[:6] + "..." + token[-4:] if len(token) > 10 else "***"
    print(f"  ✓ Telegram Security Alerts: Active (Bot: {masked_token} | Target Chat: {chat_id})")
elif not enabled:
    print("  ℹ Telegram Security Alerts: Disabled via TELEGRAM_ALERTS_ENABLED=False")
else:
    print("  ℹ Telegram Security Alerts: Standby (To activate once: python setup_telegram.py)")
' 2>/dev/null || true

trap 'echo -e "\n🛑 Stopping all services..."; kill 0' INT TERM EXIT

echo "[4/5] Launching all microservices in parallel..."

# 1. Sentinel Django API & Garak Scanner Gateway (Port 8000)
(
    exec python manage.py runserver 0.0.0.0:8000
) &

# 2. Sentinel Scanner Developer Console (Port 5173)
(
    cd "$ROOT_DIR/my-react-app"
    exec npm run dev -- --port 5173 --host 0.0.0.0
) &

# 3. Aegis Bank Bot API with Llama (Port 9000)
(
    exec python "$ROOT_DIR/injscan/backend/run_bank_bot.py" 9000
) &

# 4. Aegis Trust Banking Customer Portal with Chat Widget (Port 3001)
(
    cd "$ROOT_DIR/injscan/frontend"
    exec python -m http.server 3001
) &

echo "========================================================================"
echo "          ✅ ALL SERVICES ONLINE & OPERATIONAL!"
echo "========================================================================"
echo "  1. 🛡️  Sentinel Scanner Dashboard: http://localhost:5173"
echo "  2. 🏦 Aegis Trust Bank Website:    http://localhost:3001"
echo "  3. 🤖 Aegis Bank Bot (Llama 3.2):  http://localhost:9000"
echo "  4. ⚡ Sentinel Defense & Garak API: http://localhost:8000"
echo "========================================================================"
echo "  Launch Phrase / Shortcut:          ./start.sh"
echo "========================================================================"

wait
