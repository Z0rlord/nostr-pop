#!/usr/bin/env python3
"""Add Firebase custom-auth DNS records for auth.tenshinryu.xyz in Cloudflare."""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

ZONE_ID = os.environ.get("TENSHINRYU_ZONE_ID", "8773d460b9cf42569a9c895481c17785")
TOKEN = os.environ.get("CLOUDFLARE_DNS_TOKEN") or os.environ.get("CLOUDFLARE_API_TOKEN")
if not TOKEN:
    print("CLOUDFLARE_DNS_TOKEN required", file=sys.stderr)
    sys.exit(1)

RECORDS = [
    {"type": "CNAME", "name": "auth", "content": "dojopop.web.app"},
    {
        "type": "TXT",
        "name": "_acme-challenge.auth",
        "content": "HEodbVL3_Sk3oFUdWrM1EJahCP8qdpsvuBRSObosTmQ",
    },
]


def cf(method: str, path: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def list_records(name: str) -> list[dict]:
    q = urllib.parse.quote(name) if (urllib := __import__("urllib")) else name
    import urllib.parse

    q = urllib.parse.quote(name)
    out = cf("GET", f"/zones/{ZONE_ID}/dns_records?type=CNAME&name={q}")
    records = out.get("result", [])
    out2 = cf("GET", f"/zones/{ZONE_ID}/dns_records?type=TXT&name={q}")
    records += out2.get("result", [])
    return records


def upsert(record: dict) -> None:
    import urllib.parse

    fqdn = (
        f"{record['name']}.tenshinryu.xyz"
        if record["name"] not in ("@", "tenshinryu.xyz")
        else "tenshinryu.xyz"
    )
    existing = []
    for rtype in ("CNAME", "TXT", "A"):
        try:
            q = urllib.parse.quote(fqdn)
            res = cf("GET", f"/zones/{ZONE_ID}/dns_records?type={rtype}&name={q}")
            existing.extend(res.get("result", []))
        except urllib.error.HTTPError:
            pass

    payload = {
        "type": record["type"],
        "name": record["name"],
        "content": record["content"],
        "proxied": False,
        "ttl": 1,
    }

    for ex in existing:
        if ex["type"] == record["type"]:
            cf("DELETE", f"/zones/{ZONE_ID}/dns_records/{ex['id']}")
            print(f"deleted old {ex['type']} {ex['name']}")

    res = cf("POST", f"/zones/{ZONE_ID}/dns_records", payload)
    if res.get("success"):
        print(f"ok {record['type']} {record['name']} -> {record['content']} (DNS only)")
    else:
        print(f"fail {record}: {res.get('errors')}", file=sys.stderr)
        sys.exit(1)


def main() -> int:
    for rec in RECORDS:
        upsert(rec)
    print("DNS records applied. Firebase may take a few minutes to verify SSL.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
