#!/usr/bin/env python3
"""Pull Obsidian LiveSync CouchDB dump from vol1 and upload to Google Drive."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import importlib.util

# Load helpers from backup-to-drive.py (hyphenated filename)
_drive_script = Path(__file__).resolve().parent / "backup-to-drive.py"
_spec = importlib.util.spec_from_file_location("backup_to_drive", _drive_script)
_mod = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_mod)

DEFAULT_CONFIG = _mod.DEFAULT_CONFIG
ensure_folder = _mod.ensure_folder
get_drive_service = _mod.get_drive_service
load_config = _mod.load_config
upload_file = _mod.upload_file

DEFAULT_VOL1 = "vol1"  # Tailscale via ~/.ssh/config
DEFAULT_DB = "obsidian-vault"
DEFAULT_SSH_KEY = Path.home() / ".ssh/hetzner_key"
DEFAULT_SSH_CONFIG = Path.home() / ".ssh/config"
DEFAULT_SSH_HOST = "vol1"
# CouchDB names to skip (test/junk databases)
EXCLUDE_DB_SUBSTRINGS = ("-test-", "-delete-me")
MIN_DOC_COUNT = 2  # skip metadata-only vaults (1 doc = LiveSync version only)


def fetch_couchdb_dump(
    host: str,
    db: str,
    user: str,
    password: str,
    ssh_key: Path,
) -> tuple[Path, int]:
    """Fetch LiveSync database dump via SSH + curl on vol1."""
    remote_cmd = (
        f"curl -sf -u '{user}:{password}' "
        f"'http://127.0.0.1:5984/{db}/_all_docs?include_docs=true'"
    )
    ssh_cmd = _ssh_command(host, ssh_key, remote_cmd)

    result = subprocess.run(ssh_cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"SSH/curl failed: {result.stderr.strip() or result.stdout.strip()}")

    data = json.loads(result.stdout)
    doc_count = data.get("total_rows", len(data.get("rows", [])))

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    tmp = Path(tempfile.gettempdir()) / f"{db}-{stamp}.json"
    tmp.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return tmp, doc_count


def _ssh_command(host: str, ssh_key: Path, remote_cmd: str) -> list[str]:
    ssh_target = f"root@{host}"
    base = [
        "ssh",
        "-o", "BatchMode=yes",
        "-o", "ConnectTimeout=15",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
    ]
    if DEFAULT_SSH_CONFIG.exists() and not host.replace(".", "").isdigit():
        return [*base, "-F", str(DEFAULT_SSH_CONFIG), host, remote_cmd]
    return [*base, "-i", str(ssh_key), ssh_target, remote_cmd]


def is_vault_database(name: str) -> bool:
    if not name.startswith("obsidian-"):
        return False
    return not any(sub in name for sub in EXCLUDE_DB_SUBSTRINGS)


def get_database_doc_count(host: str, db: str, user: str, password: str, ssh_key: Path) -> int:
    remote_cmd = f"curl -sf -u '{user}:{password}' http://127.0.0.1:5984/{db}"
    result = subprocess.run(_ssh_command(host, ssh_key, remote_cmd), capture_output=True, text=True, check=False)
    if result.returncode != 0:
        return 0
    return int(json.loads(result.stdout).get("doc_count", 0))


def list_obsidian_databases(
    host: str,
    user: str,
    password: str,
    ssh_key: Path,
    *,
    include_empty: bool = False,
) -> list[str]:
    remote_cmd = f"curl -sf -u '{user}:{password}' http://127.0.0.1:5984/_all_dbs"
    result = subprocess.run(_ssh_command(host, ssh_key, remote_cmd), capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"Failed to list databases: {result.stderr.strip()}")
    candidates = sorted(db for db in json.loads(result.stdout) if is_vault_database(db))
    if include_empty:
        return candidates
    vaults = []
    for db in candidates:
        count = get_database_doc_count(host, db, user, password, ssh_key)
        if count >= MIN_DOC_COUNT:
            vaults.append(db)
        else:
            print(f"Skipping {db} ({count} docs — empty or metadata only)", flush=True)
    return vaults


def main() -> int:
    parser = argparse.ArgumentParser(description="Back up Obsidian LiveSync vault to Google Drive")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--host", default=DEFAULT_VOL1, help="vol1 Tailscale IP")
    parser.add_argument("--db", default=DEFAULT_DB, help="CouchDB database name")
    parser.add_argument("--all", action="store_true", help="Back up all obsidian-* vault databases")
    parser.add_argument(
        "--include-empty",
        action="store_true",
        help="Include vaults with only LiveSync metadata (default: skip <2 docs)",
    )
    parser.add_argument("--user", default="admin")
    parser.add_argument("--password", default="changeme")
    parser.add_argument("--ssh-key", type=Path, default=DEFAULT_SSH_KEY)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.all:
        databases = list_obsidian_databases(
            args.host, args.user, args.password, args.ssh_key,
            include_empty=args.include_empty,
        )
        if not databases:
            print("No obsidian-* vault databases found on vol1")
            return 1
        print(f"Vaults to back up: {', '.join(databases)}", flush=True)
    else:
        databases = [args.db]

    if args.dry_run:
        cfg = load_config(args.config)
        folder_id = cfg.get("drive_folder_id", "1nEC-WUSO-t1wLMyFZhBqthYqS0vCQck0")
        print(f"Would upload to Drive folder {folder_id}/obsidian-backups/<db>/")
        for db in databases:
            dump_path, doc_count = fetch_couchdb_dump(
                args.host, db, args.user, args.password, args.ssh_key
            )
            size_kb = dump_path.stat().st_size // 1024
            print(f"  {db}: {doc_count} docs, {size_kb} KB -> {dump_path.name}")
        return 0

    cfg = load_config(args.config)
    folder_id = cfg.get("drive_folder_id")
    service = get_drive_service(cfg)
    backups_root = ensure_folder(service, folder_id, "obsidian-backups")

    for db in databases:
        print(f"Fetching CouchDB dump from {args.host}/{db}...")
        dump_path, doc_count = fetch_couchdb_dump(
            args.host, db, args.user, args.password, args.ssh_key
        )
        size_kb = dump_path.stat().st_size // 1024
        print(f"Dump: {dump_path.name} ({doc_count} docs, {size_kb} KB)")
        if doc_count <= 1:
            print(f"WARNING: {db} looks empty")
        db_folder = ensure_folder(service, backups_root, db)
        result = upload_file(service, db_folder, dump_path)
        print(f"uploaded obsidian-backups/{db}/{dump_path.name} ({result})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
