#!/usr/bin/env python3
"""Build static HTML wiki from wiki/{en,ja,es,el} markdown."""

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

LANGS = ("en", "ja", "es", "el")

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
WIKILINK_RE = re.compile(r"\[\[([^\]|#]+?)(?:\|([^\]]+?))?\]\]")
# Anchor group must not consume the closing ")" — old [#)] char-class broke table links.
MD_LINK_RE = re.compile(r"(\[[^\]]+\]\()([^)#]+?\.md)(#[^)]*)?\)")


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


def resolve_wikilink(target: str, lang: str, pages: dict[tuple[str, str], Page]) -> tuple[str, bool]:
    target = normalize_wikilink_target(target, lang)
    key = (lang, target)
    if key in pages:
        return pages[key].html_path, True
    if (lang, target.rstrip("/")) in pages:
        return pages[(lang, target.rstrip("/"))].html_path, True
    return url_for_slug(lang, target), False


def md_link_to_html(href: str, page_lang: str, page_slug: str) -> str:
    href = href.strip()
    if href.startswith(("http://", "https://", "mailto:", "#")):
        return href

    m = re.match(rf"^(?:\.\./)+(?:(en|ja|es|el)/)(.+?)(?:\.md)?(?:#.*)?$", href)
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


def transform_markdown(body: str, page: Page, pages: dict[tuple[str, str], Page]) -> str:
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

    return markdown.markdown(
        body,
        extensions=["tables", "fenced_code", "sane_lists", "nl2br"],
        output_format="html5",
    )


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
    labels = {"en": "Updated", "ja": "更新", "es": "Actualizado", "el": "Ενημέρωση"}
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
    }
    return labels.get(lang, labels["en"])


def section_hub(lang: str, section: str) -> str | None:
    """Default hub page per top-level section (for breadcrumbs)."""
    hubs = {
        "guides": "guides/start-here",
        "arts": "arts/_index",
        "techniques": "techniques/tachiai-12-kata",
        "concepts": "concepts/miden-kurai-no-koto",
        "reiho": "reiho/_index",
        "philosophy": "philosophy/onko-chishin",
        "dojo": "dojo/overview",
        "history": "history/overview",
        "people": "history/instructors",
        "articles": "articles/_index",
        "sources": "sources",
    }
    target = hubs.get(section)
    return url_for_slug(lang, target) if target else None


def nav_items_for(lang: str, slug: str) -> list[dict]:
    """Student-focused primary navigation."""
    defs = {
        "en": [
            ("start_here", "Start Here", "guides/start-here", True),
            ("curriculum", "Curriculum", "arts/_index", False),
            ("reiho", "Reiho", "reiho/_index", False),
            ("philosophy", "Philosophy", "philosophy/onko-chishin", False),
            ("dojo", "Shinanjo (dojo)", "dojo/overview", False),
            ("articles", "Articles", "articles/_index", False),
        ],
        "ja": [
            ("start_here", "はじめに", "guides/start-here", True),
            ("curriculum", "カリキュラム", "arts/_index", False),
            ("reiho", "礼法", "reiho/_index", False),
            ("philosophy", "思想", "philosophy/onko-chishin", False),
            ("dojo", "指南所（道場）", "dojo/overview", False),
            ("articles", "記事", "articles/_index", False),
        ],
        "es": [
            ("start_here", "Empezar", "guides/start-here", True),
            ("curriculum", "Currículo", "arts/_index", False),
            ("reiho", "Reiho", "reiho/_index", False),
            ("philosophy", "Filosofía", "philosophy/onko-chishin", False),
            ("dojo", "Shinanjo (dojo)", "dojo/overview", False),
            ("articles", "Artículos", "articles/_index", False),
        ],
        "el": [
            ("start_here", "Ξεκινήστε", "guides/start-here", True),
            ("curriculum", "Πρόγραμμα", "arts/_index", False),
            ("reiho", "Reiho", "reiho/_index", False),
            ("philosophy", "Φιλοσοφία", "philosophy/onko-chishin", False),
            ("dojo", "Shinanjo (dojo)", "dojo/overview", False),
            ("articles", "Άρθρα", "articles/_index", False),
        ],
    }
    items: list[dict] = []
    section = slug.split("/")[0] if "/" in slug else slug
    for key, label, target, cta in defs.get(lang, defs["en"]):
        active = slug == target or (key != "start_here" and section == target.split("/")[0])
        if key == "start_here" and slug.startswith("guides/"):
            active = True
        items.append(
            {
                "key": key,
                "label": label,
                "href": url_for_slug(lang, target),
                "active": active,
                "cta": cta,
            }
        )
    return items


def build_breadcrumbs(
    lang: str, slug: str, title: str, pages: dict[tuple[str, str], Page]
) -> list[dict]:
    home_labels = {"en": "Home", "ja": "ホーム", "es": "Inicio", "el": "Αρχική"}
    crumbs: list[dict] = [{"label": home_labels.get(lang, "Home"), "href": url_for_slug(lang, "index")}]
    if slug == "index":
        return crumbs
    if slug == "graph":
        graph_labels = {"en": "Graph", "ja": "グラフ", "es": "Grafo", "el": "Γράφος"}
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
            ("Start Here", "Week 1 checklist & curriculum map", "guides/start-here"),
            ("Arts", "Eight hyoho arts + battojutsu", "arts/_index"),
            ("12 Seiho", "Tachiai battojutsu curriculum", "techniques/tachiai-12-kata"),
            ("Kurai (位)", "Miden body positions & stances", "concepts/miden-kurai-no-koto"),
            ("Reiho", "Etiquette, dress, dojo conduct", "reiho/_index"),
            ("Philosophy", "Essays on practice & tradition", "philosophy/onko-chishin"),
            ("Shinanjo (dojo)", "Japan branches & schedules", "dojo/overview"),
            ("Articles", "Blog archive (291 posts)", "articles/_index"),
        ],
        "ja": [
            ("はじめに", "第1週チェックリスト・カリキュラム", "guides/start-here"),
            ("兵法", "八つの art と抜刀術", "arts/_index"),
            ("十二勢法", "立相抜刀術カリキュラム", "techniques/tachiai-12-kata"),
            ("位", "身伝・位の事", "concepts/miden-kurai-no-koto"),
            ("礼法", "礼儀・装束・道場", "reiho/_index"),
            ("思想", "修行と伝統のエッセイ", "philosophy/onko-chishin"),
            ("指南所（道場）", "稽古場・日程", "dojo/overview"),
            ("記事", "ブログアーカイブ（291件）", "articles/_index"),
        ],
        "es": [
            ("Empezar", "Semana 1 y mapa del currículo", "guides/start-here"),
            ("Artes", "Ocho artes de hyoho", "arts/_index"),
            ("12 Seiho", "Currículo de battojutsu", "techniques/tachiai-12-kata"),
            ("Kurai (位)", "Posiciones del Miden", "concepts/miden-kurai-no-koto"),
            ("Reiho", "Etiqueta y conducta", "reiho/_index"),
            ("Filosofía", "Ensayos sobre la práctica", "philosophy/onko-chishin"),
            ("Shinanjo (dojo)", "Sedes en Japón", "dojo/overview"),
            ("Artículos", "Archivo del blog", "articles/_index"),
        ],
        "el": [
            ("Ξεκινήστε", "Εβδομάδα 1 & χάρτης προγράμματος", "guides/start-here"),
            ("Τέχνες", "Οκτώ τέχνες hyoho", "arts/_index"),
            ("12 Seiho", "Πρόγραμμα battojutsu", "techniques/tachiai-12-kata"),
            ("Kurai (位)", "Θέσεις Miden", "concepts/miden-kurai-no-koto"),
            ("Reiho", "Ετικέτα & συμπεριφορά", "reiho/_index"),
            ("Φιλοσοφία", "Δοκίμια πρακτικής", "philosophy/onko-chishin"),
            ("Shinanjo (dojo)", "Καταστήματα στην Ιαπωνία", "dojo/overview"),
            ("Άρθρα", "Αρχείο ιστολογίου", "articles/_index"),
        ],
    }
    return [
        {"title": t, "desc": d, "href": url_for_slug(lang, slug)}
        for t, d, slug in cards.get(lang, cards["en"])
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
        },
    }
    return strings.get(lang, strings["en"])


def template_context(
    lang: str,
    slug: str,
    page: Page,
    alternate: dict[str, str],
    pages: dict[tuple[str, str], Page],
) -> dict:
    ui = ui_strings(lang)
    return {
        "lang": lang,
        "slug": slug,
        "alternate": alternate,
        "nav_items": nav_items_for(lang, slug),
        "breadcrumbs": build_breadcrumbs(lang, slug, page.title, pages),
        "active_page": "graph" if slug == "graph" else "page",
        "is_index": slug == "index",
        "index_cards": index_cards_for(lang) if slug == "index" else [],
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
        cross = re.match(rf"^(?:\.\./)+(?:(en|ja|es|el)/)(.+?)(?:\.md)?", href)
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
    index_labels = {"en": "Index", "ja": "索引", "es": "Índice", "el": "Ευρετήριο"}
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
        items.append(
            {
                "lang": lang,
                "title": page.title,
                "url": page.html_path,
                "text": plain,
                "section": section,
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

    (DIST / "index.html").write_text(home_tpl.render(), encoding="utf-8")

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
        html_content = transform_markdown(body, page, pages)
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
