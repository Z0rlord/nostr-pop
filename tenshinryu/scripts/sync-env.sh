#!/usr/bin/env bash
# Write production .env for tenshinryu on relay-2 from Doppler.
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
OUT="${1:-/tmp/tenshinryu.env}"
python3 <<'PY' > "$OUT"
import json
import re
import subprocess
import urllib.request


def get(name: str) -> str:
    r = subprocess.run(
        ["doppler", "secrets", "get", name, "--project", "dojopop", "--config", "prd_zorie", "--plain"],
        capture_output=True,
        text=True,
        check=True,
    )
    return r.stdout.rstrip("\n")


def firebase_web_config(sa_json: str) -> dict:
    """Source of truth for public Firebase keys (Doppler can drift)."""
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
    """Use Neon pooler endpoint — more reliable from Docker/VPS than direct."""
    if "-pooler" in url:
        out = url
    else:
        out = re.sub(r"(@ep-[^/]+)(\.ap-)", r"\1-pooler\2", url)
    if "connect_timeout=" not in out:
        out += "&connect_timeout=15" if "?" in out else "?connect_timeout=15"
    return out


def firebase_auth_domain() -> str:
    """Prefer custom auth.tenshinryu.xyz once DNS + Firebase custom domain are verified."""
    try:
        custom = get("TENSHINRYU_FIREBASE_AUTH_DOMAIN").strip()
        if custom and "PLACEHOLDER" not in custom:
            return custom.replace("https://", "").replace("http://", "").rstrip("/")
    except Exception:
        pass
    try:
        doppler_domain = get("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN").strip()
        if doppler_domain and "PLACEHOLDER" not in doppler_domain:
            return doppler_domain.replace("https://", "").replace("http://", "").rstrip("/")
    except Exception:
        pass
    return "dojopop.firebaseapp.com"


def paypal(name: str, default: str) -> str:
    try:
        v = get(name)
        return v if v else default
    except Exception:
        return default


sa_json = get("FIREBASE_SERVICE_ACCOUNT_JSON")
fb = firebase_web_config(sa_json)

_auth_domain = firebase_auth_domain()
keys = {
    "NODE_ENV": "production",
    "NEXT_PUBLIC_APP_URL": "https://tenshinryu.xyz",
    "DATABASE_URL": neon_pooler_url(get("TENSHINRYU_DATABASE_URL")),
    "NEXT_PUBLIC_FIREBASE_API_KEY": get("NEXT_PUBLIC_FIREBASE_API_KEY"),
    "TENSHINRYU_FIREBASE_AUTH_DOMAIN": _auth_domain,
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN": _auth_domain,
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID": fb.get("projectId") or get("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET": fb.get("storageBucket") or get("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": fb.get("messagingSenderId")
    or get("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    "NEXT_PUBLIC_FIREBASE_APP_ID": fb.get("appId") or get("NEXT_PUBLIC_FIREBASE_APP_ID_"),
    "FIREBASE_SERVICE_ACCOUNT_JSON": sa_json,
}
try:
    keys["SUPERADMIN_KEY"] = get("SUPERADMIN_KEY")
except Exception:
    pass
try:
    keys["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"] = get("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
except Exception:
    pass

keys.update(
    {
        "PAYPAL_MODE": paypal("PAYPAL_MODE", "sandbox"),
        "PAYPAL_CLIENT_ID": paypal("PAYPAL_CLIENT_ID", "PLACEHOLDER_CLIENT_ID"),
        "PAYPAL_CLIENT_SECRET": paypal("PAYPAL_CLIENT_SECRET", "PLACEHOLDER_CLIENT_SECRET"),
        "NEXT_PUBLIC_PAYPAL_CLIENT_ID": paypal("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "PLACEHOLDER_CLIENT_ID"),
        "PAYPAL_WEBHOOK_ID": paypal("PAYPAL_WEBHOOK_ID", "WH-PLACEHOLDER-WEBHOOK"),
        "PAYPAL_PLAN_GOLD": paypal("PAYPAL_PLAN_GOLD", "P-PLACEHOLDER-GOLD"),
        "PAYPAL_PLAN_ROYAL": paypal("PAYPAL_PLAN_ROYAL", "P-PLACEHOLDER-ROYAL"),
    }
)

lines = []
for k, v in keys.items():
    if k == "FIREBASE_SERVICE_ACCOUNT_JSON":
        esc = v.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'{k}="{esc}"')
    else:
        lines.append(f"{k}={v}")
print("\n".join(lines))
PY
chmod 600 "$OUT"
echo "Wrote $OUT"
