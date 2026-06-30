#!/usr/bin/env python3
"""Convert index table links from [path.md](./path.md) to [[slug|Title]] wikilinks."""

from __future__ import annotations

import re
import sys
from datetime import date
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / "wiki"
LANGS = ("en", "ja", "es", "el", "fr", "de", "it")
TODAY = date.today().isoformat()

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
TABLE_LINK_RE = re.compile(r"\[([^\]]+\.md)\]\(\./([^)]+)\)")
SOURCES_LINK_RE = re.compile(r"\[sources/\]\(\./sources/\)")


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    return yaml.safe_load(m.group(1)) or {}, text[m.end() :]


def page_title(lang: str, slug: str) -> str:
    path = WIKI / lang / f"{slug}.md"
    if not path.is_file():
        return slug.split("/")[-1].replace("-", " ").replace("_", " ").title()
    meta, _ = parse_frontmatter(path.read_text(encoding="utf-8"))
    return meta.get("title") or slug.split("/")[-1].replace("-", " ").title()


def link_replacement(lang: str, slug: str) -> str:
    title = page_title(lang, slug)
    return f"[[{slug}|{title}]]"


def fix_body(body: str, lang: str) -> tuple[str, int]:
    count = 0

    def sub_table(m: re.Match[str]) -> str:
        nonlocal count
        slug = m.group(2).removesuffix(".md")
        count += 1
        return link_replacement(lang, slug)

    body = TABLE_LINK_RE.sub(sub_table, body)
    if SOURCES_LINK_RE.search(body):
        title = {
            "en": "Sources",
            "ja": "ソース",
            "es": "Fuentes",
            "el": "Πηγές",
            "fr": "Sources",
            "de": "Quellen",
            "it": "Fonti",
        }.get(lang, "Sources")
        body = SOURCES_LINK_RE.sub(f"[[sources|{title}]]", body)
        count += 1
    return body, count


def fix_index(lang: str, *, dry_run: bool) -> int:
    path = WIKI / lang / "index.md"
    if not path.is_file():
        return 0
    text = path.read_text(encoding="utf-8")
    meta, body = parse_frontmatter(text)
    new_body, n = fix_body(body, lang)
    if n == 0:
        return 0
    meta["updated"] = TODAY
    fm = yaml.safe_dump(meta, allow_unicode=True, sort_keys=False).strip()
    new_text = f"---\n{fm}\n---\n\n{new_body}"
    if not dry_run:
        path.write_text(new_text, encoding="utf-8")
    return n


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    total = 0
    for lang in LANGS:
        n = fix_index(lang, dry_run=dry_run)
        print(f"{lang}: {n} link(s){' (dry-run)' if dry_run else ''}")
        total += n
    print(f"Total: {total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
