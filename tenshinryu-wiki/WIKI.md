# Tenshinryu Hyoho Wiki — Agent Schema

You maintain a **multilingual** markdown wiki for 天心流兵法 (Tenshinryu Hyoho). Follow the [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) pattern: compile knowledge once, keep it current, never rewrite raw sources.

## Directory layout

```
tenshinryu-wiki/
  raw/                 # immutable sources (never edit)
    web/               # clipped website pages
    books/             # synced from Google Drive (gitignored binaries)
    assets/            # images referenced by raw or wiki pages
  wiki/
    en/                # English pages (canonical slug tree)
    ja/                # Japanese pages (same slug tree)
    es/                # Spain Spanish (es-ES)
    el/                # Modern Greek
  log.md               # append-only ingest/query/lint log
  WIKI.md              # this file
```

## Language rules (v1)

- **Parallel slugs**: `wiki/en/history/overview.md` ↔ `wiki/ja/history/overview.md` ↔ `wiki/es/...` ↔ `wiki/el/...` ↔ `wiki/fr/...` ↔ `wiki/de/...` ↔ `wiki/it/...`
- **Frontmatter on every page**:

```yaml
---
slug: history/overview
lang: en          # en | ja | es | el | fr | de | it
title: "Overview of Tenshinryu History"
pair: ja/history/overview   # counterpart; es/el typically pair: en/<slug>
tags: [history, lineage]
sources:
  - raw/web/international-tenshinryu-net-home.md
updated: 2026-06-29
---
```

- **Japanese** pages: natural Japanese; no English body except proper nouns.
- **English** pages: include `(Japanese)` gloss for key terms once per page.
- **Spanish (es-ES)**: Spain Spanish; martial-arts terms where standard (battojutsu, seihō, kurai). Stubs use `> Traducción pendiente` banner.
- **Greek (el)**: modern Greek; keep Japanese proper nouns; romanization on first mention. Stubs use `> Μετάφραση σε εξέλιξη` banner.

Use wikilinks: `[[arts/battojutsu]]` (same language). Cross-language: `pair:` in frontmatter; optional footer link to EN/JA.

## Scaffolding new locales

```bash
uv run python scripts/scaffold-locale.py es   # stub tree from EN
uv run python scripts/scaffold-locale.py el
```

Hub pages (`index`, `overview`, `synthesis`, `arts/_index`, `techniques/tachiai-12-kata`, `concepts/miden-kurai-no-koto`) are translated manually; all other slugs start as stubs pointing to EN/JA.

| Type | Path pattern | Purpose |
|------|--------------|---------|
| Overview | `overview.md` | High-level synthesis per category |
| Entity | `people/*.md`, `dojo/*.md` | Person, branch, location |
| Concept | `concepts/*.md` | Hyoho, reiho, philosophy terms |
| Art | `arts/*.md` | Kenjutsu, battojutsu, yawara, … |
| Technique | `techniques/*.md` | Named waza / kata |
| Source summary | `sources/*.md` | One per raw file ingested |

Use wikilinks: `[[arts/battojutsu]]` (same language). Cross-language: note `pair:` in frontmatter; optional link `(日本語)` → `../ja/...` in footer.

## Categories (index sections)

1. **Overview** — `overview.md`, `synthesis.md`
2. **History & lineage** — `history/`
3. **Arts** — `arts/` (剣術, 抜刀術, 槍術, …)
4. **People** — `people/` (Tokizawa Yahei, Yagyu Munenori, Ishii Seizo, Nakamura Tenshin, …)
5. **Concepts** — `concepts/` (hyoho, koden, denchu toho, …)
6. **Techniques** — `techniques/`
7. **Reiho & culture** — `reiho/`
8. **Philosophy** — `philosophy/`
9. **Sources** — `sources/` (catalog of raw files)
10. **Guides** — `guides/` (instructor pedagogy, dojo ops)

## Workflows

### Ingest (single source)

When the user says **ingest** `<path>`:

1. Read the raw file under `raw/`.
2. Discuss key takeaways briefly with the user if ambiguous.
3. Create or update `wiki/en/sources/<basename>.md` and counterparts in `ja/`, `es/`, `el/`, `fr/`, `de/`, `it/` as needed (summary + key quotes; non-en locales may remain stubs).
4. Update entity/concept/art/technique pages touched (EN + JA minimum; es/el when translating).
5. Update `wiki/en/index.md` and `wiki/ja/index.md` (and localized indexes when present).
6. Append to `log.md`:

```markdown
## [YYYY-MM-DD] ingest | <source title>
- Raw: `raw/...`
- Pages updated: ...
- Notes: contradictions, gaps, follow-ups
```

### Query

1. Read `wiki/{lang}/index.md` for the user's language (default **en**).
2. Open relevant pages; synthesize with inline citations to `sources:` or `[[sources/...]]`.
3. If the answer is durable, offer to file it as `wiki/{lang}/explorations/<slug>.md`.

### Lint

Periodically (or when asked):

- Orphan pages (no inbound links)
- EN/JA/es/el slug pairs missing `pair:` or missing counterpart
- Claims without `sources:`
- Contradictions between pages or vs newer raw sources
- Stale `updated:` dates when raw source is newer
- **Cross-language body:** `uv run python scripts/lint-wiki-lang.py` (marker scan); `uv run python scripts/lint-wiki-lang.py --audit-ja -v` for JA pages with substantial English body (Latin/CJK ratio, EN function words, EN paragraphs). Skips intentional `英語版のみ` stubs and es/el pending banners.
- **Fix EN-on-JA:** `uv run python scripts/fix-ja-english-body.py` (international.tenshinryu.net → JA stub; tenshinryu.net → strip bilingual EN blocks)

## Raw source conventions

**Web clips** (`raw/web/`): frontmatter with `url`, `fetched`, `title`.

**Books** (`raw/books/`): keep PDFs; add companion `.meta.yaml` if needed (title, author, language, chapter map). For ingest, prefer extracted text in `raw/books/<book-slug>/ch-NN.md` if available.

## Tone & accuracy

- Factual, respectful of tradition; distinguish **historical narrative** from **modern organization** (KIWAMI, international federation).
- Flag uncertainty: use blockquote `> **Uncertain:** …` when sources disagree or are unclear.
- Do not invent technique details not present in sources.

## Optional tooling

- Search: `grep -r` / `rg` over `wiki/`; add [qmd](https://github.com/tobi/qmd) if the wiki grows past ~200 pages.
- Web clip: Obsidian Web Clipper → `raw/web/`, or `scripts/fetch-web.py`.

## Reference URLs

- Site: https://international.tenshinryu.net/
- Online program: https://international.tenshinryu.net/tenshinryu-online
- KIWAMI app: https://tenshinryu.xyz
