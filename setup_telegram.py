#!/usr/bin/env python3
"""
setup_telegram.py
=================
One-Time Telegram Security Alert Setup for Sentinel Scanner.

Saves your Telegram credentials permanently in the local .env file:
    TELEGRAM_BOT_TOKEN=...
    TELEGRAM_CHAT_ID=...
    TELEGRAM_ALERTS_ENABLED=True

After running this ONCE, you never need to run setup again.
Simply launch the entire project with:
    ./start.sh
"""

import os
import sys
import argparse
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
ENV_PATH = ROOT_DIR / ".env"

# Add project root to sys.path so we can use verify_telegram_connection
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from shield.telegram_notifier import verify_telegram_connection
except Exception:
    # Standalone fallback if Django settings are uninitialized
    def verify_telegram_connection(bot_token, chat_id):
        import urllib.request, json
        try:
            url = f"https://api.telegram.org/bot{bot_token}/getMe"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if not data.get("ok"):
                    return False, "Telegram API returned not OK"
                username = data.get("result", {}).get("username", "Bot")
            
            # Send test message
            send_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = json.dumps({
                "chat_id": chat_id,
                "text": "🛡️ <b>Sentinel Scanner Telegram Integration Verified!</b>\nAll attacks will now alert here automatically.",
                "parse_mode": "HTML"
            }).encode("utf-8")
            send_req = urllib.request.Request(send_url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(send_req, timeout=6) as resp:
                return resp.status == 200, f"Verified bot @{username} and sent test alert."
        except Exception as e:
            return False, str(e).replace(bot_token, "[REDACTED]")


def read_env_file():
    """Reads the current .env into a dictionary and line list."""
    if not ENV_PATH.exists():
        return {}, []

    lines = ENV_PATH.read_text(encoding="utf-8").splitlines()
    data = {}
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            k, v = stripped.split("=", 1)
            data[k.strip()] = v.strip().strip("'\"")
    return data, lines


def save_credentials_to_env(bot_token: str, chat_id: str, alerts_enabled: bool = True):
    """Updates or appends Telegram credentials in .env without disturbing other settings."""
    data, lines = read_env_file()

    new_keys = {
        "TELEGRAM_BOT_TOKEN": f"'{bot_token}'",
        "TELEGRAM_CHAT_ID": f"'{chat_id}'",
        "TELEGRAM_ALERTS_ENABLED": "True" if alerts_enabled else "False",
    }

    updated_keys = set()
    new_lines = []

    for line in lines:
        stripped = line.strip()
        matched_key = None
        for key in new_keys:
            if stripped.startswith(f"{key}=") or stripped.startswith(f"export {key}="):
                matched_key = key
                break

        if matched_key:
            new_lines.append(f"{matched_key}={new_keys[matched_key]}")
            updated_keys.add(matched_key)
        else:
            new_lines.append(line)

    # Append any keys that weren't already in .env
    for key, val in new_keys.items():
        if key not in updated_keys:
            new_lines.append(f"{key}={val}")

    ENV_PATH.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


def mask_token(token: str) -> str:
    """Masks bot token for safe display (e.g. 12345****:****)."""
    if not token or len(token) < 10:
        return "[NOT SET]"
    return f"{token[:8]}...{token[-4:]}"


def main():
    parser = argparse.ArgumentParser(description="One-time Sentinel Scanner Telegram Setup")
    parser.add_argument("--token", help="Telegram Bot Token from @BotFather")
    parser.add_argument("--chat-id", help="Telegram Chat ID (Personal or Group)")
    parser.add_argument("--test", action="store_true", help="Send a test alert using current credentials in .env")
    parser.add_argument("--disable", action="store_true", help="Disable Telegram alerts in .env")
    args = parser.parse_args()

    print("=" * 72)
    print("      🛡️  SENTINEL SCANNER — ONE-TIME TELEGRAM SETUP")
    print("=" * 72)

    current_env, _ = read_env_file()
    existing_token = current_env.get("TELEGRAM_BOT_TOKEN", "")
    existing_chat = current_env.get("TELEGRAM_CHAT_ID", "")

    if args.disable:
        save_credentials_to_env(existing_token, existing_chat, alerts_enabled=False)
        print("✓ Telegram alerts have been DISABLED in .env.")
        return

    # Check for test mode
    if args.test:
        if not existing_token or not existing_chat:
            print("❌ No Telegram credentials found in .env to test.")
            sys.exit(1)
        print(f"Testing existing credentials from .env:")
        print(f"  Bot Token: {mask_token(existing_token)}")
        print(f"  Chat ID:   {existing_chat}")
        ok, msg = verify_telegram_connection(existing_token, existing_chat)
        if ok:
            print(f"  ✓ {msg}")
        else:
            print(f"  ❌ {msg}")
        return

    # Token & Chat ID resolution
    token = args.token or existing_token
    chat_id = args.chat_id or existing_chat

    if not token or not chat_id:
        if sys.stdin.isatty():
            print("\nPlease provide your Telegram Bot credentials (from @BotFather):")
            if not token:
                token = input("1. Enter Telegram Bot Token: ").strip()
            if not chat_id:
                chat_id = input("2. Enter Telegram Chat ID:   ").strip()
        else:
            print("❌ Telegram credentials required. Run with:")
            print("   python setup_telegram.py --token <YOUR_TOKEN> --chat-id <YOUR_CHAT_ID>")
            sys.exit(1)

    if not token or not chat_id:
        print("❌ Error: Both Telegram Bot Token and Chat ID are required.")
        sys.exit(1)

    print(f"\n[1/2] Verifying credentials with Telegram Bot API...")
    ok, verify_msg = verify_telegram_connection(token, chat_id)
    if not ok:
        print(f"⚠️  Verification warning: {verify_msg}")
        print("    Saving credentials to .env anyway (you can update or re-test anytime).")
    else:
        print(f"  ✓ {verify_msg}")

    print(f"[2/2] Permanently saving configuration to local .env...")
    save_credentials_to_env(token, chat_id, alerts_enabled=True)

    print("\n" + "=" * 72)
    print("  ✅ ONE-TIME TELEGRAM SETUP COMPLETE!")
    print("=" * 72)
    print(f"  Configured Bot:  {mask_token(token)}")
    print(f"  Target Chat:    {chat_id}")
    print(f"  Stored in:      {ENV_PATH}")
    print("=" * 72)
    print("  YOU NEVER NEED TO RUN THIS SETUP AGAIN.")
    print("  To start the entire project, simply run:")
    print("      ./start.sh")
    print("========================================================================")


if __name__ == "__main__":
    main()

