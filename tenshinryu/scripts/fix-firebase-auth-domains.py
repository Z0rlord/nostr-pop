#!/usr/bin/env python3
"""Add Tenshinryu hosts to Firebase authorized domains (fixes auth on tenshinryu.xyz)."""
import json
import os
import sys

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

DOMAINS = [
    "tenshinryu.xyz",
    "www.tenshinryu.xyz",
    "kiwami.tenshinryu.xyz",
    "staging.tenshinryu.xyz",
    "auth.tenshinryu.xyz",
    "localhost",
]

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

    r = requests.get(
        f"https://identitytoolkit.googleapis.com/v2/projects/{project}/config",
        headers=headers,
        timeout=30,
    )
    r.raise_for_status()
    current = r.json().get("authorizedDomains", [])
    merged = list(dict.fromkeys([*current, *DOMAINS]))

    r2 = requests.patch(
        f"https://identitytoolkit.googleapis.com/v2/projects/{project}/config"
        "?updateMask=authorizedDomains",
        headers=headers,
        json={"authorizedDomains": merged},
        timeout=30,
    )
    r2.raise_for_status()
    print("Authorized domains:", r2.json().get("authorizedDomains"))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
