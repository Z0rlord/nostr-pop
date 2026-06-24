#!/usr/bin/env python3
"""Ensure Google OAuth web client allows auth.tenshinryu.xyz (Firebase custom auth domain)."""
from __future__ import annotations

import json
import subprocess
import sys
import urllib.error
import urllib.request

PROJECT = "dojopop"
PROJECT_NUMBER = "1074321976236"
CLIENT_ID = "1074321976236-erponj27o1o7t0t89t32rqf906quqsg0.apps.googleusercontent.com"
REDIRECT = "https://auth.tenshinryu.xyz/__/auth/handler"
ORIGIN = "https://auth.tenshinryu.xyz"
CONSOLE_URL = (
    "https://console.cloud.google.com/auth/clients/"
    f"{CLIENT_ID.split('.')[0]}?project={PROJECT}"
)


def owner_token() -> str:
    for account in ("zbarber@gmail.com", None):
        cmd = ["gcloud", "auth", "print-access-token"]
        if account:
            cmd[1:1] = ["--account", account]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip()
    print("Run: gcloud auth login zbarber@gmail.com", file=sys.stderr)
    sys.exit(1)


def try_patch_oauth_client(token: str) -> bool:
    """Best-effort via internal OAuth admin API (may 404 on some projects)."""
    url = (
        f"https://content-oauth2.googleapis.com/v1/projects/{PROJECT_NUMBER}"
        f"/oauthClients/{CLIENT_ID.split('.')[0]}"
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "x-goog-user-project": PROJECT,
    }
    try:
        with urllib.request.urlopen(
            urllib.request.Request(url, headers=headers), timeout=30
        ) as resp:
            client = json.load(resp)
    except urllib.error.HTTPError:
        return False

    redirects = list(client.get("redirectUris", []))
    origins = list(client.get("javascriptOrigins", []))
    changed = False
    if REDIRECT not in redirects:
        redirects.append(REDIRECT)
        changed = True
    if ORIGIN not in origins:
        origins.append(ORIGIN)
        changed = True
    if not changed:
        print("OAuth client already includes auth.tenshinryu.xyz")
        return True

    client["redirectUris"] = redirects
    client["javascriptOrigins"] = origins
    req = urllib.request.Request(
        url,
        data=json.dumps(client).encode(),
        method="PUT",
        headers={**headers, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        print("OAuth client updated:", json.load(resp).get("clientId", "ok"))
    return True


def print_manual_steps() -> None:
    print(
        f"""
Could not update OAuth client via API. Add these in Google Cloud Console:

  {CONSOLE_URL}

Under "Authorized JavaScript origins" add:
  {ORIGIN}
  https://tenshinryu.xyz
  http://localhost:3000

Under "Authorized redirect URIs" add:
  {REDIRECT}

Also set OAuth branding app name to "Tenshinryu ONLINE KIWAMI":
  https://console.cloud.google.com/auth/branding?project={PROJECT}
"""
    )


def main() -> int:
    token = owner_token()
    if try_patch_oauth_client(token):
        return 0
    print_manual_steps()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
