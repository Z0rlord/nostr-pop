#!/usr/bin/env python3
"""Build wiki articles/_index.md and update locale index blog-archive section."""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from datetime import date
from pathlib import Path

import yaml

WIKI_ROOT = Path(__file__).resolve().parents[1]
TODAY = date.today().isoformat()


def parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---\n", 3)
    if end < 0:
        return {}, text
    fm = yaml.safe_load(text[3:end]) or {}
    return fm, text[end + 5 :]


def clean_title(title: str) -> str:
    title = html_unescape(title)
    title = re.sub(r"\s*[│|–-]\s*古武術.*$", "", title).strip()
    return title or "Untitled"


def html_unescape(s: str) -> str:
    import html

    return html.unescape(s)


def collect_articles(lang_dir: Path) -> list[dict]:
    articles_dir = lang_dir / "articles"
    if not articles_dir.exists():
        return []
    rows: list[dict] = []
    for path in sorted(articles_dir.glob("p-*.md")):
        fm, _ = parse_frontmatter(path.read_text(encoding="utf-8"))
        slug = f"articles/{path.stem}"
        title = clean_title(str(fm.get("title", path.stem)))
        tags = fm.get("tags") or []
        wp_date = ""
        for src in fm.get("sources") or []:
            raw_path = WIKI_ROOT / src.replace("raw/web/", "raw/web/")
            if raw_path.exists():
                rfm, _ = parse_frontmatter(raw_path.read_text(encoding="utf-8"))
                wp_date = rfm.get("date") or rfm.get("fetched") or ""
                break
        cat = next((t for t in tags if t not in ("article", "tenshinryu-net")), "その他")
        rows.append({"slug": slug, "title": title, "date": wp_date, "category": cat})
    return rows


def build_index_content(lang: str, rows: list[dict]) -> str:
    by_cat: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        by_cat[row["category"]].append(row)

    if lang == "ja":
        title = "tenshinryu.net ブログアーカイブ"
        intro = (
            f"[tenshinryu.net](https://tenshinryu.net/) の全 **{len(rows)}** 件の投稿。"
            "オンライン稽古・NEWS・イベント・演武日程を含む。"
        )
        cat_header = "カテゴリー別"
    else:
        title = "tenshinryu.net blog archive"
        intro = (
            f"All **{len(rows)}** posts from [tenshinryu.net](https://tenshinryu.net/) "
            "(online lessons, NEWS, events, schedules included). "
            "Primary Japanese content on JA pages."
        )
        cat_header = "By category"

    lines = [
        "---",
        "slug: articles/_index",
        f"lang: {lang}",
        f"title: {json.dumps(title, ensure_ascii=False)}",
        f"pair: {'en' if lang == 'ja' else 'ja'}/articles/_index",
        "tags: [article, archive, tenshinryu-net]",
        f"updated: {TODAY}",
        "---",
        "",
        f"# {title}",
        "",
        intro,
        "",
        f"## {cat_header}",
        "",
    ]

    for cat in sorted(by_cat.keys(), key=lambda c: (-len(by_cat[c]), c)):
        lines.append(f"### {cat} ({len(by_cat[cat])})")
        lines.append("")
        lines.append("| Date | Title |")
        lines.append("|------|-------|")
        for row in sorted(by_cat[cat], key=lambda r: r["date"], reverse=True):
            date_cell = row["date"] or "—"
            lines.append(f"| {date_cell} | [[{row['slug']}|{row['title']}]] |")
        lines.append("")

    return "\n".join(lines) + "\n"


def patch_locale_index(index_path: Path, *, article_count: int, lang: str) -> bool:
    if not index_path.exists():
        return False
    text = index_path.read_text(encoding="utf-8")
    if lang == "ja":
        new_section = (
            "## tenshinryu.net 記事\n\n"
            f"[tenshinryu.net](https://tenshinryu.net/) から **{article_count}** 件の日本語記事を "
            f"`articles/` に取り込み（オンライン稽古・NEWS・イベント・演武日程を含む全投稿）。"
            f"一覧: [[articles/_index|ブログアーカイブ]]\n"
        )
        pattern = r"## tenshinryu\.net 記事\n\n[^\n]+(?:\n[^\n#][^\n]*)*"
    else:
        new_section = (
            "## tenshinryu.net articles\n\n"
            f"**{article_count}** Japanese articles from [tenshinryu.net](https://tenshinryu.net/) "
            f"under `articles/` (full blog archive including online lessons, NEWS, events). "
            f"Index: [[articles/_index|Blog archive]]\n"
        )
        pattern = r"## tenshinryu\.net articles\n\n[^\n]+(?:\n[^\n#][^\n]*)*"

    if re.search(pattern, text):
        new_text = re.sub(pattern, new_section.rstrip(), text)
    else:
        anchor = "## Sources" if lang == "en" else "## ソース"
        new_text = text.replace(anchor, new_section + "\n" + anchor)
    if new_text == text:
        return False
    index_path.write_text(new_text, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    ja_rows = collect_articles(WIKI_ROOT / "wiki" / "ja")
    en_rows = collect_articles(WIKI_ROOT / "wiki" / "en")
    count = max(len(ja_rows), len(en_rows))

    for lang, rows in (("ja", ja_rows), ("en", en_rows)):
        content = build_index_content(lang, rows)
        out = WIKI_ROOT / "wiki" / lang / "articles" / "_index.md"
        if args.dry_run:
            print(f"Would write {out} ({len(rows)} articles)")
        else:
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(content, encoding="utf-8")
            print(f"Wrote {out} ({len(rows)} articles)")

    for lang in ("ja", "en"):
        idx = WIKI_ROOT / "wiki" / lang / "index.md"
        if not args.dry_run:
            if patch_locale_index(idx, article_count=count, lang=lang):
                print(f"Updated {idx}")

    for lang, label in (("es", "es"), ("el", "el")):
        idx = WIKI_ROOT / "wiki" / lang / "index.md"
        if idx.exists() and not args.dry_run:
            text = idx.read_text(encoding="utf-8")
            if lang == "es":
                new = (
                    "## Artículos de tenshinryu.net\n\n"
                    f"**{count}** artículos en japonés desde [tenshinryu.net](https://tenshinryu.net/) "
                    f"en `articles/` (archivo completo del blog). "
                    f"Índice: [[articles/_index|Archivo del blog]]\n"
                )
                pattern = r"## Artículos de tenshinryu\.net\n\n[^\n]+(?:\n[^\n#][^\n]*)*"
            else:
                new = (
                    "## Άρθρα tenshinryu.net\n\n"
                    f"**{count}** ιαπωνικά άρθρα από [tenshinryu.net](https://tenshinryu.net/) "
                    f"στο `articles/` (πλήρες αρχείο ιστολογίου). "
                    f"Ευρετήριο: [[articles/_index|Αρχείο ιστολογίου]]\n"
                )
                pattern = r"## Άρθρα tenshinryu\.net\n\n[^\n]+(?:\n[^\n#][^\n]*)*"
            if re.search(pattern, text):
                new_text = re.sub(pattern, new.rstrip(), text)
                idx.write_text(new_text, encoding="utf-8")
                print(f"Updated {idx}")

    # Category breakdown
    by_cat: dict[str, int] = defaultdict(int)
    for row in ja_rows:
        by_cat[row["category"]] += 1
    print("\nCategory breakdown:")
    for cat, n in sorted(by_cat.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {n}")
    print(f"Total: {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
