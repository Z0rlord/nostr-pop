#!/usr/bin/env python3
"""Fetch Tenshinryu wiki source pages from the web into raw/web/."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import xml.etree.ElementTree as ET
from collections import deque
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen

WIKI_ROOT = Path(__file__).resolve().parents[1]
RAW_WEB = WIKI_ROOT / "raw" / "web"
SCRIPTS = Path(__file__).resolve().parent
DEFAULT_CONFIG = Path.home() / ".config/dojopop/tenshinryu-wiki.json"

sys.path.insert(0, str(SCRIPTS))
from wiki_international_filter import should_skip_international_wiki_source  # noqa: E402

SKIP_PATH_RE = re.compile(
    r"(?:wp-admin|wp-login|xmlrpc|feed=|/feed/?$|/tag/|/author/|"
    r"\.(?:jpg|jpeg|png|gif|webp|pdf|zip|mp4|mov)$)",
    re.I,
)
HREF_RE = re.compile(r"""href=["']([^"'#]+)""", re.I)
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


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


def slug_from_url(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.netloc.replace(".", "-")
    path = parsed.path.strip("/").replace("/", "-") or "home"
    if parsed.query and "p=" in parsed.query:
        path = f"p-{parsed.query.split('p=')[-1].split('&')[0]}"
    slug = f"{host}-{path}" if path != "home" else f"{host}-home"
    return re.sub(r"[^a-zA-Z0-9_-]+", "-", slug).lower()


def normalize_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path or "/"
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    return urlunparse((parsed.scheme, parsed.netloc.lower(), path, "", parsed.query, ""))


def same_domain(url: str, base_netloc: str) -> bool:
    host = urlparse(url).netloc.lower()
    base = base_netloc.lower()
    return host == base or host.endswith("." + base)


def extract_title(html: str) -> str:
    m = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I)
    return m.group(1).strip() if m else "Untitled"


def html_to_text(html: str) -> str:
    parser = _TextExtractor()
    parser.feed(html)
    return parser.text()


def fetch(url: str, user_agent: str) -> tuple[str, str]:
    req = Request(url, headers={"User-Agent": user_agent})
    with urlopen(req, timeout=60) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        html = resp.read().decode(charset, errors="replace")
    return html, extract_title(html)


def extract_links(html: str, base_url: str, base_netloc: str) -> list[str]:
    links: list[str] = []
    for href in HREF_RE.findall(html):
        href = href.strip()
        if not href or href.startswith(("mailto:", "javascript:", "tel:")):
            continue
        abs_url = normalize_url(urljoin(base_url, href))
        if not same_domain(abs_url, base_netloc):
            continue
        if SKIP_PATH_RE.search(abs_url):
            continue
        links.append(abs_url)
    return links


def write_markdown(out_path: Path, *, url: str, title: str, body: str) -> None:
    frontmatter = (
        "---\n"
        f"url: {url}\n"
        f"fetched: {date.today().isoformat()}\n"
        f"title: {json.dumps(title, ensure_ascii=False)}\n"
        "source: website\n"
        "---\n\n"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        frontmatter + f"# {title}\n\n> Auto-fetched; review before ingest.\n\n{body}\n",
        encoding="utf-8",
    )


def fetch_one(
    url: str,
    *,
    user_agent: str,
    slug: str | None = None,
    force: bool = False,
) -> str | None:
    out_slug = slug or slug_from_url(url)
    if out_slug.startswith("international-tenshinryu-net-") and should_skip_international_wiki_source(
        out_slug
    ):
        return f"skip (low-value) {out_slug}"
    out_path = RAW_WEB / f"{out_slug}.md"
    if out_path.exists() and not force:
        return f"skip (exists) {out_slug}"
    html, title = fetch(url, user_agent)
    body = html_to_text(html)
    if len(body) < 80:
        return f"skip (thin) {out_slug}"
    write_markdown(out_path, url=url, title=title, body=body)
    return f"wrote {out_slug} ({len(body)} chars)"


def parse_sitemap_urls(sitemap_url: str, user_agent: str) -> list[str]:
    req = Request(sitemap_url, headers={"User-Agent": user_agent})
    with urlopen(req, timeout=60) as resp:
        xml = resp.read()
    root = ET.fromstring(xml)
    tag = root.tag.rsplit("}", 1)[-1]
    urls: list[str] = []
    if tag == "sitemapindex":
        for loc in root.findall("sm:sitemap/sm:loc", NS):
            if loc.text:
                urls.extend(parse_sitemap_urls(loc.text.strip(), user_agent))
    else:
        for loc in root.findall("sm:url/sm:loc", NS):
            if loc.text:
                urls.append(normalize_url(loc.text.strip()))
    return urls


def parse_rss_urls(feed_url: str, user_agent: str) -> list[str]:
    req = Request(feed_url, headers={"User-Agent": user_agent})
    with urlopen(req, timeout=60) as resp:
        xml = resp.read()
    root = ET.fromstring(xml)
    urls: list[str] = []
    for item in root.iter("item"):
        for link in item.findall("link"):
            if link.text:
                urls.append(normalize_url(link.text.strip()))
    return urls


def crawl(
    start_urls: list[str],
    *,
    user_agent: str,
    max_pages: int,
    delay: float,
    force: bool,
) -> list[str]:
    if not start_urls:
        return []
    base_netloc = urlparse(start_urls[0]).netloc
    seen: set[str] = set()
    queue: deque[str] = deque(start_urls)
    results: list[str] = []
    fetched = 0

    while queue and fetched < max_pages:
        url = queue.popleft()
        if url in seen:
            continue
        seen.add(url)
        if SKIP_PATH_RE.search(url):
            continue
        try:
            result = fetch_one(url, user_agent=user_agent, force=force)
            if result:
                results.append(result)
            if result and result.startswith("wrote"):
                fetched += 1
                html, _ = fetch(url, user_agent)
                for link in extract_links(html, url, base_netloc):
                    if link not in seen:
                        queue.append(link)
            time.sleep(delay)
        except Exception as exc:
            results.append(f"error {url}: {exc}")
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch web pages into tenshinryu-wiki raw/web/")
    parser.add_argument("--url", help="Single page URL to fetch")
    parser.add_argument("--slug", help="Output filename without .md (default: derived from URL)")
    parser.add_argument("--crawl", action="store_true", help="BFS crawl from --url or --start-urls")
    parser.add_argument("--start-urls", nargs="*", help="Seed URLs for crawl mode")
    parser.add_argument("--sitemap", help="WordPress sitemap URL; fetch all post URLs")
    parser.add_argument("--rss", help="RSS feed URL; fetch linked posts")
    parser.add_argument("--max-pages", type=int, default=200, help="Max pages per crawl/sitemap")
    parser.add_argument("--delay", type=float, default=1.0, help="Seconds between requests")
    parser.add_argument("--force", action="store_true", help="Re-fetch even if file exists")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    args = parser.parse_args()

    cfg: dict = {}
    if args.config.exists():
        cfg = json.loads(args.config.read_text(encoding="utf-8"))

    ua = cfg.get("user_agent", "DojoPop-TenshinryuWiki/1.0 (+https://tenshinryu.xyz)")
    results: list[str] = []

    if args.sitemap:
        print(f"Parsing sitemap {args.sitemap} …")
        urls = parse_sitemap_urls(args.sitemap, ua)[: args.max_pages]
        print(f"Found {len(urls)} URL(s)")
        for i, url in enumerate(urls):
            if SKIP_PATH_RE.search(url):
                continue
            try:
                result = fetch_one(url, user_agent=ua, force=args.force)
                if result:
                    results.append(result)
                    print(f"[{i+1}/{len(urls)}] {result}")
                time.sleep(args.delay)
            except Exception as exc:
                results.append(f"error {url}: {exc}")
                print(f"error {url}: {exc}", file=sys.stderr)

    elif args.rss:
        print(f"Parsing RSS {args.rss} …")
        urls = parse_rss_urls(args.rss, ua)[: args.max_pages]
        print(f"Found {len(urls)} URL(s)")
        for i, url in enumerate(urls):
            try:
                result = fetch_one(url, user_agent=ua, force=args.force)
                if result:
                    results.append(result)
                    print(f"[{i+1}/{len(urls)}] {result}")
                time.sleep(args.delay)
            except Exception as exc:
                results.append(f"error {url}: {exc}")

    elif args.crawl:
        seeds = args.start_urls or ([args.url] if args.url else [])
        if not seeds:
            print("Provide --url or --start-urls for crawl", file=sys.stderr)
            return 1
        print(f"Crawling from {len(seeds)} seed(s), max {args.max_pages} pages …")
        results = crawl(
            seeds,
            user_agent=ua,
            max_pages=args.max_pages,
            delay=args.delay,
            force=args.force,
        )
        for line in results:
            print(line)

    elif args.url:
        print(f"Fetching {args.url} …")
        result = fetch_one(args.url, user_agent=ua, slug=args.slug, force=args.force)
        if result:
            print(result)
            results.append(result)
    else:
        parser.print_help()
        return 1

    wrote = sum(1 for r in results if r.startswith("wrote"))
    skipped = sum(1 for r in results if r.startswith("skip"))
    print(f"\nDone. wrote={wrote} skipped={skipped} errors={len(results) - wrote - skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
