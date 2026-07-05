#!/usr/bin/env python3
"""Import ChatGPT data export into an Obsidian vault as markdown."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path


SKIP_CONTENT_TYPES = frozenset({"thoughts", "reasoning_recap", "model_editable_context"})


def slugify(text: str, max_len: int = 80) -> str:
    text = text.strip() or "untitled"
    text = re.sub(r"[^\w\s\-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[\s_]+", "-", text).strip("-").lower()
    return (text[:max_len].rstrip("-") or "untitled")


def fmt_time(ts: float | None) -> str:
    if not ts:
        return ""
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def fmt_date(ts: float | None) -> str:
    if not ts:
        return "unknown"
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")


def build_children_map(mapping: dict) -> dict[str, list[str]]:
    children: dict[str, list[str]] = {}
    for nid, node in mapping.items():
        parent = node.get("parent")
        if parent:
            children.setdefault(parent, []).append(nid)
    return children


def walk_nodes(mapping: dict, root_id: str) -> list[dict]:
    children = build_children_map(mapping)
    ordered: list[dict] = []
    visited: set[str] = set()
    stack = [root_id]

    while stack:
        nid = stack.pop()
        if nid in visited:
            continue
        visited.add(nid)
        node = mapping.get(nid)
        if not node:
            continue
        msg = node.get("message")
        if msg:
            ordered.append(msg)
        # Push children in reverse so first child is processed first.
        kids = children.get(nid, [])
        stack.extend(reversed(kids))

    return ordered


def resolve_asset_pointer(pointer: str, export_dir: Path, asset_names: dict[str, str]) -> Path | None:
    if not pointer or not pointer.startswith("file-service://"):
        return None
    dat_name = pointer.replace("file-service://", "") + ".dat"
    src = export_dir / dat_name
    if not src.exists():
        return None
    return src


def copy_attachment(
    src: Path,
    attachments_dir: Path,
    asset_names: dict[str, str],
    copied: dict[str, str],
) -> str:
    key = src.name
    if key in copied:
        return copied[key]

    display = asset_names.get(key, src.stem + ".bin")
    display = re.sub(r'[<>:"/\\|?*]', "-", display)
    dest = attachments_dir / display
    if dest.exists() and dest.stat().st_size == src.stat().st_size:
        copied[key] = display
        return display

    stem, suffix = dest.stem, dest.suffix
    n = 1
    while dest.exists():
        dest = attachments_dir / f"{stem}-{n}{suffix}"
        n += 1

    shutil.copy2(src, dest)
    copied[key] = dest.name
    return dest.name


def render_parts(
    parts: list,
    export_dir: Path,
    attachments_dir: Path,
    asset_names: dict[str, str],
    copied: dict[str, str],
) -> str:
    chunks: list[str] = []
    for part in parts:
        if isinstance(part, str):
            if part:
                chunks.append(part)
            continue
        if not isinstance(part, dict):
            continue
        if part.get("content_type") == "image_asset_pointer":
            pointer = part.get("asset_pointer", "")
            src = resolve_asset_pointer(pointer, export_dir, asset_names)
            if src:
                name = copy_attachment(src, attachments_dir, asset_names, copied)
                chunks.append(f"![[{name}]]")
            else:
                chunks.append(f"_[image: {pointer}]_")
    return "\n\n".join(chunks).strip()


def render_message(
    msg: dict,
    export_dir: Path,
    attachments_dir: Path,
    asset_names: dict[str, str],
    copied: dict[str, str],
) -> str | None:
    content = msg.get("content") or {}
    ctype = content.get("content_type", "text")
    if ctype in SKIP_CONTENT_TYPES:
        return None

    role = (msg.get("author") or {}).get("role", "unknown")
    if role == "system":
        return None

    body = ""
    if ctype == "text":
        parts = content.get("parts") or []
        body = "\n\n".join(p for p in parts if isinstance(p, str) and p.strip())
    elif ctype == "multimodal_text":
        body = render_parts(content.get("parts") or [], export_dir, attachments_dir, asset_names, copied)
    elif ctype == "code":
        lang = content.get("language", "")
        text = content.get("text", "")
        body = f"```{lang}\n{text}\n```"
    else:
        parts = content.get("parts")
        if isinstance(parts, list):
            body = "\n\n".join(p for p in parts if isinstance(p, str))
        if not body:
            body = f"_[unsupported content type: {ctype}]_"

    if not body.strip():
        return None

    ts = fmt_time(msg.get("create_time"))
    label = {"user": "You", "assistant": "ChatGPT", "tool": "Tool"}.get(role, role.title())
    header = f"### {label}"
    if ts:
        header += f" ({ts})"
    return f"{header}\n\n{body}"


def conversation_to_markdown(
    conv: dict,
    export_dir: Path,
    attachments_dir: Path,
    asset_names: dict[str, str],
    copied: dict[str, str],
) -> str:
    mapping = conv.get("mapping") or {}
    roots = [nid for nid, node in mapping.items() if node.get("parent") is None]
    if not roots:
        return ""

    messages: list[dict] = []
    for root in roots:
        messages.extend(walk_nodes(mapping, root))

    sections = []
    for msg in messages:
        rendered = render_message(msg, export_dir, attachments_dir, asset_names, copied)
        if rendered:
            sections.append(rendered)

    title = conv.get("title") or "Untitled"
    created = fmt_date(conv.get("create_time"))
    updated = fmt_date(conv.get("update_time"))
    conv_id = conv.get("conversation_id") or conv.get("id", "")

    frontmatter = [
        "---",
        f'title: "{title.replace(chr(34), chr(39))}"',
        f"created: {created}",
        f"updated: {updated}",
        f"chatgpt_id: {conv_id}",
        "source: chatgpt-export",
        f"export_date: 2026-06-30",
        "---",
        "",
        f"# {title}",
        "",
    ]
    return "\n".join(frontmatter) + "\n\n---\n\n".join(sections) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Import ChatGPT export to Obsidian")
    parser.add_argument("export_dir", type=Path)
    parser.add_argument("vault_dir", type=Path)
    parser.add_argument("--import-folder", default="Imports/ChatGPT/2026-06-30")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    export_dir = args.export_dir.expanduser().resolve()
    vault_dir = args.vault_dir.expanduser().resolve()
    dest_root = vault_dir / args.import_folder
    conversations_dir = dest_root / "conversations"
    attachments_dir = dest_root / "attachments"
    manifest_path = dest_root / ".import-manifest.json"

    asset_names_path = export_dir / "conversation_asset_file_names.json"
    asset_names: dict[str, str] = {}
    if asset_names_path.exists():
        asset_names = json.loads(asset_names_path.read_text(encoding="utf-8"))

    existing: dict[str, str] = {}
    if manifest_path.exists():
        existing = json.loads(manifest_path.read_text(encoding="utf-8"))

    conv_files = sorted(export_dir.glob("conversations-*.json"))
    if not conv_files:
        print(f"No conversations-*.json in {export_dir}")
        return 1

    if not args.dry_run:
        conversations_dir.mkdir(parents=True, exist_ok=True)
        attachments_dir.mkdir(parents=True, exist_ok=True)

    imported = 0
    skipped = 0
    errors: list[str] = []
    copied: dict[str, str] = {}
    manifest = dict(existing)

    for conv_file in conv_files:
        conversations = json.loads(conv_file.read_text(encoding="utf-8"))
        for conv in conversations:
            conv_id = conv.get("conversation_id") or conv.get("id", "")
            if conv_id in existing:
                skipped += 1
                continue

            title = conv.get("title") or "Untitled"
            created = fmt_date(conv.get("create_time"))
            slug = slugify(title)
            filename = f"{created}_{slug}.md"

            if args.dry_run:
                imported += 1
                continue

            try:
                md = conversation_to_markdown(conv, export_dir, attachments_dir, asset_names, copied)
                if not md.strip():
                    errors.append(f"empty: {conv_id} ({title})")
                    continue

                out_path = conversations_dir / filename
                if out_path.exists():
                    out_path = conversations_dir / f"{created}_{slug}-{conv_id[:8]}.md"

                out_path.write_text(md, encoding="utf-8")
                manifest[conv_id] = str(out_path.relative_to(vault_dir))
                imported += 1
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{conv_id}: {exc}")

    if not args.dry_run:
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        index_lines = [
            "# ChatGPT Export — 2026-06-30",
            "",
            f"Imported **{imported}** conversations from ChatGPT data export.",
            f"Skipped **{skipped}** already-imported conversations.",
            "",
            "## Conversations",
            "",
        ]
        for conv_id, rel in sorted(manifest.items(), key=lambda x: x[1]):
            name = Path(rel).stem
            index_lines.append(f"- [[{args.import_folder}/conversations/{name}|{name.replace('_', ' ')}]]")
        (dest_root / "README.md").write_text("\n".join(index_lines) + "\n", encoding="utf-8")

    print(f"Vault: {vault_dir}")
    print(f"Destination: {dest_root}")
    print(f"Imported: {imported}")
    print(f"Skipped (duplicate): {skipped}")
    print(f"Attachments copied: {len(copied)}")
    if errors:
        print(f"Errors: {len(errors)}")
        for e in errors[:10]:
            print(f"  - {e}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
