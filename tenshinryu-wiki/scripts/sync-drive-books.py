#!/usr/bin/env python3
"""Sync Tenshinryu book files from a Google Drive folder into raw/books/."""

from __future__ import annotations

import argparse
import io
import json
import mimetypes
import sys
import time
from pathlib import Path

import httplib2
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload
from google_auth_httplib2 import AuthorizedHttp

WIKI_ROOT = Path(__file__).resolve().parents[1]
RAW_BOOKS = WIKI_ROOT / "raw" / "books"
RAW_ASSETS = WIKI_ROOT / "raw" / "assets"
DEFAULT_CONFIG = Path.home() / ".config/dojopop/tenshinryu-wiki.json"
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

KATA_FOLDER_MAP = {
    "1面陰": "omokage",
    "2抜合": "nukiai",
    "3抜留": "nukidome",
    "4月影": "makihazushi",
    "5": "yokemigaeshi",
    "6": "sodegaeshi",
    "7": "shihogiri",
    "8": "gyakuto",
    "9": "marukibashi",
    "10": "ninotachigaeshi",
    "11": "karamegaeshi",
    "12": "kesagake-no-koto",
}

KATA_SHORTCUT_NAMES = ("立相勢法十二本",)
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

DEFAULT_SKIP_FOLDERS = {
    "class video",
    "practices",
    "honbu 1-18-25",
    "honbu practice 2-28-26",
    "shinjuku 1-21-25",
    "shogitai 2025 zb",
    "shogitai 24",
    "shogitai 25 kuwami",
    "shogitai enbu 2023 zb",
    "tenshinryu hq 1-25-25",
    "tsr nft elements",
    "yaasukuni 2-22-24",
    "yasukuni 10-19-25",
    "yasukuni jinja 10-24",
    "yasukuni shrine 2026-4-22",
}
DEFAULT_INCLUDE_PATHS = ["TSR Books", "12 Kata", "instructor-3rd-grade"]

EXPORT_MIME = {
    "application/vnd.google-apps.document": ("text/plain", ".txt"),
    "application/vnd.google-apps.spreadsheet": ("text/csv", ".csv"),
    "application/vnd.google-apps.presentation": ("text/plain", ".txt"),
}

TEXT_MIME_PREFIXES = ("text/", "application/pdf")
TEXT_MIME_EXACT = {
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.spreadsheet",
    "application/vnd.google-apps.presentation",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/epub+zip",
}

SKIP_MIME_PREFIXES = ("video/",)
SKIP_MIME_EXACT = {
    "application/vnd.google-apps.folder",
    "application/vnd.google-apps.shortcut",
}


def load_config(path: Path) -> dict:
    if not path.exists():
        example = WIKI_ROOT / "config.example.json"
        raise FileNotFoundError(
            f"Config missing: {path}\nCopy {example} and set drive_books_folder_id"
        )
    return json.loads(path.read_text(encoding="utf-8"))


def get_drive_service(cfg: dict):
    token_path = Path(cfg.get("oauth_token", "~/.config/dojopop/tenshinryu-wiki-drive-token.json")).expanduser()
    if not token_path.exists():
        raise FileNotFoundError(
            f"OAuth token missing: {token_path}\nRun: python3 tenshinryu-wiki/scripts/drive-oauth-setup.py"
        )
    creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            token_path.write_text(creds.to_json(), encoding="utf-8")
        else:
            raise RuntimeError("Token invalid; re-run drive-oauth-setup.py")
    http = httplib2.Http(timeout=300)
    authorized_http = AuthorizedHttp(creds, http=http)
    return build("drive", "v3", http=authorized_http, cache_discovery=False)


def should_skip_folder(name: str, skip_folders: set[str]) -> bool:
    return name.strip().lower() in skip_folders


def list_children(service, folder_id: str, retries: int = 3) -> list[dict]:
    q = f"'{folder_id}' in parents and trashed=false"
    files: list[dict] = []
    page_token = None
    while True:
        for attempt in range(1, retries + 1):
            try:
                res = (
                    service.files()
                    .list(
                        q=q,
                        fields=(
                            "nextPageToken, files(id,name,mimeType,modifiedTime,size,"
                            "shortcutDetails(targetId,targetMimeType))"
                        ),
                        pageSize=200,
                        pageToken=page_token,
                        supportsAllDrives=True,
                        includeItemsFromAllDrives=True,
                    )
                    .execute()
                )
                break
            except Exception as exc:
                if attempt == retries:
                    raise
                print(f"  list retry {attempt}/{retries}: {exc}", file=sys.stderr)
                time.sleep(2 * attempt)
        files.extend(res.get("files", []))
        page_token = res.get("nextPageToken")
        if not page_token:
            break
    return files


def resolve_shortcut(service, item: dict) -> dict | None:
    if item.get("mimeType") != "application/vnd.google-apps.shortcut":
        return item
    details = item.get("shortcutDetails") or {}
    target_id = details.get("targetId")
    if not target_id:
        return None
    try:
        return (
            service.files()
            .get(
                fileId=target_id,
                fields="id,name,mimeType,modifiedTime,size",
                supportsAllDrives=True,
            )
            .execute()
        )
    except HttpError as exc:
        if exc.resp.status == 404:
            return None
        raise


def safe_rel_path(parts: list[str]) -> Path:
    cleaned = []
    for part in parts:
        name = "".join(c if c.isalnum() or c in "._- " else "_" for c in part).strip()
        if name:
            cleaned.append(name)
    return Path(*cleaned) if cleaned else Path("_")


def is_text_source(mime: str, *, include_images: bool) -> bool:
    if mime in SKIP_MIME_EXACT or any(mime.startswith(p) for p in SKIP_MIME_PREFIXES):
        return False
    if mime in TEXT_MIME_EXACT or mime in EXPORT_MIME:
        return True
    if any(mime.startswith(p) for p in TEXT_MIME_PREFIXES):
        return True
    if include_images and mime.startswith("image/"):
        return True
    return False


def meta_path_for(dest: Path) -> Path:
    return dest.with_suffix(dest.suffix + ".meta.yaml")


def read_stored_modified(meta_path: Path) -> str | None:
    if not meta_path.exists():
        return None
    for line in meta_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("modifiedTime:"):
            return json.loads(line.split(":", 1)[1].strip())
    return None


def write_meta(meta_path: Path, meta: dict) -> None:
    lines = ["---"]
    for k, v in meta.items():
        lines.append(f"{k}: {json.dumps(v, ensure_ascii=False)}")
    lines.append("---\n")
    meta_path.write_text("\n".join(lines), encoding="utf-8")


def download_binary(service, file_id: str, dest: Path, retries: int = 3) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    for attempt in range(1, retries + 1):
        try:
            if tmp.exists():
                tmp.unlink()
            request = service.files().get_media(fileId=file_id, supportsAllDrives=True)
            with io.FileIO(tmp, "wb") as fh:
                downloader = MediaIoBaseDownload(fh, request, chunksize=10 * 1024 * 1024)
                done = False
                while not done:
                    _, done = downloader.next_chunk(num_retries=5)
            tmp.replace(dest)
            return
        except Exception as exc:
            if attempt == retries:
                raise
            print(f"  retry {attempt}/{retries} after error: {exc}", file=sys.stderr)
            time.sleep(2 * attempt)


def export_google_file(service, file_id: str, export_mime: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    data = service.files().export(fileId=file_id, mimeType=export_mime).execute()
    if isinstance(data, bytes):
        dest.write_bytes(data)
    else:
        dest.write_text(
            data if isinstance(data, str) else data.decode("utf-8", errors="replace"),
            encoding="utf-8",
        )


def sync_file(
    service,
    item: dict,
    rel_dir: Path,
    *,
    dry_run: bool,
    include_images: bool,
    force: bool,
) -> str | None:
    mime = item["mimeType"]
    if not is_text_source(mime, include_images=include_images):
        return None

    name = item["name"]
    file_id = item["id"]
    modified = item.get("modifiedTime")

    if mime in EXPORT_MIME:
        export_mime, ext = EXPORT_MIME[mime]
        dest = RAW_BOOKS / rel_dir / f"{Path(name).stem}{ext}"
    else:
        ext = Path(name).suffix or mimetypes.guess_extension(mime) or ""
        dest = RAW_BOOKS / rel_dir / f"{Path(name).stem}{ext}"

    meta_path = meta_path_for(dest)
    if not force and dest.exists() and dest.stat().st_size > 0:
        if read_stored_modified(meta_path) == modified:
            return f"skip (unchanged) {rel_dir / dest.name}"

    action = f"sync {rel_dir / name} → {dest.relative_to(WIKI_ROOT)}"
    if dry_run:
        return action

    if mime in EXPORT_MIME:
        export_mime, _ = EXPORT_MIME[mime]
        export_google_file(service, file_id, export_mime, dest)
    else:
        download_binary(service, file_id, dest)

    write_meta(
        meta_path,
        {
            "id": file_id,
            "name": name,
            "mimeType": mime,
            "modifiedTime": modified,
            "size": item.get("size"),
            "drive_path": str(rel_dir / name),
            "local_path": str(dest.relative_to(WIKI_ROOT)),
        },
    )
    return action


def walk(
    service,
    folder_id: str,
    rel_parts: list[str],
    *,
    dry_run: bool,
    include_images: bool,
    force: bool,
    skip_folders: set[str],
) -> list[str]:
    actions: list[str] = []
    for item in sorted(list_children(service, folder_id), key=lambda x: x["name"].lower()):
        name = item["name"]
        mime = item["mimeType"]

        if mime == "application/vnd.google-apps.folder":
            if should_skip_folder(name, skip_folders):
                print(f"skip folder: {'/'.join(rel_parts + [name])}")
                continue
            actions.extend(
                walk(
                    service,
                    item["id"],
                    rel_parts + [name],
                    dry_run=dry_run,
                    include_images=include_images,
                    force=force,
                    skip_folders=skip_folders,
                )
            )
            continue

        if mime == "application/vnd.google-apps.shortcut":
            resolved = resolve_shortcut(service, item)
            if resolved is None:
                print(f"skip broken shortcut: {'/'.join(rel_parts + [name])}")
                continue
            resolved["name"] = name
            result = sync_file(
                service,
                resolved,
                safe_rel_path(rel_parts),
                dry_run=dry_run,
                include_images=include_images,
                force=force,
            )
            if result:
                actions.append(result)
            continue

        result = sync_file(
            service,
            item,
            safe_rel_path(rel_parts),
            dry_run=dry_run,
            include_images=include_images,
            force=force,
        )
        if result:
            actions.append(result)

    return actions


def is_raster_image(name: str, mime: str) -> bool:
    ext = Path(name).suffix.lower()
    if ext in IMAGE_EXTENSIONS:
        return True
    return mime.startswith("image/") and ext not in {".psd", ".psb"}


def sync_kata_photos(
    service,
    folder_id: str,
    *,
    dry_run: bool,
    force: bool,
) -> list[str]:
    """Sync 立相勢法十二本 kata photos into raw/assets/tachiai-12-kata/{slug}/."""
    actions: list[str] = []
    children = list_children(service, folder_id)
    kata_root = None
    for item in children:
        if item["name"] != "12 Kata" or item["mimeType"] != "application/vnd.google-apps.folder":
            continue
        for sub in list_children(service, item["id"]):
            if sub["name"] in KATA_SHORTCUT_NAMES:
                resolved = resolve_shortcut(service, sub)
                if resolved and resolved["mimeType"] == "application/vnd.google-apps.folder":
                    kata_root = resolved
                    break
        break

    if kata_root is None:
        print("warning: 立相勢法十二本 shortcut not found under 12 Kata/", file=sys.stderr)
        return actions

    def walk_kata_folder(drive_folder_id: str, slug: str, rel_parts: list[str]) -> None:
        for item in sorted(list_children(service, drive_folder_id), key=lambda x: x["name"].lower()):
            mime = item["mimeType"]
            name = item["name"]
            if mime == "application/vnd.google-apps.folder":
                walk_kata_folder(item["id"], slug, rel_parts + [name])
                continue
            if mime == "application/vnd.google-apps.shortcut":
                resolved = resolve_shortcut(service, item)
                if resolved is None:
                    continue
                if resolved["mimeType"] == "application/vnd.google-apps.folder":
                    walk_kata_folder(resolved["id"], slug, rel_parts + [name])
                    continue
                item = resolved
                mime = item["mimeType"]
                name = item["name"]
            if not is_raster_image(name, mime):
                continue
            rel_dir = Path("tachiai-12-kata") / slug
            if rel_parts:
                rel_dir = rel_dir.joinpath(*[safe_rel_path([p]).parts[0] for p in rel_parts])
            dest = RAW_ASSETS / rel_dir / name
            modified = item.get("modifiedTime")
            meta_path = meta_path_for(dest)
            if not force and dest.exists() and dest.stat().st_size > 0:
                if read_stored_modified(meta_path) == modified:
                    actions.append(f"skip (unchanged) {rel_dir / name}")
                    continue
            action = f"sync photo {rel_dir / name}"
            if dry_run:
                actions.append(action)
                continue
            download_binary(service, item["id"], dest)
            write_meta(
                meta_path,
                {
                    "id": item["id"],
                    "name": name,
                    "mimeType": mime,
                    "modifiedTime": modified,
                    "size": item.get("size"),
                    "drive_path": str(Path("12 Kata") / "立相勢法十二本" / slug / Path(*rel_parts) / name),
                    "local_path": str(dest.relative_to(WIKI_ROOT)),
                    "kata_slug": slug,
                },
            )
            actions.append(action)

    for item in sorted(list_children(service, kata_root["id"]), key=lambda x: x["name"]):
        slug = KATA_FOLDER_MAP.get(item["name"])
        if not slug or item["mimeType"] != "application/vnd.google-apps.folder":
            continue
        walk_kata_folder(item["id"], slug, [])

    return actions


def sync_promo_images(
    service,
    folder_id: str,
    *,
    dry_run: bool,
    force: bool,
) -> list[str]:
    """Sync TSR Books promo JPEGs into raw/assets/promo/."""
    actions: list[str] = []
    children = list_children(service, folder_id)
    tsr = next((c for c in children if c["name"] == "TSR Books"), None)
    if not tsr:
        return actions
    promo_names = {"12 kata promo.jpg", "S__892944.jpg", "S__892949.jpg"}
    for item in list_children(service, tsr["id"]):
        if item["name"] not in promo_names:
            continue
        if not is_raster_image(item["name"], item["mimeType"]):
            continue
        dest = RAW_ASSETS / "promo" / item["name"]
        modified = item.get("modifiedTime")
        meta_path = meta_path_for(dest)
        if not force and dest.exists() and dest.stat().st_size > 0:
            if read_stored_modified(meta_path) == modified:
                actions.append(f"skip (unchanged) promo/{item['name']}")
                continue
        action = f"sync promo/{item['name']}"
        if dry_run:
            actions.append(action)
            continue
        download_binary(service, item["id"], dest)
        write_meta(
            meta_path,
            {
                "id": item["id"],
                "name": item["name"],
                "mimeType": item["mimeType"],
                "modifiedTime": modified,
                "size": item.get("size"),
                "drive_path": f"TSR Books/{item['name']}",
                "local_path": str(dest.relative_to(WIKI_ROOT)),
            },
        )
        actions.append(action)
    return actions


def sync_root_files(
    service,
    folder_id: str,
    *,
    dry_run: bool,
    include_images: bool,
    force: bool,
) -> list[str]:
    actions: list[str] = []
    for item in sorted(list_children(service, folder_id), key=lambda x: x["name"].lower()):
        mime = item["mimeType"]
        if mime == "application/vnd.google-apps.folder":
            continue
        if mime == "application/vnd.google-apps.shortcut":
            resolved = resolve_shortcut(service, item)
            if resolved is None:
                continue
            resolved["name"] = item["name"]
            item = resolved
            mime = item["mimeType"]
        result = sync_file(
            service,
            item,
            Path("_root"),
            dry_run=dry_run,
            include_images=include_images,
            force=force,
        )
        if result:
            actions.append(result)
    return actions


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync books from Google Drive to raw/books/")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--include-images", action="store_true", help="Also sync image files")
    parser.add_argument("--force", action="store_true", help="Re-download even if unchanged")
    parser.add_argument(
        "--all-folders",
        action="store_true",
        help="Walk entire Drive tree (slow; includes practice video folders as skipped names only)",
    )
    parser.add_argument(
        "--paths",
        nargs="*",
        help="Top-level folder names to sync (default: TSR Books, 12 Kata)",
    )
    parser.add_argument(
        "--sync-kata-photos",
        action="store_true",
        help="Sync 立相勢法十二本 kata JPG/PNG into raw/assets/tachiai-12-kata/{slug}/",
    )
    parser.add_argument(
        "--sync-promo-images",
        action="store_true",
        help="Sync TSR Books promo JPEGs into raw/assets/promo/",
    )
    args = parser.parse_args()

    cfg = load_config(args.config)
    folder_id = cfg.get("drive_books_folder_id")
    if not folder_id or str(folder_id).startswith("PASTE"):
        print("Set drive_books_folder_id in config", file=sys.stderr)
        return 1

    skip_folders = {n.lower() for n in cfg.get("sync_skip_folders", list(DEFAULT_SKIP_FOLDERS))}
    include_paths = args.paths or cfg.get("sync_include_paths", DEFAULT_INCLUDE_PATHS)

    service = get_drive_service(cfg)
    RAW_BOOKS.mkdir(parents=True, exist_ok=True)

    bad = RAW_BOOKS / "Tachiai Battojutsu 12 english.pages"
    if bad.exists() and bad.stat().st_size == 0:
        bad.unlink()

    actions: list[str] = []

    if args.sync_kata_photos:
        actions.extend(sync_kata_photos(service, folder_id, dry_run=args.dry_run, force=args.force))
    if args.sync_promo_images:
        actions.extend(sync_promo_images(service, folder_id, dry_run=args.dry_run, force=args.force))

    if args.all_folders:
        actions.extend(
            walk(
                service,
                folder_id,
                [],
                dry_run=args.dry_run,
                include_images=args.include_images,
                force=args.force,
                skip_folders=skip_folders,
            )
        )
    else:
        children = list_children(service, folder_id)
        by_name = {c["name"]: c for c in children if c["mimeType"] == "application/vnd.google-apps.folder"}
        for path_name in include_paths:
            folder = by_name.get(path_name)
            if not folder:
                print(f"warning: folder not found: {path_name}", file=sys.stderr)
                continue
            actions.extend(
                walk(
                    service,
                    folder["id"],
                    [path_name],
                    dry_run=args.dry_run,
                    include_images=args.include_images,
                    force=args.force,
                    skip_folders=skip_folders,
                )
            )
        if cfg.get("sync_root_files", True):
            actions.extend(
                sync_root_files(
                    service,
                    folder_id,
                    dry_run=args.dry_run,
                    include_images=args.include_images,
                    force=args.force,
                )
            )

    if not actions and not (args.sync_kata_photos or args.sync_promo_images):
        print("No text sources found (videos skipped by default). Use --include-images for JPEG/PNG.")
        return 0
    if not actions:
        print("No files to sync.")
        return 0

    for line in actions:
        print(line)

    print(f"\nDone. {len(actions)} file(s). Ingest with agent per WIKI.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
