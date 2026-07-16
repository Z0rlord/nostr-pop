#!/usr/bin/env python3
"""Enable Email/Password sign-in in Firebase Authentication."""
import json
import os
import sys

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account


def main() -> int:
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if not raw:
        print("FIREBASE_SERVICE_ACCOUNT_JSON required", file=sys.stderr)
        return 1

    sa = json.loads(raw)
    creds = service_account.Credentials.from_service_account_info(
        sa, scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    creds.refresh(Request())
    headers = {
        "Authorization": f"Bearer {creds.token}",
        "Content-Type": "application/json",
    }
    project = sa.get("project_id", "dojopop")

    r = requests.patch(
        f"https://identitytoolkit.googleapis.com/v2/projects/{project}/config"
        "?updateMask=signIn.email.enabled,signIn.email.passwordRequired",
        headers=headers,
        json={"signIn": {"email": {"enabled": True, "passwordRequired": True}}},
        timeout=30,
    )
    r.raise_for_status()
    email = r.json().get("signIn", {}).get("email", {})
    print("Email/password sign-in enabled:", email.get("enabled"))
    print("passwordRequired:", email.get("passwordRequired"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
