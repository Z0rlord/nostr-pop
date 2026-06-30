#!/usr/bin/env python3
"""Remove low-value international.tenshinryu.net wiki source pages and fix wikilinks."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

WIKI_ROOT = Path(__file__).resolve().parents[1]
LANGS = ("en", "ja", "es", "el")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wiki_international_filter import (  # noqa: E402
    international_source_removal_reason,
)

WIKILINK_RE = re.compile(
    r"^\s*(?:Source|See also|出典|Fuente|Πηγή)\s*:\s*(?:\[\[sources/[^\]|]+(?:\|[^\]]+)?\]\])?\s*$",
    re.M,
)
ANY_SOURCE_WIKILINK_RE = re.compile(
    r"\[\[sources/(international-tenshinryu-net-[^\]|]+)(?:\|[^\]]+)?\]\]"
)
FOOTER_LINK_RE = re.compile(
    r"\n+英語: \[../en/sources/[^\]]+\]\(../en/sources/[^\)]+\)\s*$"
)


def collect_removals() -> dict[str, str]:
    en_sources = WIKI_ROOT / "wiki" / "en" / "sources"
    removals: dict[str, str] = {}
    for path in sorted(en_sources.glob("international-tenshinryu-net-*.md")):
        reason = international_source_removal_reason(path.stem, path.read_text(encoding="utf-8"))
        if reason:
            removals[path.stem] = reason
    return removals


def prune_wiki_pages(removals: dict[str, str], *, dry_run: bool) -> int:
    deleted = 0
    for stem in removals:
        for lang in LANGS:
            path = WIKI_ROOT / "wiki" / lang / "sources" / f"{stem}.md"
            if not path.exists():
                continue
            deleted += 1
            if not dry_run:
                path.unlink()
    return deleted


def fix_wikilinks(removed_stems: set[str], *, dry_run: bool) -> int:
    fixed = 0
    for lang in LANGS:
        for path in (WIKI_ROOT / "wiki" / lang).rglob("*.md"):
            if path.parts[-2] == "sources":
                continue
            text = path.read_text(encoding="utf-8")
            new_text = text
            for stem in removed_stems:
                if stem not in new_text:
                    continue
                new_text = ANY_SOURCE_WIKILINK_RE.sub(
                    lambda m, s=stem: "" if m.group(1) == s else m.group(0),
                    new_text,
                )
            new_text = WIKILINK_RE.sub("", new_text)
            new_text = FOOTER_LINK_RE.sub("", new_text)
            new_text = re.sub(r"\n{3,}", "\n\n", new_text).rstrip() + "\n"
            if new_text != text:
                fixed += 1
                if not dry_run:
                    path.write_text(new_text, encoding="utf-8")
    return fixed


def main() -> int:
    parser = argparse.ArgumentParser(description="Prune useless international.tenshinryu.net source pages")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    removals = collect_removals()
    print(f"Removal candidates: {len(removals)} EN slugs × {len(LANGS)} langs")
    for stem, reason in sorted(removals.items())[:10]:
        print(f"  {stem}: {reason}")
    if len(removals) > 10:
        print(f"  … and {len(removals) - 10} more")

    deleted = prune_wiki_pages(removals, dry_run=args.dry_run)
    fixed = fix_wikilinks(set(removals), dry_run=args.dry_run)
    print(f"{'Would delete' if args.dry_run else 'Deleted'} {deleted} wiki source files")
    print(f"{'Would fix' if args.dry_run else 'Fixed'} {fixed} pages with broken wikilinks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
