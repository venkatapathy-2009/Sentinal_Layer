"""
shield/telegram_notifier.py
===========================
Sentinel Scanner — Automated Telegram Security Notification Dispatcher.

Integrates directly into Django:
- Reads credentials once from local .env / django.conf.settings:
    TELEGRAM_BOT_TOKEN
    TELEGRAM_CHAT_ID
    TELEGRAM_ALERTS_ENABLED
- Asynchronously dispatches instant alerts on blocked / malicious payloads.
- Fail-safe: Never blocks the request, never crashes the firewall, never exposes bot token.
"""

import os
import html
import json
import logging
import threading
import urllib.request
import urllib.error
from datetime import datetime, timezone

logger = logging.getLogger("sentinel.telegram")


def get_telegram_config():
    """
    Fetches Telegram configuration cleanly:
    1. Reads directly from local .env (so edits/setup take effect immediately without restart)
    2. Falls back to Django settings and os.environ only if not explicitly defined in .env
    """
    from pathlib import Path
    env_file = Path(__file__).resolve().parent.parent / ".env"

    token = None
    chat_id = None
    enabled = None

    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            s = line.strip()
            if s.startswith("TELEGRAM_BOT_TOKEN="):
                token = s.split("=", 1)[1].strip().strip("'\"")
            elif s.startswith("TELEGRAM_CHAT_ID="):
                chat_id = s.split("=", 1)[1].strip().strip("'\"")
            elif s.startswith("TELEGRAM_ALERTS_ENABLED="):
                val = s.split("=", 1)[1].strip().strip("'\"").lower()
                enabled = val in ("true", "1", "yes", "on")

    if token is None or chat_id is None:
        try:
            from django.conf import settings
            if token is None:
                token = getattr(settings, "TELEGRAM_BOT_TOKEN", "") or os.environ.get("TELEGRAM_BOT_TOKEN", "")
            if chat_id is None:
                chat_id = getattr(settings, "TELEGRAM_CHAT_ID", "") or os.environ.get("TELEGRAM_CHAT_ID", "")
            if enabled is None:
                enabled = getattr(settings, "TELEGRAM_ALERTS_ENABLED", True)
        except Exception:
            token = token or ""
            chat_id = chat_id or ""
            enabled = True if enabled is None else enabled

    return str(token or "").strip(), str(chat_id or "").strip(), (True if enabled is None else bool(enabled))


def _send_telegram_post(bot_token: str, chat_id: str, message_html: str, timeout: int = 5):
    """Low-level synchronous POST to Telegram Bot API with token redaction on error."""
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = json.dumps({
        "chat_id": chat_id,
        "text": message_html,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception as exc:
        # Sanitize exception message to ensure bot_token is NEVER logged or exposed
        err_msg = str(exc)
        if bot_token in err_msg:
            err_msg = err_msg.replace(bot_token, "[REDACTED_BOT_TOKEN]")
        logger.warning(f"[Telegram Alert Notice] Could not deliver alert to Telegram: {err_msg}")
        return False


def format_security_alert_html(
    attack: str,
    reasons: list,
    risk: int = 100,
    app_id: str = "demo-bank-bot",
    verdict: str = "blocked",
    shield_active: bool = True,
    severity: str = "CRITICAL",
) -> str:
    """Formats a clean, executive Telegram security alert with HTML escaping."""
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    is_blocked = (verdict.lower() == "blocked") or shield_active

    status_icon = "🛡️" if is_blocked else "⚠️"
    status_text = "BLOCKED BY SENTINEL FIREWALL" if is_blocked else "VULNERABILITY LEAKED (SHIELD OFF)"
    shield_badge = "ARMED (ON)" if shield_active else "BYPASS (OFF)"

    # Safely escape user inputs for Telegram HTML
    clean_payload = html.escape(str(attack)[:450])
    clean_app = html.escape(str(app_id))
    clean_reasons = []
    for r in (reasons or ["Adversarial threat signature detected"]):
        clean_reasons.append(f"• {html.escape(str(r))}")
    reasons_block = "\n".join(clean_reasons)

    return (
        f"🚨 <b>SENTINEL SCANNER — SECURITY ALERT</b> 🚨\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"{status_icon} <b>Status:</b> <b>{status_text}</b>\n"
        f"🔒 <b>Firewall Mode:</b> <code>{shield_badge}</code>\n"
        f"🎯 <b>Target Application:</b> <code>{clean_app}</code> (Port 9000)\n"
        f"⚠️ <b>Risk Score:</b> <code>{risk}/100</code> ({severity.upper()})\n\n"
        f"📝 <b>Adversarial Prompt Payload:</b>\n"
        f"<pre>{clean_payload}</pre>\n\n"
        f"🔍 <b>Detection Layer Evidence:</b>\n"
        f"{reasons_block}\n\n"
        f"⏱️ <b>Timestamp:</b> {now_utc}\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"<i>Protected in real-time by Sentinel Scanner</i>"
    )


def send_telegram_alert(
    attack: str,
    reasons: list = None,
    risk: int = 100,
    app_id: str = "demo-bank-bot",
    verdict: str = "blocked",
    shield_active: bool = True,
    severity: str = "critical",
):
    """
    Asynchronously sends a Telegram security alert without blocking the Django caller.
    If Telegram credentials are not configured or alerts are disabled, exits silently.
    """
    bot_token, chat_id, enabled = get_telegram_config()
    if not enabled or not bot_token or not chat_id:
        return False

    message_html = format_security_alert_html(
        attack=attack,
        reasons=reasons or [],
        risk=risk,
        app_id=app_id,
        verdict=verdict,
        shield_active=shield_active,
        severity=severity,
    )

    # Dispatch in daemon background thread to keep latency strictly at 0ms for the caller
    worker = threading.Thread(
        target=_send_telegram_post,
        args=(bot_token, chat_id, message_html, 5),
        daemon=True,
        name="telegram-alert-worker"
    )
    worker.start()
    return True


def verify_telegram_connection(bot_token: str, chat_id: str) -> tuple[bool, str]:
    """
    One-time verification helper:
    Validates bot token against api.telegram.org and sends a handshake verification message.
    """
    if not bot_token or not chat_id:
        return False, "Bot token and Chat ID cannot be empty."

    # 1. Test getMe to confirm token is valid
    try:
        url_me = f"https://api.telegram.org/bot{bot_token}/getMe"
        req_me = urllib.request.Request(url_me, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req_me, timeout=6) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if not data.get("ok"):
                return False, f"Telegram API returned not OK: {data}"
            bot_username = data.get("result", {}).get("username", "UnknownBot")
    except Exception as exc:
        err = str(exc).replace(bot_token, "[REDACTED]")
        return False, f"Invalid Bot Token or Telegram API unreachable ({err})"

    # 2. Send verification handshake message
    test_html = (
        f"🛡️ <b>SENTINEL SCANNER — TELEGRAM INTEGRATION VERIFIED</b> 🛡️\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"✅ <b>Bot:</b> @{bot_username}\n"
        f"✅ <b>Chat ID:</b> <code>{chat_id}</code>\n"
        f"✅ <b>Status:</b> One-Time Configuration Complete & Active\n"
        f"⏱️ <b>Time:</b> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"<i>All blocked prompt-injection attacks will now alert here automatically.</i>"
    )

    success = _send_telegram_post(bot_token, chat_id, test_html, timeout=7)
    if success:
        return True, f"Success! Verified bot @{bot_username} and delivered alert to chat {chat_id}."
    else:
        return False, f"Bot @{bot_username} is valid, but message could not be delivered to Chat ID {chat_id}. Ensure you sent /start to your bot."
