#!/usr/bin/env python3
"""Rename Firebase web app + ensure Tenshinryu auth domains."""
import json
import os
import sys

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

APP = "projects/dojopop/webApps/1:1074321976236:web:444cb8ee93aecdccd7e809"
DOMAINS = ["tenshinryu.xyz", "www.tenshinryu.xyz", "kiwami.tenshinryu.xyz", "localhost"]


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
    h = {"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json"}
    project = sa.get("project_id", "dojopop")

    r = requests.patch(
        f"https://firebase.googleapis.com/v1beta1/{APP}?updateMask=displayName",
        headers=h,
        json={"displayName": "Tenshinryu KIWAMI"},
        timeout=30,
    )
    print("Web app name:", r.status_code, r.json().get("displayName") if r.ok else r.text[:200])

    r_proj = requests.patch(
        f"https://firebase.googleapis.com/v1beta1/projects/{project}?updateMask=displayName",
        headers=h,
        json={"displayName": "Tenshinryu"},
        timeout=30,
    )
    print(
        "Project name:",
        r_proj.status_code,
        r_proj.json().get("displayName") if r_proj.ok else r_proj.text[:200],
    )

    r2 = requests.get(
        f"https://identitytoolkit.googleapis.com/v2/projects/{project}/config",
        headers=h,
        timeout=30,
    )
    r2.raise_for_status()
    merged = list(dict.fromkeys([*r2.json().get("authorizedDomains", []), *DOMAINS]))
    r3 = requests.patch(
        f"https://identitytoolkit.googleapis.com/v2/projects/{project}/config"
        "?updateMask=authorizedDomains",
        headers=h,
        json={"authorizedDomains": merged},
        timeout=30,
    )
    print("Domains:", r3.status_code)
    if r3.ok:
        print(r3.json().get("authorizedDomains"))

    # OAuth consent screen app name (shows in Google sign-in popup).
    brand_list = requests.get(
        f"https://iap.googleapis.com/v1/projects/{project}/brands",
        headers=h,
        timeout=30,
    )
    if brand_list.ok:
        brands = brand_list.json().get("brands", [])
        for brand in brands:
            name = brand.get("name", "")
            patch = requests.patch(
                f"https://iap.googleapis.com/v1/{name}?updateMask=applicationTitle",
                headers=h,
                json={"applicationTitle": "Tenshinryu ONLINE KIWAMI"},
                timeout=30,
            )
            print("OAuth brand title:", patch.status_code, name)
    else:
        print(
            "OAuth branding: set app name manually at",
            f"https://console.cloud.google.com/auth/branding?project={project}",
        )
        print("(Use “Tenshinryu ONLINE KIWAMI”; custom auth domain: auth.tenshinryu.xyz)")

    return 0 if r.ok and r_proj.ok and r3.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
