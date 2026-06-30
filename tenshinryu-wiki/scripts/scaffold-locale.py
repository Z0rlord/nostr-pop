#!/usr/bin/env python3
"""Scaffold wiki/{es,el,fr,de,it} from wiki/en — stub pages + updated frontmatter."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / "wiki"
EN = WIKI / "en"
FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

# Hubs translated separately (scaffold skips or use --include-hubs for EN+copy)
HUB_SLUGS = frozenset(
    {
        "index",
        "overview",
        "synthesis",
        "guides/start-here",
        "techniques/tachiai-12-kata",
        "concepts/miden-kurai-no-koto",
        "arts/_index",
        "reiho/_index",
    }
)

LOCALE = {
    "es": {
        "lang": "es",
        "banner": "> **Traducción pendiente** — Esta página aún no está traducida al español (es-ES).",
        "stub_lead": "Consulte la versión en",
        "en_label": "inglés",
        "ja_label": "japonés",
        "summary_prefix": "Resumen provisional:",
        "default_summary": "Entrada del wiki sobre esta técnica o tema del hyōhō de Tenshinryu.",
    },
    "el": {
        "lang": "el",
        "banner": "> **Μετάφραση σε εξέλιξη** — Αυτή η σελίδα δεν έχει ακόμη μεταφραστεί στα ελληνικά.",
        "stub_lead": "Δείτε την έκδοση στα",
        "en_label": "αγγλικά",
        "ja_label": "ιαπωνικά",
        "summary_prefix": "Προσωρινή περίληψη:",
        "default_summary": "Καταχώρηση wiki για αυτή την τεχνική ή θέμα του hyōhō του Tenshinryu.",
    },
    "fr": {
        "lang": "fr",
        "banner": "> **Traduction en cours** — Cette page n'est pas encore traduite en français (fr-FR).",
        "stub_lead": "Consultez la version en",
        "en_label": "anglais",
        "ja_label": "japonais",
        "summary_prefix": "Résumé provisoire :",
        "default_summary": "Entrée du wiki sur cette technique ou ce thème du hyōhō Tenshinryu.",
    },
    "de": {
        "lang": "de",
        "banner": "> **Übersetzung ausstehend** — Diese Seite ist noch nicht ins Deutsche übersetzt.",
        "stub_lead": "Siehe die Version auf",
        "en_label": "Englisch",
        "ja_label": "Japanisch",
        "summary_prefix": "Vorläufige Zusammenfassung:",
        "default_summary": "Wiki-Eintrag zu dieser Technik oder diesem Thema des Tenshinryu Hyōhō.",
    },
    "it": {
        "lang": "it",
        "banner": "> **Traduzione in corso** — Questa pagina non è ancora tradotta in italiano (it-IT).",
        "stub_lead": "Consulta la versione in",
        "en_label": "inglese",
        "ja_label": "giapponese",
        "summary_prefix": "Riassunto provvisorio:",
        "default_summary": "Voce wiki su questa tecnica o tema dell'hyōhō Tenshinryu.",
    },
}


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    meta = yaml.safe_load(m.group(1)) or {}
    body = text[m.end() :]
    return meta, body


def rel_en_link(slug: str) -> str:
    ups = "../" * (slug.count("/") + 1)
    return f"{ups}en/{slug}.md"


def rel_ja_link(slug: str) -> str:
    ups = "../" * (slug.count("/") + 1)
    return f"{ups}ja/{slug}.md"


def first_summary_line(body: str) -> str:
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith(">") or line.startswith("|"):
            continue
        line = re.sub(r"\*\*([^*]+)\*\*", r"\1", line)
        line = re.sub(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", r"\1", line)
        line = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
        line = re.sub(r"\s+", " ", line).strip()
        if len(line) > 20:
            return line[:200] + ("…" if len(line) > 200 else "")
    return ""


def stub_body(slug: str, meta: dict, en_body: str, loc: dict) -> str:
    title = meta.get("title", slug)
    summary = first_summary_line(en_body) or loc["default_summary"]
    en_href = rel_en_link(slug)
    ja_href = rel_ja_link(slug)
    return (
        f"{loc['banner']}\n\n"
        f"{loc['stub_lead']} [{loc['en_label']}]({en_href}) · "
        f"[{loc['ja_label']}]({ja_href}).\n\n"
        f"**{title}** — {loc['summary_prefix']} {summary}\n"
    )


def scaffold_slug(slug: str, target_lang: str, loc: dict, *, include_hubs: bool) -> str | None:
    if slug in HUB_SLUGS and not include_hubs:
        return None
    en_path = EN / f"{slug}.md"
    if not en_path.is_file():
        return None
    raw = en_path.read_text(encoding="utf-8")
    meta, en_body = parse_frontmatter(raw)
    meta = dict(meta)
    meta["lang"] = target_lang
    meta["pair"] = f"en/{slug}"
    if "slug" not in meta:
        meta["slug"] = slug
    if slug in HUB_SLUGS and include_hubs:
        body = f"{loc['banner']}\n\n{en_body}"
    else:
        body = stub_body(slug, meta, en_body, loc)
    fm = yaml.safe_dump(meta, allow_unicode=True, sort_keys=False).strip()
    return f"---\n{fm}\n---\n\n{body}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Scaffold es/el/fr/de/it wiki from EN tree")
    parser.add_argument("lang", choices=("es", "el", "fr", "de", "it"), help="Target locale")
    parser.add_argument("--include-hubs", action="store_true", help="Also scaffold hub slugs (EN body + banner)")
    parser.add_argument("--dry-run", action="store_true", help="Print counts only")
    args = parser.parse_args()
    loc = LOCALE[args.lang]
    out_dir = WIKI / args.lang
    created = skipped = 0
    for en_md in sorted(EN.rglob("*.md")):
        slug = str(en_md.relative_to(EN).with_suffix("")).replace("\\", "/")
        content = scaffold_slug(slug, args.lang, loc, include_hubs=args.include_hubs)
        if content is None:
            skipped += 1
            continue
        dest = out_dir / f"{slug}.md"
        if args.dry_run:
            created += 1
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content, encoding="utf-8")
        created += 1
    print(f"{args.lang}: wrote {created} pages, skipped {skipped} (hubs — translate manually)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
