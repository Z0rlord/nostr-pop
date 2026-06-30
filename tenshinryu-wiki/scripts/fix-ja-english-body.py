#!/usr/bin/env python3
"""Replace English body on wiki/ja pages with Japanese stubs or JA-primary raw content."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from datetime import date
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
WIKI_JA = ROOT / "wiki" / "ja"
WIKI_EN = ROOT / "wiki" / "en"
RAW_WEB = ROOT / "raw" / "web"
TODAY = date.today().isoformat()

FRONTMATTER_RE = re.compile(r"^---\s*\n.*?\n---\s*\n", re.DOTALL)

# slug → one-line Japanese summary (international.tenshinryu.net EN articles)
JA_SUMMARY: dict[str, str] = {
    "philosophy/apologies": "謝罪の作法と武士の礼法について論じたエッセイ。",
    "philosophy/correcting-mistakes": "過ちを正さぬことは真の過ちである、という教え。",
    "philosophy/datsuryoku": "脱力 — 不要な力みを解く稽古と心構え。",
    "philosophy/kata-culture": "日本の型文化と天心流における勢法の位置づけ。",
    "philosophy/martial-arts-misunderstandings": "日本古武道に対する誤解と問題点の整理。",
    "philosophy/message-to-practitioners": "天心流修行者および関心のある方へのメッセージ。",
    "philosophy/nature-worship": "自然崇拝と日本における敬意の精神。",
    "philosophy/onko-chishin": "温故知新 — 古を温ねて新しきを知る。",
    "philosophy/pride-and-humility": "驕りでない誇りと、卑下でない謙虚さ。",
    "philosophy/student-improvement": "弟子の上達への関心と指導上の課題。",
    "philosophy/tradition-and-change": "伝統の変化への疑問と天心流の立場。",
    "philosophy/words-and-character": "言葉が人格を形作る — 発言への注意。",
    "reiho/dojo-movement": "道場内の動き方と礼法。",
    "reiho/keiko-osame": "稽古納め — 稽古を終える作法。",
    "reiho/kesa": "袈裟の着用と意味。",
    "reiho/sageo": "下緒の結び方と実用。",
    "reiho/sewing-haori": "羽織を縫う場面 — 武士の生活文化。",
    "reiho/tabi": "足袋の履き方。",
    "reiho/technique-of-respect": "礼の技 — 敬意を示す作法。",
    "reiho/tekoa": "手甲（てこう）の使い方。",
    "reiho/traditional-costume": "伝統衣装の写真と解説。",
    "history/1795": "1795年に関する歴史記事。",
    "history/1937": "1937年に関する歴史記事。",
    "history/koran-to": "虎乱刀 — 天心流に伝わる刀。",
    "techniques/fusa-otoshi": "房落 — 房を落とす技法の紹介。",
    "techniques/fukuro-jinai": "袋印内 — 袋を用いた印内の技法。",
    "techniques/nedachi": "根立 — 根を立てる構え・技法。",
    "techniques/chochin-barai": "提灯抜 — 提灯を抜くように抜刀する技法（新宿支部稽古動画より）。",
    "techniques/zanuke": "坐外 — 背後の敵を討つ技法。",
    "techniques/tousen-niraminuki": "尖睨抜 — 大太刀を用いた尖睨抜きの技法。",
    "techniques/bakuchiken": "驀地剣 — 十二勢法の抜留（ぬきどめ）の別名。",
    "articles/index-php": "tenshinryu.net トップページ（WP REST 取得データ）。",
}

TECHNIQUE_JA_INTRO: dict[str, str] = {
    "techniques/chochin-barai": (
        "新宿支部の稽古で紹介された**提灯抜**（ちょうちんばらい）。"
        "提灯に引っかからぬよう抜刀する技法。"
    ),
    "techniques/zanuke": "背後の敵を討ち、刀を見せぬよう動く**坐外**（ざぬけ）の技法。",
    "techniques/tousen-niraminuki": (
        "**尖睨抜**（とうせんにらみぬき）— 大太刀を用い、脅されておどおどする振りから抜く技法。"
    ),
    "techniques/bakuchiken": (
        "**驀地剣**（ばくちけん）は十二勢法第三の**抜留**（ぬきどめ）の通称。"
        "相手の抜き手を先制する技法。"
    ),
}


def load_lint():
    spec = importlib.util.spec_from_file_location("lint", ROOT / "scripts" / "lint-wiki-lang.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---\n", 3)
    if end < 0:
        return {}, text
    fm = yaml.safe_load(text[3:end]) or {}
    body = text[end + 5 :]
    return fm, body


def fm_block(fm: dict) -> str:
    data = dict(fm)
    data["updated"] = TODAY
    lines = ["---"]
    for k, v in data.items():
        if k == "sources":
            lines.append("sources:")
            for s in v:
                lines.append(f"  - {s}")
        elif k == "tags":
            lines.append(f"tags: {json.dumps(v, ensure_ascii=False)}")
        elif isinstance(v, str) and k in ("title",):
            lines.append(f'{k}: {json.dumps(v, ensure_ascii=False)}')
        elif isinstance(v, str):
            lines.append(f"{k}: {v}")
        else:
            lines.append(f"{k}: {v}")
    lines.extend(["---", ""])
    return "\n".join(lines)


def cjk_count(text: str) -> int:
    return len(re.findall(r"[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]", text))


def latin_count(text: str) -> int:
    return len(re.findall(r"[a-zA-Z]", text))


def is_english_paragraph(block: str) -> bool:
    block = block.strip()
    if len(block) < 40:
        return False
    cjk, lat = cjk_count(block), latin_count(block)
    total = cjk + lat
    return total > 30 and lat / total > 0.55


def strip_english_paragraphs(body: str) -> str:
    """Keep JA-primary paragraphs; drop trailing EN boilerplate from bilingual posts."""
    blocks = re.split(r"\n{2,}", body.strip())
    kept: list[str] = []
    for block in blocks:
        if block.startswith("#"):
            kept.append(block)
            continue
        if is_english_paragraph(block) and cjk_count(block) < 15:
            continue
        kept.append(block)
    return "\n\n".join(kept).strip()


def rewrite_from_raw_tenshinryu(ja_path: Path, fm: dict) -> str | None:
    sources = fm.get("sources") or []
    raw_rel = next((s for s in sources if "tenshinryu-net" in s and s.endswith(".md")), None)
    if not raw_rel:
        return None
    raw_path = ROOT / raw_rel
    if not raw_path.exists():
        return None
    _, raw_body = parse_frontmatter(raw_path.read_text(encoding="utf-8"))
    # Re-use ingest-batch paragraph extraction
    spec = importlib.util.spec_from_file_location("ingest", ROOT / "scripts" / "ingest-batch.py")
    ingest = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ingest)
    paras = ingest.extract_paragraphs(raw_body, max_n=12)
    ja_paras = [p for p in paras if cjk_count(p) >= latin_count(p)]
    if not ja_paras:
        return None
    title = fm.get("title", "").split("&#")[0].strip()
    body = f"# {title}\n\n" + "\n\n".join(ja_paras[:10])
    stem = Path(raw_rel).stem
    body += f"\n\n出典: [[sources/{stem}]]\n"
    return fm_block(fm) + body


def make_international_stub(ja_path: Path, fm: dict) -> str:
    slug = fm.get("slug", str(ja_path.relative_to(WIKI_JA)).removesuffix(".md"))
    ja_title = re.sub(r"\s*[│|].*$", "", fm.get("title", slug)).strip()
    en_path = WIKI_EN / f"{slug}.md"
    en_title = ja_title
    if en_path.exists():
        en_fm, _ = parse_frontmatter(en_path.read_text(encoding="utf-8"))
        en_title = en_fm.get("title", en_title)

    summary = JA_SUMMARY.get(slug) or TECHNIQUE_JA_INTRO.get(slug, f"国際サイトの英語記事「{en_title}」に関するページ。")
    sources = fm.get("sources") or []
    src_stem = Path(sources[0]).stem if sources else ""

    body = (
        f"# {ja_title}\n\n"
        f"> **英語版のみ** — international.tenshinryu.net の英語記事です。日本語訳は未着手です。\n\n"
        f"{summary}\n\n"
        f"全文・詳細は英語版を参照してください。\n"
    )
    if slug.startswith("techniques/bakuchiken"):
        body += "\n関連勢法: [[techniques/tachiai-12-kata/nukidome]]\n"
    if src_stem:
        body += f"\n出典: [[sources/{src_stem}]]  \n"
    body += f"英語: [../../en/{slug}.md](../../en/{slug}.md)\n"
    return fm_block(fm) + body


def fix_index_php(fm: dict) -> str:
    slug = fm["slug"]
    title = "トップページ（tenshinryu.net）"
    fm = {**fm, "title": title}
    body = (
        f"# {title}\n\n"
        "> **参照用** — WP REST API から取得した JSON データ。本文はサイト [tenshinryu.net](https://tenshinryu.net/) を参照。\n\n"
        "古武術天心流兵法の公式サイトのトップページに相当します。"
        "ウィキ上の記事一覧は [[index]] を参照してください。\n\n"
        "出典: [[sources/tenshinryu-net-index-php]]  \n"
        f"英語: [../../en/{slug}.md](../../en/{slug}.md)\n"
    )
    return fm_block(fm) + body


def strip_bilingual_article(body: str) -> str:
    """Remove EN duplicate block and site chrome from tenshinryu.net event posts."""
    lines = body.splitlines()
    out: list[str] = []
    in_en_block = False
    skip_chrome = False
    en_start_re = re.compile(
        r"^(Alternative |Since the |Public delivery|Instructor\s*:|After that,|If you are )",
        re.I,
    )
    chrome_re = re.compile(
        r"^(関連記事|最新の投稿|© |<PREV|NEXT>|Hello world!|BUSHI KOBUDO|"
        r"Introduction of technique|関連する記事)"
    )
    for line in lines:
        s = line.strip()
        if not s:
            if out and out[-1] != "":
                out.append("")
            continue
        if s.startswith("#"):
            out.append(s)
            continue
        if chrome_re.search(s):
            skip_chrome = True
            continue
        if skip_chrome:
            continue
        if en_start_re.match(s) or (
            latin_count(s) > 25 and cjk_count(s) < 5 and not s.startswith("http")
        ):
            in_en_block = True
        if in_en_block:
            continue
        out.append(s)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()


def rewrite_tenshinryu_article(ja_path: Path, fm: dict) -> str | None:
    text = ja_path.read_text(encoding="utf-8")
    _, body = parse_frontmatter(text)
    cleaned = strip_bilingual_article(body)
    if cleaned == body.strip():
        # Try raw source
        sources = fm.get("sources") or []
        raw_rel = next((s for s in sources if "tenshinryu-net" in s), None)
        if raw_rel and (ROOT / raw_rel).exists():
            _, raw_body = parse_frontmatter((ROOT / raw_rel).read_text(encoding="utf-8"))
            cleaned = strip_bilingual_article(raw_body)
    if cleaned == body.strip():
        return None
    title = fm.get("title", "").split("&#")[0].strip()
    h1 = re.search(r"^#\s+.+$", body, re.M)
    if not h1:
        cleaned = f"# {title}\n\n{cleaned}"
    stem = Path((fm.get("sources") or [""])[0]).stem
    if not cleaned.endswith("出典:"):
        cleaned += f"\n\n出典: [[sources/{stem}]]\n"
    return fm_block(fm) + cleaned


def fix_page(ja_path: Path, *, dry_run: bool) -> str | None:
    text = ja_path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(text)
    slug = fm.get("slug", str(ja_path.relative_to(WIKI_JA)).removesuffix(".md"))
    sources = fm.get("sources") or []

    if slug == "articles/index-php":
        new_content = fix_index_php(fm)
    elif any("international-tenshinryu-net" in s for s in sources):
        new_content = make_international_stub(ja_path, fm)
    elif any("tenshinryu-net" in s for s in sources):
        raw_rewrite = rewrite_from_raw_tenshinryu(ja_path, fm)
        if raw_rewrite and "Alternative Online" not in raw_rewrite:
            new_content = raw_rewrite
        else:
            article_rewrite = rewrite_tenshinryu_article(ja_path, fm)
            if article_rewrite:
                new_content = article_rewrite
            else:
                return None
    else:
        return None

    if new_content.strip() == text.strip():
        return None
    if not dry_run:
        ja_path.write_text(new_content, encoding="utf-8")
    return slug


def main() -> int:
    parser = argparse.ArgumentParser(description="Fix English body on JA wiki pages")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    lint = load_lint()
    issues = lint.audit_ja()
    fixed: list[str] = []

    for issue in issues:
        path = WIKI_JA / issue["path"]
        slug = fix_page(path, dry_run=args.dry_run)
        if slug:
            fixed.append(slug)

    # Also fix bilingual tenshinryu.net articles missed by audit threshold
    for slug in ("techniques/zanuke",):
        path = WIKI_JA / f"{slug}.md"
        if path.exists() and slug not in fixed:
            s = fix_page(path, dry_run=args.dry_run)
            if s:
                fixed.append(s)

    lint2 = load_lint()
    for issue in lint2.audit_ja():
        path = WIKI_JA / issue["path"]
        rel = issue["path"]
        if rel in fixed or rel.replace(".md", "") in fixed:
            continue
        slug = fix_page(path, dry_run=args.dry_run)
        if slug:
            fixed.append(slug)

    print(f"{'Would fix' if args.dry_run else 'Fixed'} {len(fixed)} pages:")
    for s in fixed:
        print(f"  {s}")

    if not args.dry_run:
        remaining = lint.audit_ja()
        print(f"\nRemaining JA English-body issues: {len(remaining)}")
        for r in remaining[:10]:
            print(f"  {r['path']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
