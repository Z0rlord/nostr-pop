#!/usr/bin/env python3
"""Remove international.tenshinryu.net scrape boilerplate from wiki markdown."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / "wiki"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
BANNER_RE = re.compile(r"JAPANESE TRADITION TENSHINRYU HYOHO", re.I)
DATE_LINE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
FOOTER_MARKERS = frozenset(
    {
        "関連する記事",
        "Prev",
        "Next",
        "HOME",
        "CLOSE",
        "for Creators",
    }
)
TAG_LINE_RE = re.compile(r"^タグ\s+#")
SCRAPE_SECTIONS = frozenset({"philosophy", "reiho", "techniques", "history"})


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    meta = yaml.safe_load(m.group(1)) or {}
    body = text[m.end() :]
    return meta, body


def needs_cleanup(text: str, slug: str) -> bool:
    if BANNER_RE.search(text):
        return True
    if "関連する記事" in text:
        return True
    section = slug.split("/")[0] if "/" in slug else slug
    if section not in SCRAPE_SECTIONS:
        return False
    _, body = parse_frontmatter(text)
    m = re.search(r"^#\s+(.+)$", body, re.M)
    if not m:
        return False
    h1 = m.group(1).strip()
    bare_h1 = re.sub(r"\s*\([^)]*\)\s*$", "", h1)
    # Duplicate kanji in H1, e.g. "温故知新 (温故知新)"
    paren_m = re.search(r"\(([^)]+)\)\s*$", h1)
    if paren_m and paren_m.group(1) in bare_h1:
        return True
    lines = body.splitlines()
    h1_idx = next((i for i, ln in enumerate(lines) if ln.startswith("# ")), None)
    if h1_idx is None:
        return False
    repeats = 0
    for line in lines[h1_idx + 1 : h1_idx + 5]:
        s = line.strip()
        if not s:
            continue
        if s == bare_h1 or s.startswith(bare_h1 + "│"):
            repeats += 1
    return repeats >= 1


def title_variants(title: str, h1: str | None) -> set[str]:
    variants: set[str] = set()
    for raw in (title, h1 or ""):
        raw = raw.lstrip("# ").strip()
        raw = re.sub(r"\s*[│|].*$", "", raw).strip()
        if raw:
            variants.add(raw)
            variants.add(re.sub(r"\s*\([^)]*\)\s*$", "", raw).strip())
            variants.add(re.sub(r"^★+", "", raw).strip())
    return {v for v in variants if v}


def fix_h1_duplicate_kanji(h1_line: str) -> str:
    m = re.match(r"^(#\s+)(.+)$", h1_line.strip())
    if not m:
        return h1_line
    prefix, rest = m.group(1), m.group(2)
    paren_m = re.search(r"\(([^)]+)\)\s*$", rest)
    if not paren_m:
        return h1_line
    inner = paren_m.group(1).strip()
    before = rest[: paren_m.start()].strip()
    if inner and inner in before:
        before = before.replace(inner, "")
        before = re.sub(r"\s+", " ", before).strip()
        return f"{prefix}{before} ({inner})"
    return h1_line


def is_scrape_title_line(line: str, variants: set[str]) -> bool:
    s = line.strip()
    if not s or s.startswith("#"):
        return False
    if BANNER_RE.search(s):
        return True
    bare = re.sub(r"^★+", "", s).strip()
    bare = re.sub(r"\s*[│|].*$", "", bare).strip()
    if bare in variants:
        return True
    for v in variants:
        if bare == v or bare.startswith(v + "│"):
            return True
    return False


def trim_footer(lines: list[str]) -> list[str]:
    """Drop trailing prev/next and related-articles blocks (scrape-only markers)."""
    for i, line in enumerate(lines):
        s = line.strip()
        if s in FOOTER_MARKERS:
            cut = i
            while cut > 0 and not lines[cut - 1].strip():
                cut -= 1
            # Also drop preceding date/title nav pair block from tenshinryu.net
            while cut > 0:
                prev = lines[cut - 1].strip()
                if not prev:
                    cut -= 1
                    continue
                if DATE_LINE_RE.match(prev) or (len(prev) <= 90 and not prev.startswith(("#", "!", "-", ">"))):
                    cut -= 1
                    continue
                break
            return lines[:cut]
    return lines


def find_h1_index(lines: list[str]) -> int | None:
    for i, line in enumerate(lines):
        if line.startswith("# ") and not line.startswith("## "):
            return i
    return None


def dedupe_consecutive_headings(lines: list[str]) -> tuple[list[str], bool]:
    out: list[str] = []
    prev_heading: str | None = None
    changed = False
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("#"):
            if line == prev_heading:
                changed = True
                i += 1
                while i < len(lines) and not lines[i].strip():
                    i += 1
                continue
            prev_heading = line
            out.append(line)
            i += 1
            continue
        prev_heading = None
        out.append(line)
        i += 1
    return out, changed


def filter_scrape_title_lines(lines: list[str], variants: set[str]) -> tuple[list[str], bool]:
    out: list[str] = []
    changed = False
    for line in lines:
        if is_scrape_title_line(line, variants):
            changed = True
            continue
        out.append(line)
    return out, changed


def clean_body(body: str, title: str) -> tuple[str, bool]:
    lines = body.splitlines()
    changed = False
    h1_idx = find_h1_index(lines)
    h1: str | None = None
    if h1_idx is None:
        out = list(lines)
    else:
        out = list(lines[:h1_idx])
        fixed = fix_h1_duplicate_kanji(lines[h1_idx])
        if fixed != lines[h1_idx]:
            changed = True
        h1 = fixed
        out.append(fixed)
        i = h1_idx + 1

        variants = title_variants(title, h1)
        while i < len(lines):
            line = lines[i]
            if not line.strip():
                out.append(line)
                i += 1
                continue
            if is_scrape_title_line(line, variants):
                changed = True
                i += 1
                continue
            break

        out.extend(lines[i:])

    variants = title_variants(title, h1)
    filtered, filter_changed = filter_scrape_title_lines(out, variants)
    if filter_changed:
        changed = True
        out = filtered

    deduped, dedupe_changed = dedupe_consecutive_headings(out)
    if dedupe_changed:
        changed = True
        out = deduped

    trimmed = trim_footer(out)
    if len(trimmed) != len(out):
        changed = True
        out = trimmed

    filtered: list[str] = []
    for line in out:
        if TAG_LINE_RE.match(line.strip()) and "BUSHI KOBUDO" in line:
            changed = True
            continue
        filtered.append(line)

    new_body = "\n".join(filtered).rstrip() + "\n"
    old_body = body if body.endswith("\n") else body + "\n"
    if new_body != old_body:
        changed = True
    return new_body, changed


def clean_stub_line(line: str) -> tuple[str, bool]:
    if not BANNER_RE.search(line):
        return line, False
    cleaned = re.sub(r"\s*[│|]\s*JAPANESE TRADITION TENSHINRYU HYOHO.*", "", line, flags=re.I)
    return cleaned, cleaned != line


def clean_file(path: Path, *, dry_run: bool) -> bool:
    text = path.read_text(encoding="utf-8")
    meta, body = parse_frontmatter(text)
    slug = str(meta.get("slug", ""))
    section = slug.split("/")[0] if "/" in slug else slug
    if section not in SCRAPE_SECTIONS and not BANNER_RE.search(text):
        return False

    title = str(meta.get("title", ""))
    new_body, changed = clean_body(body, title)

    lines = new_body.splitlines()
    for i, line in enumerate(lines):
        cleaned, line_changed = clean_stub_line(line)
        if line_changed:
            changed = True
            lines[i] = cleaned
    new_body = "\n".join(lines).rstrip() + "\n"

    if not changed:
        return False

    if dry_run:
        print(f"would fix: {path.relative_to(ROOT)}")
        return True

    m = FRONTMATTER_RE.match(text)
    if m:
        path.write_text(text[: m.end()] + new_body, encoding="utf-8")
    else:
        path.write_text(new_body, encoding="utf-8")
    print(f"fixed: {path.relative_to(ROOT)}")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    count = 0
    for md in sorted(WIKI.rglob("*.md")):
        if clean_file(md, dry_run=args.dry_run):
            count += 1
    print(f"{'Would fix' if args.dry_run else 'Fixed'} {count} file(s)")


if __name__ == "__main__":
    main()
