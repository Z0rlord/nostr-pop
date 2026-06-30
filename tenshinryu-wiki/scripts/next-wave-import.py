#!/usr/bin/env python3
"""Next-wave wiki import: kata photos, techniques, static pages, EN upgrades, synthesis."""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import quote

import yaml

ROOT = Path(__file__).resolve().parents[1]
WIKI_EN = ROOT / "wiki" / "en"
WIKI_JA = ROOT / "wiki" / "ja"
RAW_WEB = ROOT / "raw" / "web"
RAW_ASSETS = ROOT / "raw" / "assets" / "tachiai-12-kata"
PROMO = ROOT / "raw" / "assets" / "promo"
TODAY = date.today().isoformat()

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
HERO_RE = re.compile(r"\n!\[.*?\]\(/assets/tachiai-12-kata/[^\n]+\)\n", re.DOTALL)
PROMO_RE = re.compile(r"\n!\[.*?\]\(/assets/promo/[^\n]+\)\n", re.DOTALL)

KATA_SLUGS = [
    "omokage", "nukiai", "nukidome", "makihazushi", "yokemigaeshi", "sodegaeshi",
    "shihogiri", "gyakuto", "marukibashi", "ninotachigaeshi", "karamegaeshi", "kesagake-no-koto",
]

TECHNIQUES = [
    {
        "slug": "techniques/chochin-barai",
        "en_title": "Chochin-Barai (提灯抜)",
        "ja_title": "提灯抜 Chochin-Barai",
        "ja_hint": "提灯抜",
        "ja_intro": (
            "新宿支部の稽古で紹介された**提灯抜**（ちょうちんばらい）。"
            "提灯に引っかからぬよう抜刀する技法。"
        ),
        "raw": "raw/web/international-tenshinryu-net-chochin-barai.md",
        "en_intro": (
            "Lantern-sweeping draw technique demonstrated at **Shinjuku branch** practice. "
            "Named *Chōchin-barai* (提灯抜) — sweeping past a hanging lantern without snagging."
        ),
    },
    {
        "slug": "techniques/zanuke",
        "en_title": "Zanuke (坐外)",
        "ja_title": "坐外 Zanuke",
        "ja_hint": "坐外",
        "ja_intro": "背後の敵を討ち、刀を見せぬよう動く**坐外**（ざぬけ）の技法。",
        "raw": "raw/web/international-tenshinryu-net-zanuke--e5-9d-90-e5-a4-96.md",
        "en_intro": "Attack an opponent **behind** you while concealing the sword from their view.",
    },
    {
        "slug": "techniques/tousen-niraminuki",
        "en_title": "Tousen Niraminuki (尖睨抜)",
        "ja_title": "尖睨抜 Tousen Niraminuki",
        "ja_hint": "尖睨抜",
        "ja_intro": (
            "**尖睨抜**（とうせんにらみぬき）— 大太刀を用い、脅されておどおどする振りから抜く技法。"
        ),
        "raw": "raw/web/international-tenshinryu-net-tousen-niraminuki--e5-b0-96-e7-9d-a8-e6-8a-9c.md",
        "en_intro": (
            "Long-sword (*nodachi* / *odachi*) technique: feign fear when threatened, then draw. "
            "Demonstrated with ~100 cm blade; no fixed length rule for nodachi/odachi beyond \"longer than usual.\""
        ),
    },
    {
        "slug": "techniques/bakuchiken",
        "en_title": "Bakuchiken (驀地剣)",
        "ja_title": "驀地剣 Bakuchiken",
        "ja_hint": "驀地剣",
        "ja_intro": (
            "**驀地剣**（ばくちけん）は十二勢法第三の**抜留**（ぬきどめ）の通称。"
            "相手の抜き手を先制する技法。"
        ),
        "raw": "raw/web/international-tenshinryu-net-bakuchiken--e9-a9-80-e5-9c-b0-e5-89-b1.md",
        "en_intro": (
            "Common name for **Nukidome** (抜留), seiho #3 of [[techniques/tachiai-12-kata]]. "
            "Pre-empt the opponent's draw by targeting the drawing hand; low draw hides intent below the partner's sword brim."
        ),
        "cross": "[[techniques/tachiai-12-kata/nukidome]]",
    },
]

PEOPLE_PAGES = [
    {
        "slug": "people/ide-ryusetsu",
        "en_title": "Ide Ryusetsu 井手柳雪 — 11th Shike",
        "ja_title": "第十一世 井手 柳雪",
        "raw": "raw/web/tenshinryu-net-page-795.md",
        "raw_bio": "raw/web/tenshinryu-net-page-132.md",
        "en_summary": (
            "**11th Shike** (since 2019-05-01, Reiwa gannen). Received *mokuroku* (2012) and "
            "*soden inka* from 10th Shike Kuwami Masakumo. Leads international transmission."
        ),
    },
    {
        "slug": "people/kuwami-masakumo",
        "en_title": "Kuwami Masakumo 鍬海政雲 — 10th Shike",
        "ja_title": "第十世 鍬海 政雲一心",
        "raw": "raw/web/tenshinryu-net-page-806.md",
        "raw_bio": "raw/web/tenshinryu-net-page-132.md",
        "en_summary": (
            "**10th Shike** (2012-02-11). Author of 12 seiho textbook, instructor guides, and Miden Kurai-no-Koto. "
            "Built pedagogy, publicity, and global outreach while preserving transmission form."
        ),
    },
]

DOJO_HUB = {
    "slug": "dojo/overview",
    "en_title": "Japan Dojo & Practice Locations",
    "ja_title": "稽古場一覧",
    "raw": "raw/web/tenshinryu-net-page-18.md",
}

DOJO_BRANCHES = [
    ("dojo/honbu", "本部兵法塾", "Honbu Hyoho Juku", "raw/web/tenshinryu-net-page-728.md"),
    ("dojo/shinyurigaoka", "新百合ヶ丘支部", "Shinyurigaoka Branch", "raw/web/tenshinryu-net-page-951.md"),
    ("dojo/shinjuku", "新宿支部", "Shinjuku Branch", "raw/web/tenshinryu-net-page-967.md"),
    ("dojo/setagaya", "世田谷支部", "Setagaya Branch", "raw/web/tenshinryu-net-page-983.md"),
    ("dojo/kawagoe", "川越支部", "Kawagoe Branch", "raw/web/tenshinryu-net-page-995.md"),
    ("dojo/yokohama", "横浜支部", "Yokohama Branch", "raw/web/tenshinryu-net-page-1003.md"),
    ("dojo/kawasaki", "川崎支部", "Kawasaki Branch", "raw/web/tenshinryu-net-page-1012.md"),
    ("dojo/machida", "町田稽古会", "Machida Keikokai", "raw/web/tenshinryu-net-page-1020.md"),
]

HISTORY_PAGES = [
    {
        "slug": "history/instructors",
        "en_title": "Instructor Lineage (師家・指導者)",
        "ja_title": "指導者紹介",
        "raw": "raw/web/tenshinryu-net-page-132.md",
    },
    {
        "slug": "dojo/shinanjo-tradition",
        "en_title": "Shinanjo & Practice Halls (指南所)",
        "ja_title": "指南所と稽古場について",
        "raw": "raw/web/tenshinryu-net-p-35.md",
    },
]

EN_ARTICLE_UPGRADES = [
    "p-29", "p-651", "p-35", "p-2600", "p-67", "p-2605", "p-1766", "p-2893", "p-2747", "p-2584",
]


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    return yaml.safe_load(m.group(1)) or {}, text[m.end():]


def fm_block(*, slug: str, lang: str, title: str, pair: str, tags: list[str], sources: list[str]) -> str:
    lines = [
        "---", f"slug: {slug}", f"lang: {lang}",
        f'title: {json.dumps(title, ensure_ascii=False)}', f"pair: {pair}",
        f"tags: {tags}", "sources:",
    ]
    for s in sources:
        lines.append(f"  - {s}")
    lines.extend([f"updated: {TODAY}", "---", ""])
    return "\n".join(lines)


def asset_url(rel: Path) -> str:
    return "/assets/" + quote(str(rel).replace("\\", "/"), safe="/")


def pick_hero_image(slug: str) -> Path | None:
    d = RAW_ASSETS / slug
    if not d.is_dir():
        return None
    imgs = sorted(p for p in d.rglob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
    named = [p for p in imgs if not p.name.startswith("DSC") and p.parent == d]
    hero = named[0] if named else (imgs[0] if imgs else None)
    return hero.relative_to(ROOT / "raw" / "assets") if hero else None


def extract_paragraphs(raw_rel: str, max_n: int = 8) -> list[str]:
    path = ROOT / raw_rel
    if not path.exists():
        return []
    _, body = parse_frontmatter(path.read_text(encoding="utf-8"))
    paras: list[str] = []
    for line in body.splitlines():
        s = line.strip()
        if len(s) < 40 or s.startswith(">") or s.startswith("#"):
            continue
        if any(x in s for x in ("© 古武術", "最新の投稿", "カテゴリー", "CLOSE", "Prev", "NEXT")):
            continue
        paras.append(s)
        if len(paras) >= max_n:
            break
    return paras


def embed_kata_heroes(stats: dict) -> None:
    for slug in KATA_SLUGS:
        rel = pick_hero_image(slug)
        if not rel:
            continue
        url = asset_url(rel)
        for lang in ("en", "ja"):
            path = WIKI_EN if lang == "en" else WIKI_JA
            md = path / "techniques" / "tachiai-12-kata" / f"{slug}.md"
            if not md.exists():
                continue
            text = md.read_text(encoding="utf-8")
            meta, body = parse_frontmatter(text)
            body = HERO_RE.sub("\n", body)
            alt = meta.get("title", slug)
            hero_md = f"\n![{alt}]({url})\n"
            # insert after first heading
            m = re.search(r"^(#\s+.+?\n)", body, re.M)
            if m:
                body = body[: m.end()] + hero_md + body[m.end():]
            else:
                body = hero_md + body
            md.write_text(
                fm_block(
                    slug=meta["slug"], lang=meta["lang"], title=meta["title"],
                    pair=meta["pair"], tags=meta["tags"], sources=meta.get("sources", []),
                )
                + body.lstrip("\n"),
                encoding="utf-8",
            )
            stats["kata_heroes"] += 1

    promo = PROMO / "12 kata promo.jpg"
    if promo.exists():
        url = asset_url(Path("promo") / promo.name)
        for lang in ("en", "ja"):
            hub = (WIKI_EN if lang == "en" else WIKI_JA) / "techniques" / "tachiai-12-kata.md"
            text = hub.read_text(encoding="utf-8")
            meta, body = parse_frontmatter(text)
            body = PROMO_RE.sub("\n", body)
            m = re.search(r"^(#\s+.+?\n)", body, re.M)
            promo_md = f"\n![12 Kata]({url})\n"
            if m:
                body = body[: m.end()] + promo_md + body[m.end():]
            else:
                body = promo_md + body
            hub.write_text(
                fm_block(slug=meta["slug"], lang=meta["lang"], title=meta["title"],
                         pair=meta["pair"], tags=meta["tags"], sources=meta.get("sources", []))
                + body.lstrip("\n"),
                encoding="utf-8",
            )
            stats["hub_promo"] += 1


def write_technique_pages(stats: dict) -> None:
    for spec in TECHNIQUES:
        paras = extract_paragraphs(spec["raw"])
        cross = spec.get("cross", "")
        en_body = f"# {spec['en_title']}\n\n{spec['en_intro']}\n\n"
        if paras:
            en_body += "\n\n".join(paras[:4]) + "\n\n"
        if cross:
            en_body += f"Related seiho: {cross}\n\n"
        en_body += f"Source: [[sources/{Path(spec['raw']).stem}]]\n"

        ja_body = f"# {spec['ja_title']}\n\n"
        ja_body += (
            f"> **英語版のみ** — international.tenshinryu.net の英語記事です。日本語訳は未着手です。\n\n"
            f"{spec.get('ja_intro', spec['ja_hint'])}\n\n"
            f"全文は英語版を参照してください。\n"
        )
        if cross:
            ja_body += f"\n関連勢法: {cross}\n"
        ja_body += f"\n出典: [[sources/{Path(spec['raw']).stem}]]  \n"
        ja_body += f"英語: [../../en/{spec['slug']}.md](../../en/{spec['slug']}.md)\n"

        for lang, body, title in (
            ("en", en_body, spec["en_title"]),
            ("ja", ja_body, spec["ja_title"]),
        ):
            wiki = WIKI_EN if lang == "en" else WIKI_JA
            out = wiki / f"{spec['slug']}.md"
            if out.exists():
                continue
            pair_lang = "ja" if lang == "en" else "en"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(
                fm_block(slug=spec["slug"], lang=lang, title=title, pair=f"{pair_lang}/{spec['slug']}",
                         tags=["technique"], sources=[spec["raw"]]) + body,
                encoding="utf-8",
            )
            stats["techniques"] += 1

        # source summaries
        for lang in ("en", "ja"):
            src_path = (WIKI_EN if lang == "en" else WIKI_JA) / "sources" / f"{Path(spec['raw']).stem}.md"
            if src_path.exists():
                continue
            title = spec["en_title"] if lang == "en" else spec["ja_title"]
            bullets = "\n".join(f"- {p[:250]}" for p in paras[:4])
            src_path.parent.mkdir(parents=True, exist_ok=True)
            src_path.write_text(
                fm_block(slug=f"sources/{Path(spec['raw']).stem}", lang=lang, title=f"Source: {title}",
                         pair=f"{'ja' if lang == 'en' else 'en'}/sources/{Path(spec['raw']).stem}",
                         tags=["source"], sources=[spec["raw"]])
                + f"# Source — {title}\n\n{bullets}\n\n- [[{spec['slug']}]]\n",
                encoding="utf-8",
            )
            stats["sources"] += 1


def write_people_pages(stats: dict) -> None:
    for spec in PEOPLE_PAGES:
        paras = extract_paragraphs(spec["raw"], max_n=12)
        bio_paras = extract_paragraphs(spec.get("raw_bio", ""), max_n=20)
        for lang in ("en", "ja"):
            out = (WIKI_EN if lang == "en" else WIKI_JA) / f"{spec['slug']}.md"
            if out.exists() and lang == "en" and "tenshinryu-net-page" not in out.read_text():
                continue
            pair_lang = "ja" if lang == "en" else "en"
            if lang == "en":
                body = f"# {spec['en_title']}\n\n{spec['en_summary']}\n\n"
                body += "\n\n".join(paras[:8]) + "\n\n"
                body += "See also: [[people/nakamura-tenshin]], [[history/instructors]]\n"
            else:
                body = f"# {spec['ja_title']}\n\n" + "\n\n".join(paras[:10]) + "\n\n"
                body += "関連: [[people/nakamura-tenshin]]、[[history/instructors]]\n"
            sources = [s for s in [spec["raw"], spec.get("raw_bio")] if s]
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(
                fm_block(slug=spec["slug"], lang=lang, title=spec["en_title"] if lang == "en" else spec["ja_title"],
                         pair=f"{pair_lang}/{spec['slug']}", tags=["people", "lineage"], sources=sources)
                + body,
                encoding="utf-8",
            )
            stats["people"] += 1

    # enrich nakamura from page-802
    paras = extract_paragraphs("raw/web/tenshinryu-net-page-802.md", max_n=10)
    for lang in ("en", "ja"):
        out = (WIKI_EN if lang == "en" else WIKI_JA) / "people/nakamura-tenshin.md"
        text = out.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(text)
        if "tenshinryu-net-page-802" in meta.get("sources", []):
            continue
        meta.setdefault("sources", []).append("raw/web/tenshinryu-net-page-802.md")
        meta["updated"] = TODAY
        if lang == "ja" and paras:
            extra = "\n\n## tenshinryu.net より\n\n" + "\n\n".join(paras[:6]) + "\n"
            if "## tenshinryu.net" not in body:
                body = body.rstrip() + extra + "\n"
        elif lang == "en" and paras:
            extra = (
                "\n\n## From tenshinryu.net\n\n"
                + "Shike message: Tenshinryu traces to **Shirin-dan** under Yagyū Munenori; "
                + "preserves bushi etiquette and **maai**; invites newcomers to experience "
                + "Bunki-era martial arts.\n\n"
            )
            if "## From tenshinryu.net" not in body:
                body = body.rstrip() + extra + "\n"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(
            fm_block(slug=meta["slug"], lang=meta["lang"], title=meta["title"], pair=meta["pair"],
                     tags=meta["tags"], sources=meta["sources"]) + body.lstrip("\n"),
            encoding="utf-8",
        )
        stats["people"] += 1


def write_dojo_pages(stats: dict) -> None:
    paras = extract_paragraphs(DOJO_HUB["raw"], max_n=15)
    for lang in ("en", "ja"):
        out = (WIKI_EN if lang == "en" else WIKI_JA) / f"{DOJO_HUB['slug']}.md"
        pair_lang = "ja" if lang == "en" else "en"
        if lang == "en":
            body = (
                f"# {DOJO_HUB['en_title']}\n\n"
                "Kanto-region **shinanjo** (指南所) and branch practice locations. "
                "Tenshinryu prefers *shinanjo* over *dōjō* — a place for transmission, not only group drill.\n\n"
                "## Branches\n\n"
                "| Branch | Page |\n|--------|------|\n"
            )
            for slug, _ja, en, _raw in DOJO_BRANCHES:
                body += f"| {en} | [[{slug}]] |\n"
            body += "\n" + "\n\n".join(paras[:12]) + "\n"
        else:
            body = f"# {DOJO_HUB['ja_title']}\n\n" + "\n\n".join(paras[:15]) + "\n"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(
            fm_block(slug=DOJO_HUB["slug"], lang=lang,
                     title=DOJO_HUB["en_title"] if lang == "en" else DOJO_HUB["ja_title"],
                     pair=f"{pair_lang}/{DOJO_HUB['slug']}", tags=["dojo"], sources=[DOJO_HUB["raw"]])
            + body,
            encoding="utf-8",
        )
        stats["dojo"] += 1

    for slug, ja_title, en_title, raw in DOJO_BRANCHES:
        paras = extract_paragraphs(raw, max_n=10)
        for lang in ("en", "ja"):
            out = (WIKI_EN if lang == "en" else WIKI_JA) / f"{slug}.md"
            if out.exists():
                continue
            pair_lang = "ja" if lang == "en" else "en"
            title = en_title if lang == "en" else ja_title
            body = f"# {title}\n\n" + ("\n\n".join(paras) if paras else f"Branch page from tenshinryu.net.") + "\n"
            body += f"\n[[dojo/overview]]\n"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(
                fm_block(slug=slug, lang=lang, title=title, pair=f"{pair_lang}/{slug}",
                         tags=["dojo", "branch"], sources=[raw]) + body,
                encoding="utf-8",
            )
            stats["dojo"] += 1


def write_history_pages(stats: dict) -> None:
    for spec in HISTORY_PAGES:
        paras = extract_paragraphs(spec["raw"], max_n=20)
        for lang in ("en", "ja"):
            out = (WIKI_EN if lang == "en" else WIKI_JA) / f"{spec['slug']}.md"
            pair_lang = "ja" if lang == "en" else "en"
            title = spec["en_title"] if lang == "en" else spec["ja_title"]
            if lang == "en" and spec["slug"] == "history/instructors":
                body = (
                    f"# {title}\n\n"
                    "Shike (師家) and senior instructors from [tenshinryu.net](https://tenshinryu.net/).\n\n"
                    "| Generation | Name | Page |\n|------------|------|------|\n"
                    "| 11th | Ide Ryusetsu | [[people/ide-ryusetsu]] |\n"
                    "| 10th | Kuwami Masakumo | [[people/kuwami-masakumo]] |\n"
                    "| 9th | Nakamura Tenshin | [[people/nakamura-tenshin]] |\n\n"
                )
                body += "\n\n".join(paras[:15]) + "\n"
            elif lang == "en" and spec["slug"] == "dojo/shinanjo-tradition":
                body = (
                    f"# {title}\n\n"
                    "Why Tenshinryu uses **shinanjo** (指南所) rather than *dōjō*: Buddhist term repurposed "
                    "in Meiji; Ishii Seizo preserved original vocabulary. Practice is self-directed; "
                    "the hall is for *shinan* (guidance), not spectacle.\n\n"
                )
                body += "\n\n".join(paras[:12]) + "\n"
            else:
                body = f"# {title}\n\n" + "\n\n".join(paras[:18]) + "\n"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(
                fm_block(slug=spec["slug"], lang=lang, title=title, pair=f"{pair_lang}/{spec['slug']}",
                         tags=["history" if spec["slug"].startswith("history") else "dojo"],
                         sources=[spec["raw"]]) + body,
                encoding="utf-8",
            )
            stats["history"] += 1


def upgrade_en_articles(stats: dict) -> None:
    summaries = {
        "p-29": (
            "Essay on **bugō** (武号) culture in East Asia: origins with Ouyang Xiu, "
            "**tōgō** vs **shitsugō**, Nakamura Tenshin receiving the name from Ishii Seizo, "
            "and Kuwami Masakumo's full surname change as martial name."
        ),
        "p-651": (
            "10th Shike Kuwami Masakumo explains **sōden inka** (相伝印可) to Ide Ryusetsu as 11th Shike "
            "(2022 handover; formal since 2012). Risk management for succession; Ide was bridge to enrollment."
        ),
        "p-35": (
            "History of *dōjō* vs **shinanjo**: Meiji budo reform; Ishii's signboard; "
            "**mitadori keiko** (見盗り稽古) — steal techniques by serious observation."
        ),
        "p-2600": "Kata culture essay — \"one glance cannot capture a bird; many glances cannot capture one bird.\"",
        "p-67": "Reiho (礼法) article from tenshinryu.net on etiquette in practice.",
        "p-2605": "Kata culture — critique of \"too many techniques\"; transmission integrity.",
        "p-1766": "Starting classical martial arts from zero — beginner orientation.",
        "p-2893": "Meeting of Nakamura Tenshin and Ide Ryusetsu — enrollment story.",
        "p-2747": "Fukuro-shinai (袋竹刀) — bag bamboo sword training tool.",
        "p-2584": "Kata culture — on proliferation of techniques across generations.",
    }
    for slug in EN_ARTICLE_UPGRADES:
        en_path = WIKI_EN / "articles" / f"{slug}.md"
        ja_path = WIKI_JA / "articles" / f"{slug}.md"
        if not en_path.exists() or not ja_path.exists():
            continue
        meta_en, _ = parse_frontmatter(en_path.read_text(encoding="utf-8"))
        _, ja_body = parse_frontmatter(ja_path.read_text(encoding="utf-8"))
        ja_paras = [p.strip() for p in re.split(r"\n{2,}", ja_body) if len(p.strip()) > 50][:5]
        summary = summaries.get(slug, "Key article from tenshinryu.net.")
        en_body = (
            f"# {meta_en.get('title', slug)}\n\n"
            f"{summary}\n\n"
            "## Summary (from Japanese source)\n\n"
            + "\n\n".join(f"- {p[:280]}{'…' if len(p) > 280 else ''}" for p in ja_paras[:4])
            + f"\n\nFull text: [[sources/tenshinryu-net-{slug}]] · JA: [[../ja/articles/{slug}]]\n"
        )
        meta_en["updated"] = TODAY
        en_path.write_text(
            fm_block(slug=meta_en["slug"], lang="en", title=meta_en["title"], pair=meta_en["pair"],
                     tags=meta_en["tags"], sources=meta_en.get("sources", [])) + en_body,
            encoding="utf-8",
        )
        stats["en_upgrades"] += 1


def write_synthesis(stats: dict) -> None:
    en = """# Synthesis

How the major hubs of this wiki fit together — a map for readers and future ingest.

## Core curriculum

[[techniques/tachiai-12-kata]] is the advanced **battojutsu** standing-draw curriculum (12 **seiho**). Each seiho page links to kata photos from Drive-synced assets. Common finishing uses [[concepts/miden-kurai-no-koto|miden kurai]] — especially **Kumoi**, **Sekiun**, and **Seigan** stances documented across [[concepts/kurai/ten-no-kurai|35 individual kurai pages]].

Standalone technique intros (video articles) complement the book: [[techniques/fusa-otoshi]], [[techniques/chochin-barai]], [[techniques/zanuke]], [[techniques/tousen-niraminuki]], [[techniques/bakuchiken]] (→ [[techniques/tachiai-12-kata/nukidome]]).

## Pedagogy & instructor path

[[guides/teaching-beginners]] and [[guides/instructor-3rd-grade]] (four volumes) encode 10th Shike Kuwami Masakumo's teaching method. [[philosophy/onko-chishin]] and related essays stress practice over appearance — consistent with [[dojo/shinanjo-tradition]].

## Lineage & organization

[[history/overview]] → [[history/instructors]] → [[people/nakamura-tenshin]], [[people/kuwami-masakumo]], [[people/ide-ryusetsu]]. Modern **Kanto** practice: [[dojo/overview]] and branch pages. International transmission via ONLINE / KIWAMI (see [[overview]]) runs parallel to dojo tradition.

## Reiho & culture

[[reiho/_index]] covers sageo, kesa, tabi, dojo movement. [[articles/p-29]] explains **bugō** naming. [[philosophy/]] collects thought essays from international.tenshinryu.net.

## Sources

Raw clips live under `raw/web/` and `raw/books/`; each ingested page cites `sources:` frontmatter. Run `scripts/lint-wiki-lang.py` after bulk edits.
"""
    ja = """# 総合ガイド

ウィキの主要ハブの関係 — 読者と今後の取り込み用の地図。

## 核心カリキュラム

[[techniques/tachiai-12-kata]] は立合抜刀術の上級 **十二勢法**。各勢法ページに写真（`raw/assets/tachiai-12-kata/`）。終式は多くが [[concepts/miden-kurai-no-koto|秘伝位の事]] の位（雲居・切雲・青眼など）— [[concepts/kurai/ten-no-kurai|位カタログ]] 参照。

単独技法記事: [[techniques/fusa-otoshi]]、[[techniques/chochin-barai]]、[[techniques/zanuke]]、[[techniques/tousen-niraminuki]]、[[techniques/bakuchiken]]（→ [[techniques/tachiai-12-kata/nukidome]]）。

## 指導・門人

[[guides/teaching-beginners]]、[[guides/instructor-3rd-grade]]（全四巻）。[[dojo/shinanjo-tradition]] — 指南所と見盗り稽古の精神。

## 系譜・組織

[[history/overview]] → [[history/instructors]] → [[people/nakamura-tenshin]]、[[people/kuwami-masakumo]]、[[people/ide-ryusetsu]]。関東の [[dojo/overview]] と各支部。国際展開は ONLINE / KIWAMI（[[overview]]）。

## 礼法・文化

[[reiho/]]、[[articles/p-29]]（武号）、[[philosophy/]]。

英語: [../en/synthesis.md](../en/synthesis.md)
"""
    for lang, body, title in (("en", en, "Synthesis"), ("ja", ja, "総合ガイド")):
        path = (WIKI_EN if lang == "en" else WIKI_JA) / "synthesis.md"
        pair = "ja/synthesis" if lang == "en" else "en/synthesis"
        path.write_text(
            fm_block(slug="synthesis", lang=lang, title=title, pair=pair,
                     tags=["synthesis"], sources=[]) + body,
            encoding="utf-8",
        )
        stats["synthesis"] += 1


def patch_indexes(stats: dict) -> None:
    for lang in ("en", "ja"):
        idx = (WIKI_EN if lang == "en" else WIKI_JA) / "index.md"
        text = idx.read_text(encoding="utf-8")
        if "chochin-barai" in text and "dojo/overview" in text:
            continue
        additions_en = """
| [techniques/chochin-barai.md](./techniques/chochin-barai.md) | Chochin-Barai (提灯抜) |
| [techniques/zanuke.md](./techniques/zanuke.md) | Zanuke (坐外) |
| [techniques/tousen-niraminuki.md](./techniques/tousen-niraminuki.md) | Tousen Niraminuki (尖睨抜) |
| [techniques/bakuchiken.md](./techniques/bakuchiken.md) | Bakuchiken → Nukidome |
"""
        additions_ja = """
| [techniques/chochin-barai.md](./techniques/chochin-barai.md) | 提灯抜 |
| [techniques/zanuke.md](./techniques/zanuke.md) | 坐外 |
| [techniques/tousen-niraminuki.md](./techniques/tousen-niraminuki.md) | 尖睨抜 |
| [techniques/bakuchiken.md](./techniques/bakuchiken.md) | 驀地剣 → 抜留 |
"""
        people_en = """
| [people/ide-ryusetsu.md](./people/ide-ryusetsu.md) | 11th Shike Ide Ryusetsu |
| [people/kuwami-masakumo.md](./people/kuwami-masakumo.md) | 10th Shike Kuwami Masakumo |
| [history/instructors.md](./history/instructors.md) | Instructor lineage hub |
"""
        people_ja = """
| [people/ide-ryusetsu.md](./people/ide-ryusetsu.md) | 第十一世 井手柳雪 |
| [people/kuwami-masakumo.md](./people/kuwami-masakumo.md) | 第十世 鍬海政雲 |
| [history/instructors.md](./history/instructors.md) | 指導者紹介 |
"""
        dojo_en = """
## Dojo (Japan)

| Page | Summary |
|------|---------|
| [dojo/overview.md](./dojo/overview.md) | Kanto branches & schedule hub |
| [dojo/shinanjo-tradition.md](./dojo/shinanjo-tradition.md) | Shinanjo vs dōjō |
"""
        dojo_ja = """
## 道場・稽古場

| ページ | 概要 |
|--------|------|
| [dojo/overview.md](./dojo/overview.md) | 稽古場一覧 |
| [dojo/shinanjo-tradition.md](./dojo/shinanjo-tradition.md) | 指南所と稽古場 |
"""
        if lang == "en":
            text = text.replace(
                "| [techniques/nedachi.md](./techniques/nedachi.md) | Nedachi (根立) |",
                "| [techniques/nedachi.md](./techniques/nedachi.md) | Nedachi (根立) |\n" + additions_en.strip(),
            )
            text = text.replace(
                "| [people/nakamura-tenshin.md](./people/nakamura-tenshin.md) | 9th Shike — biography from Miden text |",
                "| [people/nakamura-tenshin.md](./people/nakamura-tenshin.md) | 9th Shike — biography from Miden text |\n" + people_en.strip(),
            )
            text = text.replace(
                "| [synthesis.md](./synthesis.md) | *(placeholder)* evolving cross-topic synthesis |",
                "| [synthesis.md](./synthesis.md) | Cross-topic hub map |",
            )
            if "## Dojo" not in text:
                text = text.replace("## Reiho & culture", dojo_en + "\n## Reiho & culture")
        else:
            text = text.replace(
                "| [techniques/nedachi.md](./techniques/nedachi.md) | 根立 |",
                "| [techniques/nedachi.md](./techniques/nedachi.md) | 根立 |\n" + additions_ja.strip(),
            )
            if "## 道場" not in text:
                text = text.replace("## 礼法・文化", dojo_ja + "\n## 礼法・文化")
        idx.write_text(text, encoding="utf-8")
        stats["index"] += 1


def main() -> int:
    stats: dict[str, int] = {
        "kata_heroes": 0, "hub_promo": 0, "techniques": 0, "sources": 0,
        "people": 0, "dojo": 0, "history": 0, "en_upgrades": 0, "synthesis": 0, "index": 0,
    }
    embed_kata_heroes(stats)
    write_technique_pages(stats)
    write_people_pages(stats)
    write_dojo_pages(stats)
    write_history_pages(stats)
    upgrade_en_articles(stats)
    write_synthesis(stats)
    patch_indexes(stats)
    print("Next-wave import:", json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
