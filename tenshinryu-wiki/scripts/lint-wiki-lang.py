#!/usr/bin/env python3
"""Flag cross-language contamination on wiki pages.

Heuristics for JA pages:
- Known EN UI/section markers (See also, ## Body, …)
- Latin-to-CJK ratio in body (skips boilerplate/footer)
- Common English function-word density
- Paragraphs that are mostly ASCII/Latin

ES/EL intentional stubs (Traducción pendiente / Μετάφραση σε εξέλιξη) are skipped.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

WIKI = Path(__file__).resolve().parents[1] / "wiki"
FRONTMATTER_RE = re.compile(r"^---\s*\n.*?\n---\s*\n", re.DOTALL)

STUB_BANNER = {
    "es": "Traducción pendiente",
    "el": "Μετάφραση σε εξέλιξη",
}

# Markers that should not appear on non-English pages (fully translated content)
EN_MARKERS = [
    "See also",
    "Also called",
    "Individual pages",
    "| Kurai | Summary |",
    "## Body",
    "## Role",
    "## Variations",
    "In twelve seiho",
    "## Training notes",
    "Middle Tier",
    "Heaven Tier",
    "Earth Tier",
    "Structured knowledge base for",
    "Choose a language",
]

JA_MARKERS = [
    "## 関連",
    "**別名:**",
    "## 十二勢法での使用",
    "各ページ",
    "| 位 | 概要 |",
]

ES_MARKERS = [
    "See also",
    "## 関連",
    "Structured knowledge base for",
    "| Kurai | Summary |",
    "Middle Tier",
]

EL_MARKERS = ES_MARKERS

# Common English function/content words (lowercase match)
EN_WORD_RE = re.compile(
    r"\b(?:the|and|that|with|this|from|have|were|which|their|would|there|about|"
    r"into|through|during|before|after|between|under|again|then|when|where|"
    r"how|all|each|more|most|other|some|such|only|than|too|very|can|will|just|"
    r"should|could|also|however|although|because|while|though|whether|within|"
    r"without|among|against|including|toward|towards|upon|being|these|those|"
    r"martial|technique|training|school|sword|combat|practitioner|however)\b",
    re.I,
)

EN_PHRASES = [
    "In the Tenshin",
    "Tenshinryu Hyoho",
    "JAPANESE TRADITION TENSHINRYU",
    "Key takeaways",
    "See also:",
    "Related articles",
    "This is a story about",
    "It should be noted",
    "In modern times",
]

FOOTER_LINE_RE = re.compile(
    r"^(出典:|英語:|日本語:|Español:|Ελληνικά:|> |\*\*URL:\*\*|\*\*取得日:\*\*|\*\*原文:\*\*)"
)

# Agent-added editorial hedges — should not appear in published wiki body text
HEDGE_MARKERS = [
    "(site claim)",
    "(site claims)",
    "(per official site)",
    "(según el sitio)",
    "(κατά τον ιστότοπο)",
    "(unverified)",
    "(needs review)",
    "per site narrative",
    "narrative on site",
    "（サイト記載）",
    "（公式サイト記載）",
    "（公式サイト）",
    "公式サイト注記：",
    "*(pending)*",
    "*（未作成）*",
]


def body_of(path: Path) -> str:
    return FRONTMATTER_RE.sub("", path.read_text(encoding="utf-8"), count=1)


def strip_footer(body: str) -> str:
    lines = []
    for line in body.splitlines():
        if FOOTER_LINE_RE.match(line.strip()):
            break
        lines.append(line)
    return "\n".join(lines)


def cjk_count(text: str) -> int:
    return len(re.findall(r"[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]", text))


def latin_count(text: str) -> int:
    return len(re.findall(r"[a-zA-Z]", text))


def english_paragraphs(body: str, min_len: int = 80) -> list[str]:
    """Paragraphs that are predominantly Latin/ASCII."""
    paras = []
    for block in re.split(r"\n{2,}", body):
        block = block.strip()
        if len(block) < min_len:
            continue
        if block.startswith("#"):
            continue
        cjk = cjk_count(block)
        lat = latin_count(block)
        total = cjk + lat
        if total < 40:
            continue
        if lat / total > 0.55 and EN_WORD_RE.search(block):
            paras.append(block[:120] + ("…" if len(block) > 120 else ""))
    return paras


def ja_english_audit(path: Path) -> dict | None:
    """Return issue details for a JA page with substantial English body."""
    body = strip_footer(body_of(path))
    if len(body.strip()) < 80:
        return None

    cjk = cjk_count(body)
    lat = latin_count(body)
    total = cjk + lat
    if total < 100:
        return None

    lat_ratio = lat / total
    en_words = len(EN_WORD_RE.findall(body))
    en_phrases = [p for p in EN_PHRASES if p in body]
    en_paras = english_paragraphs(body)
    marker_hits = [m for m in EN_MARKERS if m in body]

    # Substantial English: high Latin ratio + many EN words, or multiple EN paragraphs
    substantial = (
        (lat_ratio >= 0.30 and en_words >= 15)
        or len(en_paras) >= 2
        or (lat_ratio >= 0.45 and en_words >= 8)
    )
    if not substantial and not marker_hits:
        return None

    rel = str(path.relative_to(WIKI / "ja"))
    category = rel.split("/")[0] if "/" in rel else "root"
    return {
        "path": rel,
        "category": category,
        "lat_ratio": round(lat_ratio, 3),
        "en_words": en_words,
        "en_paras": len(en_paras),
        "markers": marker_hits,
        "phrases": en_phrases[:3],
        "severity": "full" if lat_ratio >= 0.45 or len(en_paras) >= 4 else "partial",
    }


def lint_hedges() -> list[tuple[str, list[str]]]:
    issues: list[tuple[str, list[str]]] = []
    for md in sorted(WIKI.rglob("*.md")):
        text = body_of(md)
        hits = [m for m in HEDGE_MARKERS if m in text]
        if hits:
            issues.append((str(md.relative_to(WIKI)), hits))
    return issues


def lint_lang(lang: str, markers: list[str]) -> list[tuple[str, list[str]]]:
    issues: list[tuple[str, list[str]]] = []
    base = WIKI / lang
    if not base.is_dir():
        return issues
    for md in sorted(base.rglob("*.md")):
        text = body_of(md)
        if lang in STUB_BANNER and STUB_BANNER[lang] in text:
            continue
        hits = [m for m in markers if m in text]
        if hits:
            issues.append((str(md.relative_to(base)), hits))
    return issues


def audit_ja(*, verbose: bool = False) -> list[dict]:
    base = WIKI / "ja"
    results: list[dict] = []
    for md in sorted(base.rglob("*.md")):
        text = body_of(md)
        if "英語版のみ" in text or "国際サイト（英語）" in text:
            continue
        issue = ja_english_audit(md)
        if issue:
            results.append(issue)
    if verbose:
        from collections import Counter

        cats = Counter(r["category"] for r in results)
        full = sum(1 for r in results if r["severity"] == "full")
        print(f"JA English-body audit: {len(results)} pages ({full} full EN body)")
        for cat, n in cats.most_common():
            print(f"  {cat}: {n}")
        print()
        for r in sorted(results, key=lambda x: (-x["lat_ratio"], x["path"]))[:30]:
            print(
                f"  [{r['severity']}] {r['path']} "
                f"ratio={r['lat_ratio']} en_words={r['en_words']} paras={r['en_paras']}"
            )
        if len(results) > 30:
            print(f"  … and {len(results) - 30} more")
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Lint wiki pages for cross-language issues")
    parser.add_argument("--audit-ja", action="store_true", help="Report JA pages with English body")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    if args.audit_ja:
        results = audit_ja(verbose=True)
        return 1 if results else 0

    checks = [
        ("ja", EN_MARKERS, "JA pages with English markers"),
        ("en", JA_MARKERS, "EN pages with Japanese markers"),
        ("es", ES_MARKERS, "ES pages with EN/JA markers"),
        ("el", EL_MARKERS, "EL pages with EN/JA/ES markers"),
    ]
    failed = False
    hedge_issues = lint_hedges()
    if hedge_issues:
        failed = True
        print(f"Editorial hedge markers ({len(hedge_issues)}):")
        for path, hits in hedge_issues[:20]:
            print(f"  {path}: {', '.join(hits)}")
        if len(hedge_issues) > 20:
            print(f"  … and {len(hedge_issues) - 20} more")
    for lang, markers, label in checks:
        issues = lint_lang(lang, markers)
        if issues:
            failed = True
            print(f"{label} ({len(issues)}):")
            for path, hits in issues[:20]:
                print(f"  {path}: {', '.join(hits)}")
            if len(issues) > 20:
                print(f"  … and {len(issues) - 20} more")
    if not failed:
        print("OK — no cross-language boilerplate issues found.")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
