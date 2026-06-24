#!/usr/bin/env bash
# Write staging .env for tenshinryu-staging on relay-2 from Doppler.
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
OUT="${1:-/tmp/tenshinryu-staging.env}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-prd_zorie}"
STAGING_URL="${STAGING_URL:-https://staging.tenshinryu.xyz}"
export DOPPLER_CONFIG STAGING_URL

python3 <<'PY' > "$OUT"
import json
import os
import re
import subprocess
import sys
import urllib.request

DOPPLER_CONFIG = os.environ["DOPPLER_CONFIG"]
STAGING_URL = os.environ["STAGING_URL"]


def get(name: str) -> str:
    r = subprocess.run(
        ["doppler", "secrets", "get", name, "--project", "dojopop", "--config", DOPPLER_CONFIG, "--plain"],
        capture_output=True,
        text=True,
        check=True,
    )
    return r.stdout.rstrip("\n")


def get_optional(name: str, default: str = "") -> str:
    try:
        return get(name)
    except Exception:
        return default


def firebase_web_config(sa_json: str) -> dict:
    sa = json.loads(sa_json)
    r = subprocess.run(
        [
            "gcloud",
            "auth",
            "activate-service-account",
            "--key-file=/dev/stdin",
            f"--project={sa.get('project_id', 'dojopop')}",
        ],
        input=sa_json,
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        return {}
    tok = subprocess.run(
        ["gcloud", "auth", "print-access-token"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    project = sa.get("project_id", "dojopop")
    req = urllib.request.Request(
        f"https://firebase.googleapis.com/v1beta1/projects/{project}/webApps",
        headers={"Authorization": f"Bearer {tok}"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        apps = json.load(resp).get("apps", [])
    if not apps:
        return {}
    app_id = apps[0]["appId"]
    req2 = urllib.request.Request(
        f"https://firebase.googleapis.com/v1beta1/projects/{project}/webApps/{app_id}/config",
        headers={"Authorization": f"Bearer {tok}"},
    )
    with urllib.request.urlopen(req2, timeout=30) as resp:
        return json.load(resp)


def neon_pooler_url(url: str) -> str:
    if "-pooler" in url:
        out = url
    else:
        out = re.sub(r"(@ep-[^/]+)(\.ap-)", r"\1-pooler\2", url)
    if "connect_timeout=" not in out:
        out += "&connect_timeout=15" if "?" in out else "?connect_timeout=15"
    return out


def firebase_auth_domain() -> str:
    # Staging uses Firebase default domain unless a staging-specific domain is set.
    custom = get_optional("TENSHINRYU_STAGING_FIREBASE_AUTH_DOMAIN", "").strip()
    if custom and "PLACEHOLDER" not in custom:
        return custom.replace("https://", "").replace("http://", "").rstrip("/")
    return get_optional("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "dojopop.firebaseapp.com").replace(
        "https://", ""
    ).replace("http://", "").rstrip("/")


def paypal(name: str, default: str) -> str:
    v = get_optional(name, default)
    return v if v else default


sa_json = get("FIREBASE_SERVICE_ACCOUNT_JSON")
fb = firebase_web_config(sa_json)
_auth_domain = firebase_auth_domain()

staging_db = get_optional("TENSHINRYU_STAGING_DATABASE_URL", "").strip()
if staging_db:
    database_url = neon_pooler_url(staging_db)
    db_source = "TENSHINRYU_STAGING_DATABASE_URL"
else:
    print(
        "WARN: TENSHINRYU_STAGING_DATABASE_URL not set — using TENSHINRYU_DATABASE_URL (shared with production).",
        file=sys.stderr,
    )
    print(
        "      Create a Neon branch and add TENSHINRYU_STAGING_DATABASE_URL in Doppler before real staging use.",
        file=sys.stderr,
    )
    database_url = neon_pooler_url(get("TENSHINRYU_DATABASE_URL"))
    db_source = "TENSHINRYU_DATABASE_URL (shared)"

keys = {
    "NODE_ENV": "production",
    "APP_ENV": "staging",
    "NEXT_PUBLIC_APP_URL": STAGING_URL,
    "DATABASE_URL": database_url,
    "NEXT_PUBLIC_FIREBASE_API_KEY": get("NEXT_PUBLIC_FIREBASE_API_KEY"),
    "TENSHINRYU_FIREBASE_AUTH_DOMAIN": _auth_domain,
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN": _auth_domain,
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID": fb.get("projectId") or get("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET": fb.get("storageBucket") or get("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": fb.get("messagingSenderId")
    or get("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    "NEXT_PUBLIC_FIREBASE_APP_ID": fb.get("appId") or get("NEXT_PUBLIC_FIREBASE_APP_ID_"),
    "FIREBASE_SERVICE_ACCOUNT_JSON": sa_json,
    "SUPERADMIN_KEY": get_optional("TENSHINRYU_STAGING_SUPERADMIN_KEY", get_optional("SUPERADMIN_KEY", "dev-admin-123")),
    "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY": get_optional("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", ""),
    "PAYPAL_MODE": "sandbox",
    "PAYPAL_CLIENT_ID": paypal("PAYPAL_CLIENT_ID", "PLACEHOLDER_CLIENT_ID"),
    "PAYPAL_CLIENT_SECRET": paypal("PAYPAL_CLIENT_SECRET", "PLACEHOLDER_CLIENT_SECRET"),
    "NEXT_PUBLIC_PAYPAL_CLIENT_ID": paypal("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "PLACEHOLDER_CLIENT_ID"),
    "PAYPAL_WEBHOOK_ID": paypal("PAYPAL_WEBHOOK_ID", "WH-PLACEHOLDER-WEBHOOK"),
    "PAYPAL_PLAN_GOLD": paypal("PAYPAL_PLAN_GOLD", "P-PLACEHOLDER-GOLD"),
    "PAYPAL_PLAN_ROYAL": paypal("PAYPAL_PLAN_ROYAL", "P-PLACEHOLDER-ROYAL"),
    "RESEND_API_KEY": get_optional("RESEND_API_KEY", ""),
    "RESEND_FROM_EMAIL": get_optional("RESEND_FROM_EMAIL", "Tenshinryu <onboarding@resend.dev>"),
}

lines = [f"# Staging env — DB source: {db_source}"]
for k, v in keys.items():
    if not v and k not in ("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "RESEND_API_KEY"):
        continue
    if k == "FIREBASE_SERVICE_ACCOUNT_JSON":
        esc = v.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'{k}="{esc}"')
    else:
        lines.append(f"{k}={v}")
print("\n".join(lines))
PY
chmod 600 "$OUT"
echo "Wrote $OUT (staging → ${STAGING_URL})"
