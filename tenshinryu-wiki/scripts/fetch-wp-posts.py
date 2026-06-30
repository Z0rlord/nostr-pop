#!/usr/bin/env python3
"""Fetch all tenshinryu.net WordPress posts (and verify pages) via REST API."""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

WIKI_ROOT = Path(__file__).resolve().parents[1]
RAW_WEB = WIKI_ROOT / "raw" / "web"
BASE = "https://tenshinryu.net"
DEFAULT_UA = "DojoPop-TenshinryuWiki/1.0 (+https://tenshinryu.xyz)"


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._chunks: list[str] = []
        self._skip = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "nav", "footer", "header"}:
            self._skip = True
        if tag in {"p", "br", "h1", "h2", "h3", "h4", "li", "div"}:
            self._chunks.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "nav", "footer", "header"}:
            self._skip = False

    def handle_data(self, data: str) -> None:
        if not self._skip:
            text = data.strip()
            if text:
                self._chunks.append(text + " ")

    def text(self) -> str:
        blob = "".join(self._chunks)
        blob = re.sub(r"\n{3,}", "\n\n", blob)
        blob = re.sub(r"[ \t]+", " ", blob)
        return blob.strip()


def html_to_text(html_blob: str) -> str:
    parser = _TextExtractor()
    parser.feed(html_blob)
    return parser.text()


def rest_get(route: str, *, user_agent: str, **params: str | int) -> tuple[dict[str, str], list | dict]:
    q = urlencode({k: v for k, v in params.items()})
    url = f"{BASE}/?rest_route={route}" + (f"&{q}" if q else "")
    req = Request(url, headers={"User-Agent": user_agent})
    with urlopen(req, timeout=90) as resp:
        headers = {k: v for k, v in resp.headers.items()}
        raw = resp.read().decode("utf-8-sig")
    return headers, json.loads(raw)


def category_names(item: dict) -> list[str]:
    names: list[str] = []
    for group in item.get("_embedded", {}).get("wp:term", []):
        for term in group:
            if term.get("taxonomy") == "category":
                names.append(term["name"])
    return names


def write_post_markdown(
    out_path: Path,
    *,
    post_id: int,
    url: str,
    title: str,
    wp_date: str,
    categories: list[str],
    body: str,
    excerpt: str,
) -> None:
    cat_lines = "\n".join(f"  - {json.dumps(c, ensure_ascii=False)}" for c in categories)
    frontmatter = (
        "---\n"
        f"url: {url}\n"
        f"fetched: {date.today().isoformat()}\n"
        f'title: {json.dumps(title, ensure_ascii=False)}\n'
        f"date: {wp_date[:10]}\n"
        f"wp_id: {post_id}\n"
        "source: website\n"
        "categories:\n"
        f"{cat_lines or '  []'}\n"
        "---\n\n"
    )
    note = "> Auto-fetched via WP REST; review before ingest.\n\n"
    excerpt_block = f"> {excerpt}\n\n" if excerpt and len(excerpt) > 10 else ""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        frontmatter + f"# {title}\n\n{note}{excerpt_block}{body}\n",
        encoding="utf-8",
    )


def fetch_posts(*, user_agent: str, force: bool, delay: float) -> dict[str, int]:
    stats = {"total": 0, "wrote": 0, "skipped": 0, "errors": 0}
    page = 1
    per_page = 100

    while True:
        headers, batch = rest_get(
            "/wp/v2/posts",
            user_agent=user_agent,
            per_page=per_page,
            page=page,
            _embed=1,
        )
        if not isinstance(batch, list) or not batch:
            break
        if page == 1:
            stats["total"] = int(headers.get("X-WP-Total", len(batch)))

        for post in batch:
            post_id = post["id"]
            out_path = RAW_WEB / f"tenshinryu-net-p-{post_id}.md"
            if out_path.exists() and not force:
                stats["skipped"] += 1
                continue
            title = html.unescape(re.sub(r"\s+", " ", post["title"]["rendered"]).strip())
            content_html = post.get("content", {}).get("rendered", "")
            excerpt_html = post.get("excerpt", {}).get("rendered", "")
            body = html_to_text(content_html)
            excerpt = html.unescape(html_to_text(excerpt_html))
            if not body and excerpt:
                body = excerpt
            cats = category_names(post)
            try:
                write_post_markdown(
                    out_path,
                    post_id=post_id,
                    url=post.get("link") or f"{BASE}/?p={post_id}",
                    title=title,
                    wp_date=post.get("date", "")[:10],
                    categories=cats,
                    body=body or title,
                    excerpt=excerpt,
                )
                stats["wrote"] += 1
                print(f"wrote tenshinryu-net-p-{post_id}.md ({', '.join(cats) or 'uncategorized'})")
            except Exception as exc:
                stats["errors"] += 1
                print(f"error p-{post_id}: {exc}", file=sys.stderr)
            time.sleep(delay)

        total_pages = int(headers.get("X-WP-TotalPages", page))
        if page >= total_pages:
            break
        page += 1

    return stats


def verify_pages(*, user_agent: str) -> dict[str, int | list[int]]:
    headers, pages = rest_get("/wp/v2/pages", user_agent=user_agent, per_page=100)
    total = int(headers.get("X-WP-Total", len(pages)))
    missing: list[int] = []
    for pg in pages:
        pid = pg["id"]
        out_path = RAW_WEB / f"tenshinryu-net-page-{pid}.md"
        if not out_path.exists():
            missing.append(pid)
    return {"total": total, "on_disk": total - len(missing), "missing_ids": missing}


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch tenshinryu.net WP posts into raw/web/")
    parser.add_argument("--force", action="store_true", help="Re-fetch even if raw file exists")
    parser.add_argument("--delay", type=float, default=0.3, help="Seconds between writes")
    parser.add_argument("--posts-only", action="store_true")
    parser.add_argument("--verify-pages", action="store_true", help="Only verify static pages")
    args = parser.parse_args()

    if args.verify_pages:
        info = verify_pages(user_agent=DEFAULT_UA)
        print(
            f"Pages: {info['on_disk']}/{info['total']} on disk; "
            f"missing IDs: {info['missing_ids'] or 'none'}"
        )
        return 0 if not info["missing_ids"] else 1

    if not args.posts_only:
        info = verify_pages(user_agent=DEFAULT_UA)
        print(f"Pages verified: {info['on_disk']}/{info['total']}")

    print("Fetching posts via WP REST …")
    stats = fetch_posts(user_agent=DEFAULT_UA, force=args.force, delay=args.delay)
    on_disk = len(list(RAW_WEB.glob("tenshinryu-net-p-*.md")))
    print(
        f"\nDone. api_total={stats['total']} wrote={stats['wrote']} "
        f"skipped={stats['skipped']} errors={stats['errors']} on_disk={on_disk}"
    )
    return 0 if stats["errors"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
