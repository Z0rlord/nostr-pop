#!/usr/bin/env python3
"""Batch-ingest raw sources into wiki/en + wiki/ja pages."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

import yaml

from wiki_international_filter import (
    WEB_SKIP_FRAGMENTS,
    should_skip_international_wiki_source,
)

WIKI_ROOT = Path(__file__).resolve().parents[1]
RAW_WEB = WIKI_ROOT / "raw" / "web"
RAW_BOOKS = WIKI_ROOT / "raw" / "books"
WIKI_EN = WIKI_ROOT / "wiki" / "en"
WIKI_JA = WIKI_ROOT / "wiki" / "ja"
TODAY = date.today().isoformat()

BOILERPLATE_RE = re.compile(
    r"^(?:HOME|CLOSE|キーワード|カテゴリー|タグ|検索|Prev|Next|Private:|"
    r"Introduction of technique|Thought|Tenshinryu Knowledge|"
    r"Japanese Culture|Martial Arts Culture|Movie|NEWS|Seminar|"
    r"A Guide to Learning|TENSHINRYU ONLINE|What Is Tenshinryu).*$",
    re.I,
)

# raw/web slug fragment → (entity_path, category, ja_title_hint)
WEB_ENTITY_MAP: dict[str, tuple[str, str, str]] = {
    "fusa-otoshi": ("techniques/fusa-otoshi", "technique", "房落"),
    "fukuro-jinai": ("techniques/fukuro-jinai", "technique", "袋印内"),
    "nedachi": ("techniques/nedachi", "technique", "根立"),
    "tekoa": ("reiho/tekoa", "reiho", "手甲"),
    "kesa": ("reiho/kesa", "reiho", "袈裟"),
    "keiko-osame": ("reiho/keiko-osame", "reiho", "稽古納め"),
    "about-the-sageo": ("reiho/sageo", "reiho", "下緒"),
    "how-to-wear-tabi": ("reiho/tabi", "reiho", "足袋の履き方"),
    "regarding-movement-inside-the-dojo": ("reiho/dojo-movement", "reiho", "道場内の動き"),
    "the-technique-of-respect": ("reiho/technique-of-respect", "reiho", "礼の技"),
    "a-scene-of-sewing": ("reiho/sewing-haori", "reiho", "縫い物の場面"),
    "traditional-costume-photo-album": ("reiho/traditional-costume", "reiho", "伝統衣装"),
    "onko-chishin": ("philosophy/onko-chishin", "philosophy", "温故知新"),
    "datsuryoku": ("philosophy/datsuryoku", "philosophy", "脱力"),
    "hold-pride-that-is-not-arrogance": ("philosophy/pride-and-humility", "philosophy", "驕りと謙虚"),
    "to-make-a-mistake-and-not-correct-it": ("philosophy/correcting-mistakes", "philosophy", "過ちを正す"),
    "a-discussion-on-apologies": ("philosophy/apologies", "philosophy", "謝罪について"),
    "a-concern-is-that-students-are-not-improving": (
        "philosophy/student-improvement",
        "philosophy",
        "弟子の上達",
    ),
    "lets-be-careful-our-words-build-our-character": (
        "philosophy/words-and-character",
        "philosophy",
        "言葉と人格",
    ),
    "doubts-about-changes-in-tradition": (
        "philosophy/tradition-and-change",
        "philosophy",
        "伝統の変化",
    ),
    "a-message-to-all-tenshin-ryu-practitioners": (
        "philosophy/message-to-practitioners",
        "philosophy",
        "修行者へのメッセージ",
    ),
    "the-culture-of-kataforms-in-japan": ("philosophy/kata-culture", "philosophy", "型の文化"),
    "nature-worship-and-the-spirit-of-respect": (
        "philosophy/nature-worship",
        "philosophy",
        "自然崇拝と敬意",
    ),
    "misunderstandings-and-problems-of-japanese-traditional-martial-arts": (
        "philosophy/martial-arts-misunderstandings",
        "philosophy",
        "古武道の誤解",
    ),
    "1795": ("history/1795", "history", "1795年"),
    "1937-2": ("history/1937", "history", "1937年"),
    "koran-to": ("history/koran-to", "history", "虎乱刀"),
    "chochin-barai": ("techniques/chochin-barai", "technique", "提灯抜"),
    "zanuke": ("techniques/zanuke", "technique", "坐外"),
    "tousen-niraminuki": ("techniques/tousen-niraminuki", "technique", "尖睨抜"),
    "bakuchiken": ("techniques/bakuchiken", "technique", "驀地剣"),
}

INSTRUCTOR_VOLUMES = [
    (
        "Volume I: Conditions for Instructors.txt",
        "第一巻　指導者の条件.txt",
        "vol-1-conditions",
        "Conditions for Instructors",
        "指導者の条件",
    ),
    (
        "Volume II: The Flow of Training.txt",
        "第二巻　稽古の流れ.txt",
        "vol-2-training-flow",
        "The Flow of Training",
        "稽古の流れ",
    ),
    (
        "Volume III: Principles and Fundamentals of Instruction.txt",
        "第三巻　指導の原理原則.txt",
        "vol-3-principles",
        "Principles and Fundamentals of Instruction",
        "指導の原理原則",
    ),
    (
        "Volume IV: Teaching Guidelines for Beginners.txt",
        "第四巻　初心者への指導心得.txt",
        "vol-4-beginners",
        "Teaching Guidelines for Beginners",
        "初心者への指導心得",
    ),
]

def parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---\n", 3)
    if end < 0:
        return {}, text
    fm = yaml.safe_load(text[3:end]) or {}
    body = text[end + 5 :]
    return fm, body


def clean_body(body: str) -> str:
    lines = []
    for line in body.splitlines():
        s = line.strip()
        if not s or s.startswith(">") or s.startswith("#"):
            continue
        if BOILERPLATE_RE.match(s):
            continue
        if len(s) < 25 and s.isupper():
            continue
        lines.append(s)
    return "\n".join(lines)


def extract_paragraphs(body: str, max_n: int = 6) -> list[str]:
    cleaned = clean_body(body)
    paras: list[str] = []
    for block in re.split(r"\n{2,}", cleaned):
        block = block.strip()
        if len(block) < 40:
            continue
        if any(x in block for x in ("カテゴリーを選択", "#侍", "BUSHI KOBUDO")):
            continue
        paras.append(block)
        if len(paras) >= max_n:
            break
    if not paras:
        for line in cleaned.splitlines():
            if len(line) > 60:
                paras.append(line)
                if len(paras) >= max_n:
                    break
    return paras


def title_from_fm(fm: dict, body: str) -> str:
    title = fm.get("title", "")
    title = re.sub(r"\s*[│|].*$", "", title).strip()
    if title:
        return title
    m = re.search(r"^#\s+(.+)$", body, re.M)
    return m.group(1).strip() if m else "Untitled"


def match_entity(raw_name: str) -> tuple[str, str, str] | None:
    for frag, spec in WEB_ENTITY_MAP.items():
        if frag in raw_name:
            return spec
    return None


def should_skip_web(raw_name: str) -> bool:
    # tenshinryu.net: archive everything (online keiko, NEWS, events, schedules)
    if raw_name.startswith("tenshinryu-net"):
        return False
    return any(s in raw_name for s in WEB_SKIP_FRAGMENTS)


def write_page(path: Path, content: str, *, dry_run: bool, force: bool = False) -> bool:
    if path.exists() and not force:
        return False
    if not dry_run:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    return True


def wp_tags_from_fm(fm: dict) -> list[str]:
    tags = ["article", "tenshinryu-net"]
    cats = fm.get("categories") or []
    for cat in cats:
        if cat and cat not in tags:
            tags.append(str(cat))
    return tags


def thin_body_lines(body: str, title: str, max_lines: int = 12) -> list[str]:
    cleaned = clean_body(body)
    lines = [ln for ln in cleaned.splitlines() if ln.strip()]
    if lines:
        return lines[:max_lines]
    return [title] if title else ["*(announcement — see source)*"]


def fm_block(
    *,
    slug: str,
    lang: str,
    title: str,
    pair: str,
    tags: list[str],
    sources: list[str],
) -> str:
    lines = [
        "---",
        f"slug: {slug}",
        f"lang: {lang}",
        f'title: {json.dumps(title, ensure_ascii=False)}',
        f"pair: {pair}",
        f"tags: {tags}",
        "sources:",
    ]
    for s in sources:
        lines.append(f"  - {s}")
    lines.extend([f"updated: {TODAY}", "---", ""])
    return "\n".join(lines)


def make_source_page(
    *,
    lang: str,
    raw_rel: str,
    title: str,
    url: str,
    fetched: str,
    paras: list[str],
    entity_slug: str | None,
    source_basename: str | None = None,
) -> str:
    base = source_basename or Path(raw_rel).stem
    slug = f"sources/{base}"
    pair_lang = "ja" if lang == "en" else "en"
    pair = f"{pair_lang}/sources/{base}"
    sources = [raw_rel]

    if lang == "en":
        h1 = f"Source summary — {title}"
        intro = f"**URL:** {url or 'n/a'}  \n**Fetched:** {fetched or TODAY}  \n**Raw:** `{raw_rel}`"
        takeaways_h = "## Key takeaways"
        wiki_h = "## Wiki pages from this source"
        footer = ""
    else:
        h1 = f"出典要約 — {title}"
        intro = f"**URL:** {url or 'なし'}  \n**取得日:** {fetched or TODAY}  \n**原文:** `{raw_rel}`"
        takeaways_h = "## 要点"
        wiki_h = "## 関連ウィキページ"
        footer = "\n\n英語: [../en/sources/" + base + ".md](../en/sources/" + base + ".md)"

    bullets = "\n".join(f"- {p[:300]}{'…' if len(p) > 300 else ''}" for p in paras[:5])
    wiki_link = f"- [[{entity_slug}]]" if entity_slug else "- *(source only)*"

    return (
        fm_block(slug=slug, lang=lang, title=f"Source: {title}" if lang == "en" else f"出典: {title}",
                 pair=pair, tags=["source", "website"], sources=sources)
        + f"# {h1}\n\n{intro}\n\n{takeaways_h}\n\n{bullets or '- *(see raw)*'}\n\n{wiki_h}\n\n{wiki_link}"
        + footer
        + "\n"
    )


def make_entity_page_en(
    entity_slug: str,
    title: str,
    ja_hint: str,
    category: str,
    raw_rel: str,
    paras: list[str],
) -> str:
    pair = f"ja/{entity_slug}"
    tag = category
    body_title = title.split("│")[0].strip()
    intro = paras[0] if paras else f"Article from the international Tenshinryu site about **{body_title}**."
    rest = "\n\n".join(f"{p}" for p in paras[1:4])
    gloss = f" ({ja_hint})" if ja_hint else ""

    return (
        fm_block(
            slug=entity_slug,
            lang="en",
            title=body_title,
            pair=pair,
            tags=[tag],
            sources=[raw_rel],
        )
        + f"# {body_title}{gloss}\n\n{intro}\n\n"
        + (f"{rest}\n\n" if rest else "")
    )


def _cjk_chars(text: str) -> int:
    return len(re.findall(r"[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]", text))


def _latin_chars(text: str) -> int:
    return len(re.findall(r"[a-zA-Z]", text))


def _ja_primary_paras(paras: list[str]) -> list[str]:
    return [p for p in paras if _cjk_chars(p) > _latin_chars(p)]


def make_entity_page_ja(
    entity_slug: str,
    title_ja: str,
    en_title: str,
    category: str,
    raw_rel: str,
    paras: list[str],
) -> str:
    pair = f"en/{entity_slug}"
    ja_paras = _ja_primary_paras(paras)
    if ja_paras:
        intro = ja_paras[0]
        rest = "\n\n".join(ja_paras[1:3])
    else:
        intro = (
            f"国際サイト（international.tenshinryu.net）の英語記事「{en_title}」のウィキページ。"
            f"日本語訳は未着手のため、全文は英語版を参照してください。"
        )
        rest = ""
    return (
        fm_block(
            slug=entity_slug,
            lang="ja",
            title=title_ja,
            pair=pair,
            tags=[category],
            sources=[raw_rel],
        )
        + f"# {title_ja}\n\n{intro}\n\n"
        + (f"{rest}\n\n" if rest else "")
        + f"英語: [../../en/{entity_slug}.md](../../en/{entity_slug}.md)\n"
    )


def ingest_web_file(raw_path: Path, *, dry_run: bool, force: bool = False) -> dict:
    stats = {"sources": 0, "entities": 0, "skipped": 0}
    name = raw_path.name
    if should_skip_web(name):
        stats["skipped"] = 1
        return stats

    text = raw_path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(text)
    title = title_from_fm(fm, body)
    paras = extract_paragraphs(body)
    raw_rel = f"raw/web/{name}"
    url = fm.get("url", "")
    fetched = fm.get("fetched", TODAY)

    entity = match_entity(name)
    entity_slug = entity[0] if entity else None
    skip_source = should_skip_international_wiki_source(raw_path.stem)

    if not skip_source:
        for lang in ("en", "ja"):
            src_path = WIKI_EN if lang == "en" else WIKI_JA
            src_file = src_path / "sources" / f"{raw_path.stem}.md"
            if write_page(
                src_file,
                make_source_page(
                    lang=lang,
                    raw_rel=raw_rel,
                    title=title,
                    url=url,
                    fetched=fetched,
                    paras=paras,
                    entity_slug=entity_slug,
                ),
                dry_run=dry_run,
                force=force,
            ):
                stats["sources"] += 1

    if entity:
        entity_path, category, ja_hint = entity
        en_file = WIKI_EN / f"{entity_path}.md"
        ja_file = WIKI_JA / f"{entity_path}.md"
        if write_page(
            en_file,
            make_entity_page_en(entity_path, title, ja_hint, category, raw_rel, paras),
            dry_run=dry_run,
            force=force,
        ):
            stats["entities"] += 1
        ja_title = ja_hint if ja_hint else title
        if write_page(
            ja_file,
            make_entity_page_ja(entity_path, ja_title, title, category, raw_rel, paras),
            dry_run=dry_run,
            force=force,
        ):
            stats["entities"] += 1

    return stats


def ingest_tenshinryu_net(raw_path: Path, *, dry_run: bool, force: bool = False) -> dict:
    stats = {"sources": 0, "entities": 0, "skipped": 0}
    name = raw_path.name
    if not name.startswith("tenshinryu-net-p-"):
        return stats

    text = raw_path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(text)
    title = title_from_fm(fm, body)
    title = re.sub(r"\s*[│|–-]\s*古武術.*$", "", title).strip()
    paras = extract_paragraphs(body)
    if not paras:
        paras = thin_body_lines(body, title)
    raw_rel = f"raw/web/{name}"
    tags = wp_tags_from_fm(fm)
    wp_date = fm.get("date") or fm.get("fetched") or ""

    slug_base = raw_path.stem.replace("tenshinryu-net-", "")
    entity_slug = f"articles/{slug_base[:60]}"

    url = fm.get("url", "")
    fetched = fm.get("fetched", TODAY)

    for lang in ("en", "ja"):
        src_path = (WIKI_EN if lang == "en" else WIKI_JA) / "sources" / f"{raw_path.stem}.md"
        if write_page(
            src_path,
            make_source_page(
                lang=lang,
                raw_rel=raw_rel,
                title=title,
                url=url,
                fetched=fetched,
                paras=paras,
                entity_slug=entity_slug,
            ),
            dry_run=dry_run,
            force=force,
        ):
            stats["sources"] += 1

    cat_note = ", ".join(t for t in tags if t not in ("article", "tenshinryu-net"))
    meta_line = f"**Date:** {wp_date}  \n**Category:** {cat_note or '—'}  \n**URL:** {url}\n\n"
    en_stub = (
        fm_block(
            slug=entity_slug,
            lang="en",
            title=title,
            pair=f"ja/{entity_slug}",
            tags=tags,
            sources=[raw_rel],
        )
        + f"# {title}\n\n"
        + meta_line
        + f"Japanese article from [tenshinryu.net](https://tenshinryu.net/). "
        + f"Primary content on the [Japanese page](../../ja/{entity_slug}.md).\n\n"
        + f"- [[sources/{raw_path.stem}]]\n"
    )
    ja_body = "\n\n".join(paras[:12])
    ja_page = (
        fm_block(
            slug=entity_slug,
            lang="ja",
            title=title,
            pair=f"en/{entity_slug}",
            tags=tags,
            sources=[raw_rel],
        )
        + f"# {title}\n\n"
        + (f"*{wp_date}* — {cat_note}\n\n" if wp_date or cat_note else "")
        + f"{ja_body}\n\n"
        + f"出典: [[sources/{raw_path.stem}]]\n"
    )
    if write_page(WIKI_EN / f"{entity_slug}.md", en_stub, dry_run=dry_run, force=force):
        stats["entities"] += 1
    if write_page(WIKI_JA / f"{entity_slug}.md", ja_page, dry_run=dry_run, force=force):
        stats["entities"] += 1

    return stats


def ingest_instructor_3rd_grade(*, dry_run: bool) -> dict:
    stats = {"sources": 0, "entities": 0}
    base_en = RAW_BOOKS / "instructor-3rd-grade" / "ENG英語版"
    base_ja = RAW_BOOKS / "instructor-3rd-grade" / "日本語版"
    if not base_en.exists():
        return stats

    hub_en = WIKI_EN / "guides" / "instructor-3rd-grade.md"
    hub_ja = WIKI_JA / "guides" / "instructor-3rd-grade.md"

    if write_page(
        hub_en,
        fm_block(
            slug="guides/instructor-3rd-grade",
            lang="en",
            title="3rd-Grade Instructor Text",
            pair="ja/guides/instructor-3rd-grade",
            tags=["pedagogy", "instruction", "instructor"],
            sources=["raw/books/instructor-3rd-grade/"],
        )
        + "# 3rd-Grade Instructor Text\n\n"
        + "Official **3rd-grade instructor certification** curriculum by **Kuwami Masakumo** (10th Shike). "
        + "Four volumes (EN + JA) synced from Google Drive.\n\n"
        + "## Volumes\n\n"
        + "| Vol | Page |\n|-----|------|\n"
        + "| I | [[guides/instructor-3rd-grade/vol-1-conditions]] |\n"
        + "| II | [[guides/instructor-3rd-grade/vol-2-training-flow]] |\n"
        + "| III | [[guides/instructor-3rd-grade/vol-3-principles]] |\n"
        + "| IV | [[guides/instructor-3rd-grade/vol-4-beginners]] |\n\n"
        + "Related: [[guides/teaching-beginners]]\n",
        dry_run=dry_run,
    ):
        stats["entities"] += 1

    if write_page(
        hub_ja,
        fm_block(
            slug="guides/instructor-3rd-grade",
            lang="ja",
            title="三級指導員テキスト",
            pair="en/guides/instructor-3rd-grade",
            tags=["pedagogy", "instruction", "instructor"],
            sources=["raw/books/instructor-3rd-grade/"],
        )
        + "# 三級指導員テキスト\n\n"
        + "**第十世師家 鍬海政雲** による三級指導員認定用教材。全四巻（日英）。\n\n"
        + "## 各巻\n\n"
        + "| 巻 | ページ |\n|-----|------|\n"
        + "| 第一巻 | [[guides/instructor-3rd-grade/vol-1-conditions]] |\n"
        + "| 第二巻 | [[guides/instructor-3rd-grade/vol-2-training-flow]] |\n"
        + "| 第三巻 | [[guides/instructor-3rd-grade/vol-3-principles]] |\n"
        + "| 第四巻 | [[guides/instructor-3rd-grade/vol-4-beginners]] |\n\n"
        + "関連: [[guides/teaching-beginners]]\n",
        dry_run=dry_run,
    ):
        stats["entities"] += 1

    for en_file, ja_file, vol_slug, en_title, ja_title in INSTRUCTOR_VOLUMES:
        en_raw = base_en / en_file
        ja_raw = base_ja / ja_file
        if not en_raw.exists():
            continue
        en_paras = extract_paragraphs(en_raw.read_text(encoding="utf-8"), max_n=12)
        ja_paras = extract_paragraphs(ja_raw.read_text(encoding="utf-8"), max_n=12) if ja_raw.exists() else []
        entity = f"guides/instructor-3rd-grade/{vol_slug}"
        en_rel = f"raw/books/instructor-3rd-grade/ENG英語版/{en_file}"
        ja_rel = f"raw/books/instructor-3rd-grade/日本語版/{ja_file}"

        if write_page(
            WIKI_EN / f"{entity}.md",
            fm_block(
                slug=entity,
                lang="en",
                title=en_title,
                pair=f"ja/{entity}",
                tags=["pedagogy", "instructor"],
                sources=[en_rel, ja_rel],
            )
            + f"# {en_title}\n\n"
            + "\n\n".join(f"{p}" for p in en_paras[:10])
            + f"\n\nFull text: `{en_rel}`\n",
            dry_run=dry_run,
        ):
            stats["entities"] += 1

        if write_page(
            WIKI_JA / f"{entity}.md",
            fm_block(
                slug=entity,
                lang="ja",
                title=ja_title,
                pair=f"en/{entity}",
                tags=["pedagogy", "instructor"],
                sources=[ja_rel, en_rel],
            )
            + f"# {ja_title}\n\n"
            + "\n\n".join(ja_paras[:10] if ja_paras else [f"英語版を参照: `{en_rel}`"])
            + f"\n\n全文: `{ja_rel}`\n",
            dry_run=dry_run,
        ):
            stats["entities"] += 1

        for lang, raw_rel, title in (
            ("en", en_rel, en_title),
            ("ja", ja_rel, ja_title),
        ):
            src = (WIKI_EN if lang == "en" else WIKI_JA) / "sources" / f"instructor-3rd-grade-{vol_slug}.md"
            paras = en_paras if lang == "en" else ja_paras
            if write_page(
                src,
                make_source_page(
                    lang=lang,
                    raw_rel=raw_rel,
                    title=title,
                    url="",
                    fetched=TODAY,
                    paras=paras[:5],
                    entity_slug=entity,
                    source_basename=f"instructor-3rd-grade-{vol_slug}",
                ),
                dry_run=dry_run,
            ):
                stats["sources"] += 1

    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description="Batch ingest raw sources into wiki/")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--web-only", action="store_true")
    parser.add_argument("--instructor-only", action="store_true")
    parser.add_argument("--tenshinryu-only", action="store_true", help="Only tenshinryu-net posts")
    parser.add_argument("--force", action="store_true", help="Overwrite existing wiki pages")
    args = parser.parse_args()

    totals = {"sources": 0, "entities": 0, "skipped": 0, "files": 0}

    if not args.instructor_only:
        for raw_path in sorted(RAW_WEB.glob("*.md")):
            if args.tenshinryu_only and not raw_path.name.startswith("tenshinryu-net-p-"):
                continue
            totals["files"] += 1
            if raw_path.name.startswith("international-tenshinryu-net"):
                if raw_path.name.endswith("-home.md"):
                    continue
                if args.tenshinryu_only:
                    continue
                s = ingest_web_file(raw_path, dry_run=args.dry_run, force=args.force)
            elif raw_path.name.startswith("tenshinryu-net"):
                s = ingest_tenshinryu_net(raw_path, dry_run=args.dry_run, force=args.force)
            else:
                continue
            for k in totals:
                if k != "files":
                    totals[k] += s.get(k, 0)

    if not args.web_only:
        s = ingest_instructor_3rd_grade(dry_run=args.dry_run)
        for k in ("sources", "entities"):
            totals[k] += s.get(k, 0)

    print(
        f"Ingest complete: sources={totals['sources']} entities={totals['entities']} "
        f"skipped={totals['skipped']} raw_files={totals['files']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
