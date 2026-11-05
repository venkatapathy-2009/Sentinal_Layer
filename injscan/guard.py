import json
import re
import urllib.request
import urllib.error

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

DASHBOARD_URL = "http://127.0.0.1:8000/v1/events"
API_KEY = "ts-dev-key-123"
APP_ID = "demo-bank-bot"

SECRETS = ["ACCT-7731", "910000"]
CODE_PATTERN = re.compile(r"ACCT-\d{3,}")


def inspect_reply(reply):
    """Return leak indicators found in a chatbot reply."""
    reasons = []
    for secret in SECRETS:
        if secret in reply:
            reasons.append(f"secret exposed: {secret}")
    if CODE_PATTERN.search(reply) and not reasons:
        reasons.append("internal account code pattern")
    if reply.lower().count("balance") >= 2:
        reasons.append("bulk customer record dump")
    return reasons


def post_event(attack, verdict, severity, evidence, shield):
    event = {
        "app_id": APP_ID,
        "attack": attack[:500],
        "verdict": verdict,
        "severity": severity,
        "evidence": evidence,
        "shield": shield,
    }
    # 1. Try standard HTTP
    try:
        req = urllib.request.Request(
            DASHBOARD_URL,
            data=json.dumps(event).encode("utf-8"),
            headers={"Content-Type": "application/json", "X-API-Key": API_KEY},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            print("[dashboard]", resp.status)
            return
    except Exception:
        pass

    # 2. Direct Django in-process fallback
    try:
        import os, sys, django
        from pathlib import Path
        project_root = str(Path(__file__).resolve().parent.parent)
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "TrustshieldAI.settings")
        django.setup()
        from django.test import Client
        c = Client()
        res = c.post(
            "/v1/events",
            data=json.dumps(event),
            content_type="application/json",
            HTTP_X_API_KEY=API_KEY
        )
        print("[dashboard]", res.status_code)
    except Exception as exc:
        print("[dashboard] unreachable:", exc)


def stop(attack, reasons):
    evidence = "; ".join(reasons)
    post_event(attack, "blocked", "critical", evidence, "ON")
    print("[guard] BLOCKED:", evidence)
