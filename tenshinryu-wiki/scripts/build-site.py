#!/usr/bin/env python3
"""Build static HTML wiki from wiki/{en,ja,es,el,fr,de,it} markdown."""

from __future__ import annotations

import json
import re
import shutil
from dataclasses import dataclass
from pathlib import Path

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / "wiki"
DIST = ROOT / "dist"
TEMPLATES = ROOT / "site" / "templates"
ASSETS = ROOT / "site" / "assets"
RAW_ASSETS = ROOT / "raw" / "assets"

LANGS = ("en", "ja", "es", "el", "fr", "de", "it")
CSS_VERSION = "20260708a"
LANG_ALT = "|".join(LANGS)

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
WIKILINK_RE = re.compile(r"\[\[([^\]|#]+?)(?:\|([^\]]+?))?\]\]")
H1_LINE_RE = re.compile(r"^#\s+")
# Anchor group must not consume the closing ")" — old [#)] char-class broke table links.
MD_LINK_RE = re.compile(r"(\[[^\]]+\]\()([^)#]+?\.md)(#[^)]*)?\)")
IMG_MD_RE = re.compile(r"^!\[[^\]]*\]\(/assets/(?:tachiai-12-kata|promo)/[^)]+\)\s*$", re.M)
BARE_URL_LINE_RE = re.compile(r"^(https?://\S+)\s*$", re.M)
BARE_URL_INLINE_RE = re.compile(r'(?<![\[\(])(https?://[^\s<>\[\]()"\']+)(?![\]\)])')
EXTERNAL_A_RE = re.compile(r'<a\s+href="(https?://[^"]+)"([^>]*)>')
SEIHO_IMG_HTML_RE = re.compile(
    r'<p>\s*(<img[^>]+src="/assets/(?:tachiai-12-kata|promo)/[^"]+"[^>]*>)\s*</p>'
)


@dataclass
class Page:
    lang: str
    slug: str  # path without .md, e.g. concepts/kurai/kumoi-no-kurai
    title: str
    pair: str
    updated: str
    sources: list[str]
    html_path: str  # URL path e.g. /en/concepts/kurai/kumoi-no-kurai


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    meta = yaml.safe_load(m.group(1)) or {}
    body = text[m.end() :]
    return meta, body


def slug_from_file(lang: str, path: Path) -> str:
    rel = path.relative_to(WIKI / lang)
    return str(rel.with_suffix("")).replace("\\", "/")


def url_for_slug(lang: str, slug: str) -> str:
    if slug == "index":
        return f"/{lang}/"
    return f"/{lang}/{slug}"


def collect_pages() -> dict[tuple[str, str], Page]:
    pages: dict[tuple[str, str], Page] = {}
    for lang in LANGS:
        base = WIKI / lang
        if not base.is_dir():
            continue
        for md in sorted(base.rglob("*.md")):
            slug = slug_from_file(lang, md)
            raw = md.read_text(encoding="utf-8")
            meta, _ = parse_frontmatter(raw)
            title = meta.get("title") or slug.split("/")[-1].replace("-", " ").title()
            pages[(lang, slug)] = Page(
                lang=lang,
                slug=slug,
                title=title,
                pair=meta.get("pair", ""),
                updated=str(meta.get("updated", "")),
                sources=meta.get("sources") or [],
                html_path=url_for_slug(lang, slug),
            )
    return pages


def normalize_wikilink_target(target: str, lang: str) -> str:
    target = target.strip().lstrip("/")
    if target.startswith(f"{lang}/"):
        target = target[len(lang) + 1 :]
    return target


SECTION_SLUG_HUBS: dict[str, str] = {
    "guides": "guides/start-here",
    "arts": "arts/_index",
    "techniques": "techniques/tachiai-12-kata",
    "concepts": "concepts/miden-kurai-no-koto",
    "reiho": "reiho/_index",
    "philosophy": "philosophy/_index",
    "dojo": "dojo/overview",
    "history": "history/overview",
    "people": "history/instructors",
    "articles": "articles/_index",
    "sources": "sources",
}


def resolve_wikilink(target: str, lang: str, pages: dict[tuple[str, str], Page]) -> tuple[str, bool]:
    target = normalize_wikilink_target(target, lang)
    bare = target.rstrip("/")
    hub_slug = SECTION_SLUG_HUBS.get(bare)
    if hub_slug:
        key = (lang, hub_slug)
        if key in pages:
            return pages[key].html_path, True
    key = (lang, target)
    if key in pages:
        return pages[key].html_path, True
    if (lang, bare) in pages:
        return pages[(lang, bare)].html_path, True
    return url_for_slug(lang, target), False


def md_link_to_html(href: str, page_lang: str, page_slug: str) -> str:
    href = href.strip()
    if href.startswith(("http://", "https://", "mailto:", "#")):
        return href

    m = re.match(rf"^(?:\.\./)+((?:{LANG_ALT}))/(.+?)(?:\.md)?(?:#.*)?$", href)
    if m:
        link_lang = m.group(1)
        rest = m.group(2).replace(".md", "")
        return url_for_slug(link_lang, rest)

    if href.endswith(".md"):
        href = href[:-3]

    if href.startswith("./"):
        base = Path(page_slug).parent
        combined = (base / href[2:]).as_posix()
        return url_for_slug(page_lang, combined)

    if href.startswith("../"):
        base = Path(page_slug).parent
        combined = (base / href).as_posix()
        return url_for_slug(page_lang, combined.replace(".md", ""))

    if href.startswith("/"):
        return href

    return url_for_slug(page_lang, href)


def find_body_h1_index(lines: list[str]) -> int | None:
    for i, line in enumerate(lines):
        if H1_LINE_RE.match(line) and not line.startswith("## "):
            return i
    return None


def strip_duplicate_title_h1(body: str, title: str) -> tuple[str, bool]:
    """Drop body H1 when it exactly matches frontmatter title (template renders one H1)."""
    lines = body.splitlines()
    h1_idx = find_body_h1_index(lines)
    if h1_idx is None:
        return body, False
    h1_text = lines[h1_idx][2:].strip()
    if h1_text != title.strip():
        return body, False
    new_lines = lines[:h1_idx] + lines[h1_idx + 1 :]
    while h1_idx < len(new_lines) and not new_lines[h1_idx].strip():
        new_lines.pop(h1_idx)
    return "\n".join(new_lines), True


def sanitize_body(body: str, title: str) -> tuple[str, bool]:
    """Remove scrape boilerplate; return (body, strip_title_h1_for_template)."""
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "clean_scrape_noise", ROOT / "scripts" / "clean-scrape-noise.py"
    )
    if spec is None or spec.loader is None:
        return body, False
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    cleaned, _ = mod.clean_body(body, title)
    stripped, use_template_h1 = strip_duplicate_title_h1(cleaned, title)
    return stripped, use_template_h1


def seiho_image_line_from_en(slug: str) -> str | None:
    """Return markdown image line for a seiho subpage or hub from the EN source."""
    en_md = WIKI / "en" / f"{slug}.md"
    if not en_md.is_file():
        return None
    _, body = parse_frontmatter(en_md.read_text(encoding="utf-8"))
    m = IMG_MD_RE.search(body)
    return m.group(0).strip() if m else None


def inject_seiho_photo(body: str, slug: str) -> str:
    """Add kata reference photo from EN when locale markdown omits it."""
    if not slug.startswith("techniques/tachiai-12-kata"):
        return body
    if IMG_MD_RE.search(body):
        return body
    img_line = seiho_image_line_from_en(slug)
    if not img_line:
        return body
    lines = body.splitlines()
    h1_idx = find_body_h1_index(lines)
    insert_at = (h1_idx + 1) if h1_idx is not None else 0
    while insert_at < len(lines) and not lines[insert_at].strip():
        insert_at += 1
    lines.insert(insert_at, img_line)
    lines.insert(insert_at + 1, "")
    return "\n".join(lines)


def autolink_bare_urls(body: str) -> str:
    """Turn bare https?:// URLs into markdown links (skips fenced code blocks)."""

    def line_sub(m: re.Match[str]) -> str:
        url = m.group(1).rstrip(".,;:)」』、。")
        return f"[{url}]({url})"

    lines_out: list[str] = []
    in_fence = False
    for line in body.splitlines():
        if line.strip().startswith("```"):
            in_fence = not in_fence
            lines_out.append(line)
            continue
        if in_fence or "](http" in line:
            lines_out.append(line)
            continue
        if "<" in line and ">" in line:
            lines_out.append(line)
            continue
        if BARE_URL_LINE_RE.match(line):
            lines_out.append(BARE_URL_LINE_RE.sub(line_sub, line))
        else:
            lines_out.append(BARE_URL_INLINE_RE.sub(line_sub, line))
    return "\n".join(lines_out)


def postprocess_html(html: str, page: Page) -> str:
    """External-link safety, seiho figure styling."""

    def external_attrs(m: re.Match[str]) -> str:
        href, rest = m.group(1), m.group(2)
        if 'target="' in rest:
            return m.group(0)
        return f'<a href="{href}" target="_blank" rel="noopener noreferrer"{rest}>'

    html = EXTERNAL_A_RE.sub(external_attrs, html)

    if page.slug.startswith("techniques/tachiai-12-kata"):

        def seiho_figure(m: re.Match[str]) -> str:
            return f'<figure class="seiho-hero">{m.group(1)}</figure>'

        html = SEIHO_IMG_HTML_RE.sub(seiho_figure, html)

    return html


MD_EXTENSIONS = ["tables", "fenced_code", "sane_lists", "nl2br"]
DETAILS_FULL_INDEX_RE = re.compile(
    r'<details\s+class="full-index"[^>]*>(.*?)</details>',
    re.DOTALL | re.IGNORECASE,
)
DETAILS_SUMMARY_RE = re.compile(r"(<summary>.*?</summary>)\s*", re.DOTALL | re.IGNORECASE)


def render_markdown_fragment(fragment: str) -> str:
    return markdown.markdown(fragment, extensions=MD_EXTENSIONS, output_format="html5")


def render_details_blocks(body: str) -> str:
    """Markdown inside <details> is skipped by the main pass — render inner content separately."""

    def repl(m: re.Match[str]) -> str:
        full = m.group(0)
        open_end = full.find(">")
        open_tag = full[: open_end + 1]
        inner = m.group(1).strip()
        sum_match = DETAILS_SUMMARY_RE.match(inner)
        if not sum_match:
            return m.group(0)
        summary, content = sum_match.group(1), inner[sum_match.end() :].strip()
        if not content:
            return m.group(0)
        rendered = render_markdown_fragment(content)
        return f"{open_tag}{summary}{rendered}</details>"

    return DETAILS_FULL_INDEX_RE.sub(repl, body)


def transform_markdown(
    body: str, page: Page, pages: dict[tuple[str, str], Page], *, use_template_h1: bool = False
) -> str:
    body = inject_seiho_photo(body, page.slug)

    def wikilink_sub(m: re.Match[str]) -> str:
        target, label = m.group(1), m.group(2)
        href, ok = resolve_wikilink(target, page.lang, pages)
        norm = normalize_wikilink_target(target, page.lang)
        if label:
            text = label
        elif (page.lang, norm) in pages:
            text = pages[(page.lang, norm)].title
        else:
            text = norm.split("/")[-1].replace("-", " ")
        cls = "" if ok else ' class="wikilink-missing"'
        return f'<a href="{href}"{cls}>{text}</a>'

    body = WIKILINK_RE.sub(wikilink_sub, body)

    def md_link_sub(m: re.Match[str]) -> str:
        prefix, href, suffix = m.group(1), m.group(2), m.group(3) or ")"
        new_href = md_link_to_html(href, page.lang, page.slug)
        return f"{prefix}{new_href}{suffix}"

    body = MD_LINK_RE.sub(md_link_sub, body)
    body = autolink_bare_urls(body)
    body = render_details_blocks(body)

    html = render_markdown_fragment(body)
    return postprocess_html(html, page)


def copy_raw_assets() -> int:
    """Copy raw/assets (Drive-synced photos) into dist/assets/."""
    if not RAW_ASSETS.is_dir():
        return 0
    count = 0
    for src in sorted(RAW_ASSETS.rglob("*")):
        if not src.is_file() or src.suffix == ".meta.yaml" or src.name.endswith(".meta.yaml"):
            continue
        rel = src.relative_to(RAW_ASSETS)
        dest = DIST / "assets" / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        count += 1
    return count


def canonical_en_slug(page: Page) -> str:
    if page.lang == "en":
        return page.slug
    if page.pair.startswith("en/"):
        return page.pair[3:]
    if page.pair.startswith("ja/"):
        return page.slug
    return page.slug


def pair_urls(page: Page, pages: dict[tuple[str, str], Page]) -> dict[str, str]:
    slug = canonical_en_slug(page)
    urls: dict[str, str] = {}
    for lang in LANGS:
        key = (lang, slug)
        urls[lang] = pages[key].html_path if key in pages else url_for_slug(lang, slug)
    return urls


def meta_line_html(page: Page) -> str:
    if not page.updated:
        return ""
    labels = {
        "en": "Updated",
        "ja": "更新",
        "es": "Actualizado",
        "el": "Ενημέρωση",
        "fr": "Mis à jour",
        "de": "Aktualisiert",
        "it": "Aggiornato",
    }
    label = labels.get(page.lang, "Updated")
    return f"{label} {page.updated}"


def section_labels(lang: str) -> dict[str, str]:
    labels = {
        "en": {
            "guides": "Guides",
            "arts": "Arts",
            "techniques": "Techniques",
            "concepts": "Concepts",
            "reiho": "Reiho",
            "philosophy": "Philosophy",
            "dojo": "Shinanjo (dojo)",
            "history": "History",
            "people": "People",
            "articles": "Articles",
            "sources": "Sources",
            "overview": "Overview",
            "synthesis": "Synthesis",
        },
        "ja": {
            "guides": "ガイド",
            "arts": "兵法",
            "techniques": "技",
            "concepts": "概念",
            "reiho": "礼法",
            "philosophy": "思想",
            "dojo": "指南所（道場）",
            "history": "歴史",
            "people": "人物",
            "articles": "記事",
            "sources": "ソース",
            "overview": "概観",
            "synthesis": "総合",
        },
        "es": {
            "guides": "Guías",
            "arts": "Artes",
            "techniques": "Técnicas",
            "concepts": "Conceptos",
            "reiho": "Reiho",
            "philosophy": "Filosofía",
            "dojo": "Shinanjo (dojo)",
            "history": "Historia",
            "people": "Personas",
            "articles": "Artículos",
            "sources": "Fuentes",
            "overview": "Resumen",
            "synthesis": "Síntesis",
        },
        "el": {
            "guides": "Οδηγοί",
            "arts": "Τέχνες",
            "techniques": "Τεχνικές",
            "concepts": "Έννοιες",
            "reiho": "Reiho",
            "philosophy": "Φιλοσοφία",
            "dojo": "Shinanjo (dojo)",
            "history": "Ιστορία",
            "people": "Πρόσωπα",
            "articles": "Άρθρα",
            "sources": "Πηγές",
            "overview": "Επισκόπηση",
            "synthesis": "Σύνθεση",
        },
        "fr": {
            "guides": "Guides",
            "arts": "Arts",
            "techniques": "Techniques",
            "concepts": "Concepts",
            "reiho": "Reiho",
            "philosophy": "Philosophie",
            "dojo": "Shinanjo (dojo)",
            "history": "Histoire",
            "people": "Personnes",
            "articles": "Articles",
            "sources": "Sources",
            "overview": "Aperçu",
            "synthesis": "Synthèse",
        },
        "de": {
            "guides": "Leitfäden",
            "arts": "Künste",
            "techniques": "Techniken",
            "concepts": "Konzepte",
            "reiho": "Reiho",
            "philosophy": "Philosophie",
            "dojo": "Shinanjo (dojo)",
            "history": "Geschichte",
            "people": "Personen",
            "articles": "Artikel",
            "sources": "Quellen",
            "overview": "Überblick",
            "synthesis": "Synthese",
        },
        "it": {
            "guides": "Guide",
            "arts": "Arti",
            "techniques": "Tecniche",
            "concepts": "Concetti",
            "reiho": "Reiho",
            "philosophy": "Filosofia",
            "dojo": "Shinanjo (dojo)",
            "history": "Storia",
            "people": "Persone",
            "articles": "Articoli",
            "sources": "Fonti",
            "overview": "Panoramica",
            "synthesis": "Sintesi",
        },
    }
    return labels.get(lang, labels["en"])


def section_hub(lang: str, section: str) -> str | None:
    """Default hub page per top-level section (for breadcrumbs)."""
    target = SECTION_SLUG_HUBS.get(section)
    return url_for_slug(lang, target) if target else None


def curriculum_subnav_for(lang: str) -> list[dict]:
    """Curriculum dropdown links (arts, seiho, kurai)."""
    defs = {
        "en": [
            ("Arts", "arts/_index"),
            ("12 Seiho", "techniques/tachiai-12-kata"),
            ("Kurai (位)", "concepts/miden-kurai-no-koto"),
        ],
        "ja": [
            ("兵法", "arts/_index"),
            ("十二勢法", "techniques/tachiai-12-kata"),
            ("位", "concepts/miden-kurai-no-koto"),
        ],
        "es": [
            ("Artes", "arts/_index"),
            ("12 Seiho", "techniques/tachiai-12-kata"),
            ("Kurai (位)", "concepts/miden-kurai-no-koto"),
        ],
        "el": [
            ("Τέχνες", "arts/_index"),
            ("12 Seiho", "techniques/tachiai-12-kata"),
            ("Kurai (位)", "concepts/miden-kurai-no-koto"),
        ],
        "fr": [
            ("Arts", "arts/_index"),
            ("12 Seiho", "techniques/tachiai-12-kata"),
            ("Kurai (位)", "concepts/miden-kurai-no-koto"),
        ],
        "de": [
            ("Künste", "arts/_index"),
            ("12 Seiho", "techniques/tachiai-12-kata"),
            ("Kurai (位)", "concepts/miden-kurai-no-koto"),
        ],
        "it": [
            ("Arti", "arts/_index"),
            ("12 Seiho", "techniques/tachiai-12-kata"),
            ("Kurai (位)", "concepts/miden-kurai-no-koto"),
        ],
    }
    return [
        {"label": label, "href": url_for_slug(lang, target)}
        for label, target in defs.get(lang, defs["en"])
    ]


def nav_items_for(lang: str, slug: str) -> list[dict]:
    """Student-focused primary navigation."""
    defs = {
        "en": [
            ("start_here", "Start Here", "guides/start-here", True, False),
            ("curriculum", "Curriculum", "arts/_index", False, True),
            ("reiho", "Reiho", "reiho/_index", False, False),
            ("philosophy", "Philosophy", "philosophy/_index", False, False),
            ("dojo", "Shinanjo", "dojo/overview", False, False),
            ("articles", "Articles", "articles/_index", False, False),
        ],
        "ja": [
            ("start_here", "はじめに", "guides/start-here", True, False),
            ("curriculum", "カリキュラム", "arts/_index", False, True),
            ("reiho", "礼法", "reiho/_index", False, False),
            ("philosophy", "思想", "philosophy/_index", False, False),
            ("dojo", "指南所", "dojo/overview", False, False),
            ("articles", "記事", "articles/_index", False, False),
        ],
        "es": [
            ("start_here", "Empezar", "guides/start-here", True, False),
            ("curriculum", "Currículo", "arts/_index", False, True),
            ("reiho", "Reiho", "reiho/_index", False, False),
            ("philosophy", "Filosofía", "philosophy/_index", False, False),
            ("dojo", "Shinanjo", "dojo/overview", False, False),
            ("articles", "Artículos", "articles/_index", False, False),
        ],
        "el": [
            ("start_here", "Ξεκινήστε", "guides/start-here", True, False),
            ("curriculum", "Πρόγραμμα", "arts/_index", False, True),
            ("reiho", "Reiho", "reiho/_index", False, False),
            ("philosophy", "Φιλοσοφία", "philosophy/_index", False, False),
            ("dojo", "Shinanjo", "dojo/overview", False, False),
            ("articles", "Άρθρα", "articles/_index", False, False),
        ],
        "fr": [
            ("start_here", "Commencer", "guides/start-here", True, False),
            ("curriculum", "Programme", "arts/_index", False, True),
            ("reiho", "Reiho", "reiho/_index", False, False),
            ("philosophy", "Philosophie", "philosophy/_index", False, False),
            ("dojo", "Shinanjo", "dojo/overview", False, False),
            ("articles", "Articles", "articles/_index", False, False),
        ],
        "de": [
            ("start_here", "Einstieg", "guides/start-here", True, False),
            ("curriculum", "Lehrplan", "arts/_index", False, True),
            ("reiho", "Reiho", "reiho/_index", False, False),
            ("philosophy", "Philosophie", "philosophy/_index", False, False),
            ("dojo", "Shinanjo", "dojo/overview", False, False),
            ("articles", "Artikel", "articles/_index", False, False),
        ],
        "it": [
            ("start_here", "Inizia qui", "guides/start-here", True, False),
            ("curriculum", "Programma", "arts/_index", False, True),
            ("reiho", "Reiho", "reiho/_index", False, False),
            ("philosophy", "Filosofia", "philosophy/_index", False, False),
            ("dojo", "Shinanjo", "dojo/overview", False, False),
            ("articles", "Articoli", "articles/_index", False, False),
        ],
    }
    items: list[dict] = []
    section = slug.split("/")[0] if "/" in slug else slug
    curriculum_sections = {"arts", "techniques", "concepts"}
    for key, label, target, cta, sub in defs.get(lang, defs["en"]):
        active = slug == target or (key != "start_here" and section == target.split("/")[0])
        if key == "start_here" and slug.startswith("guides/"):
            active = True
        if key == "curriculum" and section in curriculum_sections:
            active = True
        items.append(
            {
                "key": key,
                "label": label,
                "href": url_for_slug(lang, target),
                "active": active,
                "cta": cta,
                "sub": sub,
            }
        )
    return items


def build_breadcrumbs(
    lang: str, slug: str, title: str, pages: dict[tuple[str, str], Page]
) -> list[dict]:
    home_labels = {
        "en": "Home",
        "ja": "ホーム",
        "es": "Inicio",
        "el": "Αρχική",
        "fr": "Accueil",
        "de": "Start",
        "it": "Home",
    }
    if slug == "index":
        return []
    crumbs: list[dict] = [{"label": home_labels.get(lang, "Home"), "href": url_for_slug(lang, "index")}]
    if slug == "graph":
        graph_labels = {
            "en": "Graph",
            "ja": "グラフ",
            "es": "Grafo",
            "el": "Γράφος",
            "fr": "Graphe",
            "de": "Graph",
            "it": "Grafo",
        }
        crumbs.append({"label": graph_labels.get(lang, "Graph"), "href": ""})
        return crumbs

    labels = section_labels(lang)
    parts = slug.split("/")
    path_acc = ""
    for i, part in enumerate(parts):
        path_acc = part if not path_acc else f"{path_acc}/{part}"
        is_last = i == len(parts) - 1
        key = (lang, path_acc)
        if is_last:
            crumbs.append({"label": title, "href": ""})
        elif key in pages:
            if i == 0 and part in labels:
                seg = labels[part]
            else:
                seg = pages[key].title
            crumbs.append({"label": seg, "href": pages[key].html_path})
        elif i == 0 and part in labels:
            hub = section_hub(lang, part)
            crumbs.append({"label": labels[part], "href": hub or ""})
    return crumbs


def index_cards_for(lang: str) -> list[dict]:
    cards = {
        "en": [
            ("Start Here", "Week 1 checklist & curriculum map", "guides/start-here", True),
            ("Arts", "Eight hyoho arts + battojutsu", "arts/_index", False),
            ("12 Seiho", "Tachiai battojutsu curriculum", "techniques/tachiai-12-kata", False),
            ("Kurai (位)", "Miden body positions & stances", "concepts/miden-kurai-no-koto", False),
            ("Reiho", "Etiquette, dress, dojo conduct", "reiho/_index", False),
            ("Philosophy", "Essays on practice & tradition", "philosophy/_index", False),
            ("Shinanjo (dojo)", "Japan branches & schedules", "dojo/overview", False),
            ("Articles", "Blog archive (291 posts)", "articles/_index", False),
        ],
        "ja": [
            ("はじめに", "第1週チェックリスト・カリキュラム", "guides/start-here", True),
            ("兵法", "八つの art と抜刀術", "arts/_index", False),
            ("十二勢法", "立相抜刀術カリキュラム", "techniques/tachiai-12-kata", False),
            ("位", "身伝・位の事", "concepts/miden-kurai-no-koto", False),
            ("礼法", "礼儀・装束・道場", "reiho/_index", False),
            ("思想", "修行と伝統のエッセイ", "philosophy/_index", False),
            ("指南所（道場）", "稽古場・日程", "dojo/overview", False),
            ("記事", "ブログアーカイブ（291件）", "articles/_index", False),
        ],
        "es": [
            ("Empezar", "Semana 1 y mapa del currículo", "guides/start-here", True),
            ("Artes", "Ocho artes de hyoho", "arts/_index", False),
            ("12 Seiho", "Currículo de battojutsu", "techniques/tachiai-12-kata", False),
            ("Kurai (位)", "Posiciones del Miden", "concepts/miden-kurai-no-koto", False),
            ("Reiho", "Etiqueta y conducta", "reiho/_index", False),
            ("Filosofía", "Ensayos sobre la práctica", "philosophy/_index", False),
            ("Shinanjo (dojo)", "Sedes en Japón", "dojo/overview", False),
            ("Artículos", "Archivo del blog", "articles/_index", False),
        ],
        "el": [
            ("Ξεκινήστε", "Εβδομάδα 1 & χάρτης προγράμματος", "guides/start-here", True),
            ("Τέχνες", "Οκτώ τέχνες hyoho", "arts/_index", False),
            ("12 Seiho", "Πρόγραμμα battojutsu", "techniques/tachiai-12-kata", False),
            ("Kurai (位)", "Θέσεις Miden", "concepts/miden-kurai-no-koto", False),
            ("Reiho", "Ετικέτα & συμπεριφορά", "reiho/_index", False),
            ("Φιλοσοφία", "Δοκίμια πρακτικής", "philosophy/_index", False),
            ("Shinanjo (dojo)", "Καταστήματα στην Ιαπωνία", "dojo/overview", False),
            ("Άρθρα", "Αρχείο ιστολογίου", "articles/_index", False),
        ],
        "fr": [
            ("Commencer", "Semaine 1 et parcours élève", "guides/start-here", True),
            ("Arts", "Huit arts du hyōhō", "arts/_index", False),
            ("12 Seiho", "Programme battojutsu", "techniques/tachiai-12-kata", False),
            ("Kurai (位)", "Positions Miden", "concepts/miden-kurai-no-koto", False),
            ("Reiho", "Étiquette et conduite", "reiho/_index", False),
            ("Philosophie", "Essais sur la pratique", "philosophy/_index", False),
            ("Shinanjo (dojo)", "Dojos au Japon", "dojo/overview", False),
            ("Articles", "Archives du blog", "articles/_index", False),
        ],
        "de": [
            ("Einstieg", "Woche 1 & Lehrplan", "guides/start-here", True),
            ("Künste", "Acht Hyōhō-Künste", "arts/_index", False),
            ("12 Seiho", "Battojutsu-Lehrplan", "techniques/tachiai-12-kata", False),
            ("Kurai (位)", "Miden-Positionen", "concepts/miden-kurai-no-koto", False),
            ("Reiho", "Etikette & Verhalten", "reiho/_index", False),
            ("Philosophie", "Aufsätze zur Praxis", "philosophy/_index", False),
            ("Shinanjo (dojo)", "Dojos in Japan", "dojo/overview", False),
            ("Artikel", "Blog-Archiv", "articles/_index", False),
        ],
        "it": [
            ("Inizia qui", "Settimana 1 e percorso", "guides/start-here", True),
            ("Arti", "Otto arti del hyōhō", "arts/_index", False),
            ("12 Seiho", "Programma battojutsu", "techniques/tachiai-12-kata", False),
            ("Kurai (位)", "Posizioni Miden", "concepts/miden-kurai-no-koto", False),
            ("Reiho", "Etichetta e condotta", "reiho/_index", False),
            ("Filosofia", "Saggi sulla pratica", "philosophy/_index", False),
            ("Shinanjo (dojo)", "Dojo in Giappone", "dojo/overview", False),
            ("Articoli", "Archivio del blog", "articles/_index", False),
        ],
    }
    return [
        {"title": t, "desc": d, "href": url_for_slug(lang, slug), "cta": cta}
        for t, d, slug, cta in cards.get(lang, cards["en"])
    ]


def ui_strings(lang: str) -> dict[str, str]:
    strings = {
        "en": {
            "site_subtitle": "Tenshinryu Hyoho Wiki",
            "footer_lead": "Tenshinryu Hyoho Wiki — compiled from official sources. Not a substitute for live instruction.",
            "footer_kiwami": "Tenshinryu KIWAMI",
            "footer_federation": "International Federation",
            "search_placeholder": "Search…",
            "graph_label": "Graph",
            "home_label": "Home",
            "graph_title": "Graph",
            "graph_hint": "Labels always visible · drag nodes · scroll to zoom · click to open",
            "nav_menu_label": "Menu",
            "nav_main_label": "Main navigation",
            "nav_lang_label": "Language",
            "nav_footer_label": "Footer navigation",
            "breadcrumb_label": "Breadcrumb",
            "toc_label": "On this page",
            "index_hero_title": "Tenshinryu Hyoho Wiki",
            "index_hero_lead": "Structured knowledge for students — start with the Week 1 path, then explore arts, seiho, and kurai.",
            "index_cta_label": "Start Here →",
            "index_cards_label": "Explore by topic",
            "index_full_heading": "Full index",
            "ask_label": "Ask",
            "ask_placeholder": "Ask about Tenshinryu…",
            "ask_submit": "Ask",
            "ask_loading": "Thinking…",
            "ask_sources": "Sources",
            "ask_error": "Could not get an answer. Try search instead.",
            "ask_error_rate": "Too many questions — please wait and try again.",
        },
        "ja": {
            "site_subtitle": "天心流兵法ウィキ",
            "footer_lead": "天心流兵法ウィキ — 公式ソースに基づく。実地の指導に代わるものではない。",
            "footer_kiwami": "天心流 KIWAMI",
            "footer_federation": "国際連盟",
            "search_placeholder": "検索…",
            "graph_label": "グラフ",
            "home_label": "ホーム",
            "graph_title": "グラフ",
            "graph_hint": "常にラベル表示 · ドラッグで移動 · スクロールで拡大 · クリックでページへ",
            "nav_menu_label": "メニュー",
            "nav_main_label": "メインナビ",
            "nav_lang_label": "言語",
            "nav_footer_label": "フッターナビ",
            "breadcrumb_label": "パンくず",
            "toc_label": "このページ",
            "index_hero_title": "天心流兵法ウィキ",
            "index_hero_lead": "門人向けナレッジベース — 第1週の入門パスから、兵法・勢法・位へ。",
            "index_cta_label": "はじめに →",
            "index_cards_label": "トピックから探す",
            "index_full_heading": "全文索引",
            "ask_label": "質問",
            "ask_placeholder": "天心流について質問…",
            "ask_submit": "質問する",
            "ask_loading": "考え中…",
            "ask_sources": "出典",
            "ask_error": "回答できませんでした。検索をお試しください。",
            "ask_error_rate": "質問が多すぎます。しばらく待ってから再度お試しください。",
        },
        "es": {
            "site_subtitle": "Wiki de Hyōhō Tenshinryu",
            "footer_lead": "Wiki de Hyōhō Tenshinryu — compilado de fuentes oficiales. No sustituye la instrucción presencial.",
            "footer_kiwami": "Tenshinryu KIWAMI",
            "footer_federation": "Federación Internacional",
            "search_placeholder": "Buscar…",
            "graph_label": "Grafo",
            "home_label": "Inicio",
            "graph_title": "Grafo",
            "graph_hint": "Etiquetas visibles · arrastrar nodos · desplazar para zoom · clic para abrir",
            "nav_menu_label": "Menú",
            "nav_main_label": "Navegación principal",
            "nav_lang_label": "Idioma",
            "nav_footer_label": "Navegación del pie",
            "breadcrumb_label": "Migas de pan",
            "toc_label": "En esta página",
            "index_hero_title": "Wiki de Hyōhō Tenshinryu",
            "index_hero_lead": "Base de conocimiento para estudiantes — empieza con la Semana 1, luego artes, seiho y kurai.",
            "index_cta_label": "Empezar →",
            "index_cards_label": "Explorar por tema",
            "index_full_heading": "Índice completo",
            "ask_label": "Preguntar",
            "ask_placeholder": "Pregunta sobre Tenshinryu…",
            "ask_submit": "Preguntar",
            "ask_loading": "Pensando…",
            "ask_sources": "Fuentes",
            "ask_error": "No se pudo obtener respuesta. Prueba la búsqueda.",
            "ask_error_rate": "Demasiadas preguntas — espera e inténtalo de nuevo.",
        },
        "el": {
            "site_subtitle": "Wiki Hyōhō Tenshinryu",
            "footer_lead": "Wiki Hyōhō Tenshinryu — συγκεντρωμένο από επίσημες πηγές. Δεν αντικαθιστά τη ζωντανή διδασκαλία.",
            "footer_kiwami": "Tenshinryu KIWAMI",
            "footer_federation": "Διεθνής Ομοσπονδία",
            "search_placeholder": "Αναζήτηση…",
            "graph_label": "Γράφος",
            "home_label": "Αρχική",
            "graph_title": "Γράφος",
            "graph_hint": "Ετικέτες πάντα ορατές · σύρετε κόμβους · κύλιση για ζουμ · κλικ για άνοιγμα",
            "nav_menu_label": "Μενού",
            "nav_main_label": "Κύρια πλοήγηση",
            "nav_lang_label": "Γλώσσα",
            "nav_footer_label": "Πλοήγηση υποσέλιδου",
            "breadcrumb_label": "Διαδρομή",
            "toc_label": "Σε αυτή τη σελίδα",
            "index_hero_title": "Wiki Hyōhō Tenshinryu",
            "index_hero_lead": "Γνώση για μαθητές — ξεκινήστε με την Εβδομάδα 1, μετά τέχνες, seiho και kurai.",
            "index_cta_label": "Ξεκινήστε →",
            "index_cards_label": "Εξερεύνηση ανά θέμα",
            "index_full_heading": "Πλήρες ευρετήριο",
            "ask_label": "Ερώτηση",
            "ask_placeholder": "Ρωτήστε για το Tenshinryu…",
            "ask_submit": "Ερώτηση",
            "ask_loading": "Σκέψη…",
            "ask_sources": "Πηγές",
            "ask_error": "Δεν ήταν δυνατή η απάντηση. Δοκιμάστε την αναζήτηση.",
            "ask_error_rate": "Πολλές ερωτήσεις — περιμένετε και δοκιμάστε ξανά.",
        },
        "fr": {
            "site_subtitle": "Wiki Hyōhō Tenshinryu",
            "footer_lead": "Wiki Hyōhō Tenshinryu — compilé à partir de sources officielles. Ne remplace pas l'enseignement en présentiel.",
            "footer_kiwami": "Tenshinryu KIWAMI",
            "footer_federation": "Fédération internationale",
            "search_placeholder": "Rechercher…",
            "graph_label": "Graphe",
            "home_label": "Accueil",
            "graph_title": "Graphe",
            "graph_hint": "Étiquettes visibles · glisser les nœuds · défilement pour zoomer · clic pour ouvrir",
            "nav_menu_label": "Menu",
            "nav_main_label": "Navigation principale",
            "nav_lang_label": "Langue",
            "nav_footer_label": "Navigation du pied de page",
            "breadcrumb_label": "Fil d'Ariane",
            "toc_label": "Sur cette page",
            "index_hero_title": "Wiki Hyōhō Tenshinryu",
            "index_hero_lead": "Base de connaissances pour les élèves — commencez par la Semaine 1, puis arts, seiho et kurai.",
            "index_cta_label": "Commencer →",
            "index_cards_label": "Explorer par thème",
            "index_full_heading": "Index complet",
            "ask_label": "Demander",
            "ask_placeholder": "Question sur Tenshinryu…",
            "ask_submit": "Demander",
            "ask_loading": "Réflexion…",
            "ask_sources": "Sources",
            "ask_error": "Impossible d'obtenir une réponse. Essayez la recherche.",
            "ask_error_rate": "Trop de questions — attendez et réessayez.",
        },
        "de": {
            "site_subtitle": "Tenshinryu Hyōhō Wiki",
            "footer_lead": "Tenshinryu Hyōhō Wiki — zusammengestellt aus offiziellen Quellen. Ersetzt keine Unterricht vor Ort.",
            "footer_kiwami": "Tenshinryu KIWAMI",
            "footer_federation": "Internationale Föderation",
            "search_placeholder": "Suchen…",
            "graph_label": "Graph",
            "home_label": "Start",
            "graph_title": "Graph",
            "graph_hint": "Beschriftungen sichtbar · Knoten ziehen · scrollen zum Zoomen · Klick zum Öffnen",
            "nav_menu_label": "Menü",
            "nav_main_label": "Hauptnavigation",
            "nav_lang_label": "Sprache",
            "nav_footer_label": "Fußzeilen-Navigation",
            "breadcrumb_label": "Brotkrumen",
            "toc_label": "Auf dieser Seite",
            "index_hero_title": "Tenshinryu Hyōhō Wiki",
            "index_hero_lead": "Wissensbasis für Schüler — beginnen Sie mit Woche 1, dann Künste, Seiho und Kurai.",
            "index_cta_label": "Einstieg →",
            "index_cards_label": "Nach Thema erkunden",
            "index_full_heading": "Vollständiger Index",
            "ask_label": "Fragen",
            "ask_placeholder": "Frage zu Tenshinryu…",
            "ask_submit": "Fragen",
            "ask_loading": "Denke nach…",
            "ask_sources": "Quellen",
            "ask_error": "Keine Antwort möglich. Versuchen Sie die Suche.",
            "ask_error_rate": "Zu viele Fragen — bitte warten und erneut versuchen.",
        },
        "it": {
            "site_subtitle": "Wiki Hyōhō Tenshinryu",
            "footer_lead": "Wiki Hyōhō Tenshinryu — compilato da fonti ufficiali. Non sostituisce l'insegnamento dal vivo.",
            "footer_kiwami": "Tenshinryu KIWAMI",
            "footer_federation": "Federazione internazionale",
            "search_placeholder": "Cerca…",
            "graph_label": "Grafo",
            "home_label": "Home",
            "graph_title": "Grafo",
            "graph_hint": "Etichette sempre visibili · trascina i nodi · scorri per zoomare · clic per aprire",
            "nav_menu_label": "Menu",
            "nav_main_label": "Navigazione principale",
            "nav_lang_label": "Lingua",
            "nav_footer_label": "Navigazione piè di pagina",
            "breadcrumb_label": "Percorso",
            "toc_label": "In questa pagina",
            "index_hero_title": "Wiki Hyōhō Tenshinryu",
            "index_hero_lead": "Base di conoscenza per gli allievi — inizia dalla Settimana 1, poi arti, seiho e kurai.",
            "index_cta_label": "Inizia qui →",
            "index_cards_label": "Esplora per argomento",
            "index_full_heading": "Indice completo",
            "ask_label": "Chiedi",
            "ask_placeholder": "Domanda su Tenshinryu…",
            "ask_submit": "Chiedi",
            "ask_loading": "Riflessione…",
            "ask_sources": "Fonti",
            "ask_error": "Impossibile ottenere una risposta. Prova la ricerca.",
            "ask_error_rate": "Troppe domande — attendi e riprova.",
        },
    }
    return strings.get(lang, strings["en"])


def ask_js_strings(lang: str) -> str:
    ui = ui_strings(lang)
    payload = {
        "loading": ui["ask_loading"],
        "sources": ui["ask_sources"],
        "error": ui["ask_error"],
        "errorRate": ui["ask_error_rate"],
    }
    return json.dumps(payload, ensure_ascii=False)


def template_context(
    lang: str,
    slug: str,
    page: Page,
    alternate: dict[str, str],
    pages: dict[tuple[str, str], Page],
) -> dict:
    ui = ui_strings(lang)
    return {
        "css_version": CSS_VERSION,
        "lang": lang,
        "slug": slug,
        "alternate": alternate,
        "nav_items": nav_items_for(lang, slug),
        "curriculum_subnav": curriculum_subnav_for(lang),
        "breadcrumbs": build_breadcrumbs(lang, slug, page.title, pages),
        "active_page": "graph" if slug == "graph" else "page",
        "is_index": slug == "index",
        "index_cards": index_cards_for(lang) if slug == "index" else [],
        "ask_js_strings": ask_js_strings(lang),
        **ui,
    }


def extract_link_targets(body: str, page: Page, pages: dict[tuple[str, str], Page]) -> list[str]:
    """Return slug targets linked from this page (same language)."""
    targets: list[str] = []
    lang_pat = "|".join(LANGS)

    def add_target(raw: str) -> None:
        raw = raw.strip().lstrip("/")
        if raw.startswith(f"{page.lang}/"):
            raw = raw[len(page.lang) + 1 :]
        if raw.endswith(".md"):
            raw = raw[:-3]
        if raw.startswith("./"):
            base = Path(page.slug).parent
            raw = (base / raw[2:]).as_posix()
        elif raw.startswith("../"):
            base = Path(page.slug).parent
            raw = (base / raw).as_posix().replace(".md", "")
        if (page.lang, raw) in pages:
            targets.append(raw)

    for m in WIKILINK_RE.finditer(body):
        add_target(m.group(1))

    for m in MD_LINK_RE.finditer(body):
        href = m.group(2)
        if href.startswith(("http://", "https://", "mailto:", "#")):
            continue
        cross = re.match(rf"^(?:\.\./)+((?:{LANG_ALT}))/(.+?)(?:\.md)?", href)
        if cross:
            link_lang, rest = cross.group(1), cross.group(2).replace(".md", "")
            if link_lang == page.lang:
                add_target(rest)
            continue
        if href.endswith(".md") or href.startswith(("./", "../")):
            add_target(href)

    return targets


def node_group(slug: str) -> str:
    if slug == "index":
        return "overview"
    return slug.split("/")[0] if "/" in slug else "overview"


def node_label(slug: str, title: str, lang: str) -> str:
    index_labels = {
        "en": "Index",
        "ja": "索引",
        "es": "Índice",
        "el": "Ευρετήριο",
        "fr": "Index",
        "de": "Index",
        "it": "Indice",
    }
    if slug == "index":
        return index_labels.get(lang, "Index")
    if len(title) <= 30:
        return title
    short = slug.split("/")[-1].replace("-", " ")
    if len(short) <= 28:
        return short
    return short[:26] + "…"


def build_graph_data(lang: str, pages: dict[tuple[str, str], Page]) -> dict:
    nodes: dict[str, dict] = {}
    link_set: set[tuple[str, str]] = set()

    for (plang, slug), page in pages.items():
        if plang != lang:
            continue
        nodes[slug] = {
            "id": slug,
            "title": page.title,
            "label": node_label(slug, page.title, lang),
            "url": page.html_path,
            "group": node_group(slug),
        }

    for (plang, slug), page in pages.items():
        if plang != lang:
            continue
        md_path = WIKI / lang / f"{slug}.md"
        _, body = parse_frontmatter(md_path.read_text(encoding="utf-8"))
        for target in extract_link_targets(body, page, pages):
            if target == slug:
                continue
            pair = tuple(sorted((slug, target)))
            link_set.add(pair)  # type: ignore[arg-type]

    links = [{"source": a, "target": b} for a, b in sorted(link_set)]
    return {
        "nodes": sorted(nodes.values(), key=lambda n: n["id"]),
        "links": links,
    }


def graph_alternate_urls() -> dict[str, str]:
    return {lang: f"/{lang}/graph" for lang in LANGS}


def build_search_index(pages: dict[tuple[str, str], Page]) -> list[dict]:
    """Build search index with section metadata and ranking boosts."""
    section_boost = {
        "guides": 10,
        "techniques": 10,
        "concepts": 10,
        "arts": 10,
        "philosophy": 10,
        "reiho": 10,
        "dojo": 10,
        "people": 10,
        "history": 10,
    }
    essentials_boost = {
        "guides/start-here": 15,
        "synthesis": 15,
        "techniques/tachiai-12-kata": 15,
    }
    items: list[dict] = []
    for (lang, slug), page in sorted(pages.items()):
        md_path = WIKI / lang / f"{slug}.md"
        if not md_path.is_file():
            continue
        section = slug.split("/")[0] if "/" in slug else slug
        if section == "sources":
            continue
        _, body = parse_frontmatter(md_path.read_text(encoding="utf-8"))
        plain = re.sub(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", r"\1", body)
        plain = re.sub(r"[#*_>`|\[\]()]", " ", plain)
        plain = re.sub(r"\s+", " ", plain).strip()[:240]
        boost = section_boost.get(section, 0)
        boost += essentials_boost.get(slug, 0)
        if section == "articles":
            boost -= 5
        labels = section_labels(lang)
        items.append(
            {
                "lang": lang,
                "title": page.title,
                "url": page.html_path,
                "text": plain,
                "section": section,
                "sectionLabel": labels.get(section, section),
                "boost": boost,
            }
        )
    return items


def main() -> None:
    pages = collect_pages()
    if not pages:
        raise SystemExit(f"No wiki pages found under wiki/{{{','.join(LANGS)}}}")

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    (DIST / "assets").mkdir()
    shutil.copytree(ASSETS, DIST / "assets", dirs_exist_ok=True)
    asset_count = copy_raw_assets()

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    page_tpl = env.get_template("page.html.j2")
    index_tpl = env.get_template("index_page.html.j2")
    home_tpl = env.get_template("home.html.j2")
    graph_tpl = env.get_template("graph.html.j2")

    (DIST / "index.html").write_text(home_tpl.render(css_version=CSS_VERSION), encoding="utf-8")

    graph_alternate = graph_alternate_urls()
    for lang in LANGS:
        if not any(pl == lang for pl, _ in pages):
            continue
        graph_data = build_graph_data(lang, pages)
        (DIST / "assets" / f"graph-{lang}.json").write_text(
            json.dumps(graph_data, ensure_ascii=False, indent=0),
            encoding="utf-8",
        )
        graph_page = Page(
            lang=lang,
            slug="graph",
            title=ui_strings(lang)["graph_title"],
            pair="",
            updated="",
            sources=[],
            html_path=f"/{lang}/graph",
        )
        graph_ctx = template_context(lang, "graph", graph_page, graph_alternate, pages)
        graph_out = DIST / lang / "graph.html"
        graph_out.parent.mkdir(parents=True, exist_ok=True)
        graph_out.write_text(
            graph_tpl.render(
                title=graph_ctx["graph_title"],
                description="Wiki link graph",
                hint=graph_ctx["graph_hint"],
                **graph_ctx,
            ),
            encoding="utf-8",
        )

    for (lang, slug), page in pages.items():
        md_path = WIKI / lang / f"{slug}.md"
        meta, body = parse_frontmatter(md_path.read_text(encoding="utf-8"))
        body, use_template_h1 = sanitize_body(body, page.title)
        if slug == "index":
            body, _ = strip_duplicate_title_h1(body, ui_strings(lang)["index_hero_title"])
            if find_body_h1_index(body.splitlines()) is not None:
                lines = body.splitlines()
                h1_idx = find_body_h1_index(lines)
                body = "\n".join(lines[:h1_idx] + lines[h1_idx + 1 :]).lstrip("\n")
        body = inject_seiho_photo(body, page.slug)
        html_content = transform_markdown(body, page, pages, use_template_h1=use_template_h1)
        alternate = pair_urls(page, pages)
        out_dir = DIST / lang / Path(slug).parent if slug != "index" else DIST / lang
        out_dir.mkdir(parents=True, exist_ok=True)
        out_name = "index.html" if slug == "index" else f"{Path(slug).name}.html"
        out_path = out_dir / out_name
        description = page.title[:160]
        ctx = template_context(lang, slug, page, alternate, pages)
        tpl = index_tpl if slug == "index" else page_tpl
        rendered = tpl.render(
            title=page.title,
            description=description,
            content=html_content,
            meta_line=meta_line_html(page),
            render_page_h1=use_template_h1,
            langs=LANGS,
            **ctx,
        )
        out_path.write_text(rendered, encoding="utf-8")

    search_index = build_search_index(pages)
    (DIST / "assets" / "search-index.json").write_text(
        json.dumps(search_index, ensure_ascii=False, indent=0),
        encoding="utf-8",
    )

    count = len(pages)
    print(f"Built {count} pages → {DIST}")
    for lang in LANGS:
        n = sum(1 for l, _ in pages if l == lang)
        if n:
            print(f"  {lang.upper()}: {n}")
    if asset_count:
        print(f"  Assets: {asset_count} file(s) from raw/assets/")


if __name__ == "__main__":
    main()
