# Tenshinryu Hyoho Wiki — Log

Append-only timeline. Prefix: `## [YYYY-MM-DD] ingest|query|lint | …`

## [2026-06-30] ui | Nav label: Shinanjo (dojo)

- **Renamed** nav/breadcrumb/index-card section label `Dojo` → **Shinanjo (dojo)** (en/es/el) and **指南所（道場）** (ja) in `scripts/build-site.py` — `section_labels()`, `nav_items_for()`, `index_cards_for()`; wiki folder `dojo/` and slugs unchanged
- **Lint:** OK · **Build:** 2860 pages · **Deploy:** relay-2 atomic tarball — HTTP **200** `/en/dojo/overview`; live nav/breadcrumb **Shinanjo (dojo)** (en) · **指南所（道場）** (ja)

## [2026-06-30] feature | Student navigation UX overhaul

- **Persistent nav** (`_nav.html.j2`, `_footer.html.j2`): Start Here (CTA) · Curriculum · Reiho · Philosophy · Dojo · Articles · Graph + search + lang switcher — localized en/ja/es/el via `build-site.py` `nav_items_for()` / `ui_strings`
- **Breadcrumbs** (`_breadcrumbs.html.j2`, `build_breadcrumbs()`): slug-path trail with section hub links (e.g. Techniques → `/en/techniques/tachiai-12-kata`)
- **Slimmer home** (`index_page.html.j2`): hero + Start Here CTA + 8 category cards; full 129-row tables collapsed in `<details class="full-index">` on en/ja `index.md`
- **On this page** TOC (`nav.js`): auto sidebar from h2/h3 on long pages (≥3 headings)
- **Mobile**: hamburger `nav-toggle` + collapsible panel; full-width sticky search
- **Files:** `site/assets/style.css`, `site/assets/nav.js`, `page.html.j2`, `graph.html.j2`, `scripts/build-site.py`
- **Lint:** OK · **Build:** 2860 pages
- **Deploy:** relay-2 atomic tarball — HTTP **200** `/en/`, `/en/guides/start-here`, `/ja/guides/start-here`, `/en/techniques/tachiai-12-kata`; live nav + breadcrumbs verified

### Before → After nav

| Before | After |
|--------|-------|
| Logo + search + lang + Graph only | Student sections in sticky header + footer on every page |
| No breadcrumbs | Home › Section › Page |
| Index = wall of tables first | Hero + 8 cards; tables behind “Full index” toggle |
| No mobile menu | Hamburger panel with nav + search |
| No in-page TOC | “On this page” sidebar on long guides/essays |

## [2026-06-30] feature | Student audit items 1–3

- **Item 1 — Start Here:** `wiki/en/guides/start-here.md`, `wiki/ja/guides/start-here.md` — Week 1 checklist, 門外不出, reiho, vol-2 flow excerpt, curriculum map, ONLINE/KIWAMI, dojo paths, synthesis link
- **reiho/_index:** `wiki/en/reiho/_index.md`, `wiki/ja/reiho/_index.md` — fixes broken synthesis wikilink
- **Index:** en/ja `index.md` — prominent start-here; ja People rows for 10th/11th Shike + instructors hub; ja reiho/_index row
- **Item 2 — Search:** `build-site.py` — `section`, `boost` on index entries; +10 guides/techniques/concepts/arts/philosophy/reiho/dojo/people/history; +15 essentials (start-here, synthesis, tachiai-12-kata); −5 articles; **sources/ excluded**. `search.js` applies boost; filters sources
- **Item 3 — EN essays:** Full translation (not stubs) for p-29, p-2584, p-2600, p-2605, p-35, p-67, p-2893, p-2747 (~7,752 EN words total). **Start reading** section on en/ja `articles/_index.md`
- **Lint:** OK · **Build:** 2860 pages (716 × en/ja)
- **Deploy:** relay-2 atomic tarball — HTTP **200** `/en/guides/start-here`; p-2605 EN body live; search “e-dojo” ranks curriculum above announcement articles

## [2026-06-30] prune | international.tenshinryu.net source stubs

- **Removed:** **704** wiki source pages (**176** slugs × en/ja/es/el) — nav-only stubs, online-lesson announcements, entity-mapped duplicates (techniques/philosophy/reiho/history content lives on entity pages)
- **Kept:** `international-tenshinryu-net-home` (×4 langs) — substantive homepage synthesis; `raw/web/international-tenshinryu-net-*.md` (**177** clips) unchanged (immutable archive)
- **Example removed:** `sources/international-tenshinryu-net-zanuke--e5-9d-90-e5-a4-96` — boilerplate + 2-line Movie scrape; technique content on `techniques/zanuke`
- **Criteria:** `scripts/wiki_international_filter.py` — `WEB_SKIP_FRAGMENTS` (140), `WEB_ENTITY_FRAGMENTS` (32), numeric WP IDs (3), nav-heavy takeaways (≥50%)
- **Scripts:** `prune-international-sources.py`, `ingest-batch.py` (skip on ingest), `fetch-web.py` (skip low-value on re-fetch), `fill-wiki-placeholders.py` (removed stale source wikilinks)
- **Lint:** OK · **Build:** 2856 pages (714 × 4 langs)
- **Deploy:** relay-2 atomic tarball swap — HTTP **404** `…/en/sources/international-tenshinryu-net-zanuke--e5-9d-90-e5-a4-96`

## [2026-06-30] ingest | tenshinryu.net full blog archive (291 posts)

- **Fetch:** `scripts/fetch-wp-posts.py` — WP REST via `?rest_route=/wp/v2/posts` (291 total); **183 new** raw clips + **108** existing → **291/291** in `raw/web/tenshinryu-net-p-*.md`; pages **29/29** verified
- **Ingest:** removed `TENSHINRYU_NET_SKIP_CATS` + tenshinryu.net bypass for `WEB_SKIP_FRAGMENTS`; `--force` + category tags from WP frontmatter
- **Wiki:** **291** JA + **291** EN articles (`wiki/*/articles/p-*.md`); **582** source catalog entries (en+ja); thin announcements kept (title/date/category/excerpt)
- **Index:** `wiki/*/articles/_index.md` — category-grouped archive; locale indexes updated (ja/en/es/el)
- **ES/EL:** scaffold **800** new stubs each + `fill-wiki-placeholders.py --all` (articles: 293 incl. `_index`)
- **Category breakdown (291):** オンライン稽古 82 · NEWS 39 · 伝統文化 27 · イベント 27 · 稽古日程 20 · エッセイ 19 · 演武日程 12 · 動画紹介 11 · TENSHINRYU ONLINE 10 · (+ 13 smaller cats)
- **Lint:** `lint-wiki-lang.py` OK · **Build:** 3224 pages (806 × 4 langs)
- **Deploy:** relay-2 locale rsync (articles live) — HTTP **200** `/ja/articles/_index.html`, `/ja/articles/p-2966.html`; full `deploy.sh --delete` rsync hit file races on 1.3G assets (prior partial delete)

### Sample URLs

- https://wiki.tenshinryu.xyz/ja/articles/_index
- https://wiki.tenshinryu.xyz/ja/articles/p-2966
- https://wiki.tenshinryu.xyz/en/articles/p-942

## [2026-06-30] feature | Eight arts pages — full EN/JA, partial ES/EL

- **Created (7 slugs × 4 langs):** kenjutsu, sojutsu, jumonjiyarijutsu, naginatajutsu, kusarigamajutsu, tesajutsu, yawara — **28 new** wiki pages
- **Expanded:** battojutsu (EN/JA/ES/EL) — denchu toho, za-hō, tachiai, koden, equipment philosophy
- **Updated:** arts/_index (en/ja/es/el) — removed stub labels; core vs tonomono (外物), Hozoin-ryu In-ha
- **Sources:** international-tenshinryu-net-home, tenshinryu.net page 15, kata-culture / p-2605, p-2747, p-1807
- **Lint:** `lint-wiki-lang.py` OK · **Build:** 3224 pages (806 × 4 langs)
- **Deploy:** relay-2 arts/ rsync — HTTP 200 on sample URLs (full dist rsync had file race; arts live)

### Sample URLs

- https://wiki.tenshinryu.xyz/en/arts/kenjutsu
- https://wiki.tenshinryu.xyz/ja/arts/yawara
- https://wiki.tenshinryu.xyz/en/arts/_index
- https://wiki.tenshinryu.xyz/es/arts/sojutsu

## [2026-06-30] fix | Remove editorial hedge parentheticals

- **Grep + cleanup:** removed `(site claim)`, `(per official site)`, `（サイト記載）`, `（公式サイト）`, `per site narrative`, `*(pending)*` and similar agent hedges
- **14 files / 18 lines** across en/ja/es/el (arts/_index, overview, history/overview, ja arts pages)
- **Scripts:** no generators re-added hedges; `lint-wiki-lang.py` now flags `HEDGE_MARKERS` on future runs
- **Lint:** OK
- **Build:** 3224 pages (806 × 4 langs)
- **Deploy:** relay-2 wiki.tenshinryu.xyz :3014 — HTTP 200

## [2026-06-30] fix | ES/EL stub batch fill + synthesis hub

- **Script:** `fill-wiki-placeholders.py` extended — `--all` batch mode, section builders (`source`, `kurai`, `guide`, `entity`, `article`), `--refill-kinds` for quality pass
- **ES filled: 287** stubs → structured partial summaries (`Traducción parcial`)
  - sources: 161 · articles: 61 · concepts/kurai: 43 · dojo: 10 · guides: 6 · people: 3 · history: 2 · arts: 1
- **EL filled: 287** stubs → `Μερική μετάφραση` (same section split)
- **Prior pass (same day):** 43 ES + 43 EL priority pages (philosophy/reiho/techniques + 12 seihō) — unchanged
- **Synthesis:** EN expanded hub map (12 seihō table, instructor volumes, lineage table, reiho); ES/EL hubs mirrored; es/el `index.md` — dojo section, missing people/techniques, synthesis title updated
- **Lint:** `lint-wiki-lang.py` OK (after kurai catalog header + See also fixes)
- **Build:** 1344 pages (336 × 4 langs)
- **Deploy:** relay-2 wiki.tenshinryu.xyz :3014 — HTTP 200

### Remaining

- **Human review:** ES/EL partial bodies — kurai bullets still mix EN phrases; articles/sources use abbreviated summaries
- **JA optional:** `wiki/ja/sources/*` EN bullet summaries (catalog OK)
- **Full translation:** philosophy/reiho/techniques priority pages remain partial, not literary ES/EL

## [2026-06-30] fix | Placeholder fill + index navigation repair

- **Root cause (broken index links):** `build-site.py` `MD_LINK_RE` used `([#)]…)` char-class that consumed closing `)` — table cells rendered as raw `[overview.md](./overview.md` without href
- **Build fix:** anchor group changed to `(#[^)]*)?` only; all `./path.md` links in tables now resolve
- **Index wikilinks:** `scripts/fix-index-wikilinks.py` — **195** table links → `[[slug|Title]]` across en/ja/es/el index pages; **+6** in `concepts/kurai/sanmi-no-kurai` (en/ja) — **201 total**
- **Content fill:** `scripts/fill-wiki-placeholders.py`
  - **JA: 31** pages — removed `英語版のみ` stubs; full Japanese body (philosophy 12, reiho 9, techniques 7, history 3)
  - **ES: 43** priority pages — `Traducción parcial` summaries (philosophy/reiho/techniques + 12 seihō)
  - **EL: 43** priority pages — `Μερική μετάφραση` summaries (same set)
- **Lint:** `lint-wiki-lang.py` OK; `--audit-ja` 0 English-body issues
- **Deploy:** relay-2 wiki.tenshinryu.xyz :3014 — HTTP 200

### Sample before/after

| Before | After |
|--------|-------|
| `[overview.md](./overview.md` (broken cell) | [Overview — Tenshinryu Hyoho](https://wiki.tenshinryu.xyz/en/overview) |
| JA stub banner only | [温故知新](https://wiki.tenshinryu.xyz/ja/philosophy/onko-chishin) — full JA essay |
| ES one-line pending | [Onko Chishin ES](https://wiki.tenshinryu.xyz/es/philosophy/onko-chishin) — multi-paragraph summary |

### Remaining backlog

- **ES/EL:** ~287 pages still thin stubs (`Traducción pendiente` / `Μετάφραση σε εξέλιξη`) — mostly `sources/`, `dojo/`, `people/`, `guides/`, `concepts/kurai/*`
- **JA:** `wiki/ja/sources/*` international summaries still EN bullets (catalog OK)
- **EN:** `synthesis.md` cross-topic narrative still draft
- **Human review:** JA philosophy/reiho translations; ES/EL partial summaries vs full translation

## [2026-06-29] fix | JA wiki English-body audit + localization

- **Audit:** `lint-wiki-lang.py --audit-ja` — **37** JA pages with full English body (Latin/CJK ratio ≥0.45, EN function-word density)
  - philosophy: 12 · reiho: 9 · techniques: 6 · history: 3 · articles: 7 (incl. 330k-line `index-php` JSON dump)
  - kurai: 0 (already JA-primary) · sources/: not flagged (summary bullets only)
- **Root cause:** `ingest-batch.py` `make_entity_page_ja` copied EN paragraphs from international.tenshinryu.net; `next-wave-import.py` wrote EN paras into JA technique pages. Initial batch also mirrored full EN article bodies onto `wiki/ja/` paths.
- **Fixed (38 pages):** `scripts/fix-ja-english-body.py`
  - international.tenshinryu.net entity pages → `英語版のみ` JA stub + one-line summary + link to EN
  - tenshinryu.net bilingual event posts → strip EN duplicate block + site chrome
  - `articles/index-php` → short JA pointer to tenshinryu.net
- **Script hardening:** `ingest-batch.py` (JA-primary paras only); `next-wave-import.py` (`ja_intro` stubs); `lint-wiki-lang.py` (ratio/phrase/paragraph heuristics, `--audit-ja`)
- **Post-fix lint:** 0 JA English-body issues; marker lint OK
- **Kurai:** regenerated 70 pages — JA bodies unchanged
- **es/el:** stubs untouched (`Traducción pendiente` / `Μετάφραση σε εξέλιξη`)
- **Deploy:** relay-2 wiki.tenshinryu.xyz :3014 — HTTP 200

### Backlog (JA translation)

- Full Japanese translation for 32 international-site stubs (philosophy/reiho/techniques/history)
- `wiki/ja/sources/*` from international.tenshinryu.net still have EN bullet summaries (acceptable for source catalog; translate if desired)

### Sample URLs fixed

- https://wiki.tenshinryu.xyz/ja/philosophy/kata-culture
- https://wiki.tenshinryu.xyz/ja/reiho/sageo
- https://wiki.tenshinryu.xyz/ja/techniques/chochin-barai

## [2026-06-29] feature | Spanish (es) + Greek (el) locales

- **Build:** `scripts/build-site.py` — langs en/ja/es/el; 4-way home picker, lang switcher, hreflang, `graph-es.json` / `graph-el.json`
- **Scaffold:** `scripts/scaffold-locale.py` — stub tree from EN (`pair: en/...`, pending banner)
- **Hubs translated (es + el):** index, overview, synthesis, arts/_index, techniques/tachiai-12-kata, concepts/miden-kurai-no-koto
- **Lint:** `lint-wiki-lang.py` extended for es/el (skips intentional stubs)
- **Not extended (v1):** `ingest-batch.py`, `generate-kurai-pages.py` — still EN/JA only; re-run scaffold after new EN slugs

### Open items (translation pass)

- Philosophy, reiho, techniques index sections — priority after hubs
- Full body translation for stub pages per locale
- Re-scaffold es/el when EN gains new slugs

## [2026-06-29] ingest | Next-wave import (photos, techniques, static, synthesis)

- **Kata photos:** Hero images on all 12 seiho subpages (EN+JA, 24); hub promo `12 kata promo.jpg`
- **Techniques (+4 EN/JA):** chochin-barai, zanuke, tousen-niraminuki, bakuchiken (+ sources)
- **tenshinryu.net static:** Fetched 29 WP pages via `rest_route`; ingested people (Ide, Kuwami), dojo hub + 8 branches, history/instructors, dojo/shinanjo-tradition; enriched nakamura-tenshin
- **EN upgrades:** 10 key JA articles (p-29, p-651, p-35, p-2600, p-67, p-2605, p-1766, p-2893, p-2747, p-2584)
- **synthesis.md:** Cross-hub overview (12 kata, kurai, philosophy, instructors, dojo)
- **Tooling:** `scripts/next-wave-import.py`; `ingest-batch.py` WEB_ENTITY_MAP +4; `build-site.py` graph render fix
- **Wiki counts:** EN 336 / JA 336 (+18 per lang vs prior 318); 303 assets copied
- **Lint:** `lint-wiki-lang.py` OK
- **Deploy:** relay-2 wiki.tenshinryu.xyz :3014 — HTTP 200

### Open items

- ES/EL stubs still thin (317/316 pages)
- Remaining international Movie posts (niji-no-hashikake, combat maid, etc.) — low priority
- Human review kata photo alt text / additional angles per seiho

## [2026-06-29] ingest | Full site + Drive import pass

- **Crawl:** international.tenshinryu.net sitemap — 144 new + 6 existing raw/web clips (286 total)
- **Crawl:** tenshinryu.net RSS (10) + BFS crawl (100 pages)
- **Drive sync:** 308 files — kata JPGs (606 assets), promo images, instructor-3rd-grade (10 docs EN+JA)
- **Batch ingest:** 312 source pages, 186 entity pages (EN+JA pairs); 133 low-value posts skipped
- **New sections:** philosophy/ (12), reiho/ (9), techniques/ (+3), history/ (+3), guides/instructor-3rd-grade/ (hub + 4 vols), articles/ (61 JA from tenshinryu.net)
- **Tooling:** `fetch-web.py` crawl/sitemap/RSS modes; `ingest-batch.py`; sync-drive default paths + 3rd Grade Instructor Text
- **Deploy:** relay-2 wiki.tenshinryu.xyz :3014

### Open items (next pass)

- Map remaining international **Introduction of technique** articles (Chochin-Barai, etc.) to `techniques/`
- Deepen tenshinryu.net static pages (師家, 道場案内) — crawl `page_id` permalinks
- Link kata photos from `raw/assets/tachiai-12-kata/` into seiho subpages
- Human review EN stubs for JA-primary tenshinryu.net articles
- Skip catalog: ~100+ online lesson / e-dojo / branch seminar posts (raw kept, not ingested)
- `synthesis.md` cross-topic narrative still placeholder

## [2026-06-29] fix | JA wiki localization

- Kurai generator: 関連/各ページ/位|概要 on JA catalog pages; 英語 cross-links
- build-site: wikilink titles from page index; 更新/英語 meta; JA footer strings
- Added `scripts/lint-wiki-lang.py` for cross-language boilerplate checks

## [2026-06-29] feature | Graph view + KIWAMI footer link

- Wiki: `/en/graph`, `/ja/graph` — force-directed canvas from wikilinks (`graph-{lang}.json` at build)
- KIWAMI: `SiteFooter` → Hyoho Wiki → wiki.tenshinryu.xyz/en/

## [2026-06-29] deploy | wiki.tenshinryu.xyz

- Static site builder: `scripts/build-site.py` (markdown → HTML, wikilinks, EN/JA)
- Deploy: `deploy.sh` → relay-2 `/opt/dojopop/tenshinryu-wiki` nginx :3014
- Tunnel: `wiki.tenshinryu.xyz` in `web/scripts/update-tunnel-ingress.sh`

## [2026-06-29] ingest | Miden Kurai — individual stance pages

- Generator: `scripts/generate-kurai-pages.py`
- **35 slugs × EN/JA** = 70 pages under `concepts/kurai/` (32 Ten/Shin/Chi/Hyoho stances + Roboku/Shabo/Chikuboku)
- Catalog pages (ten/shin/chi/hyoho) link to individual pages; cross-links to [[techniques/tachiai-12-kata]] on applicable stances
- Hub updates: `concepts/miden-kurai-no-koto`, `concepts/kurai/sanmi-no-kurai`

## [2026-06-29] ingest | Miden Kurai-no-Koto

- Raw: `raw/books/_root/ZB Copy of Tenshinryu Miden Kurai-no-Koto.txt`
- Hub: `concepts/miden-kurai-no-koto` + kurai/ chapter pages (sanmi, fundamentals, ten/shin/chi, hyoho-kokoroe)
- People: `people/nakamura-tenshin`; cross-link to [[techniques/tachiai-12-kata]]

## [2026-06-29] ingest | Guidelines for Teaching Beginners

- Raw: `raw/books/TSR Books/Guidelines for Teaching Beginners.pdf` (+ extracted `.txt`)
- Pages: `guides/teaching-beginners` (EN/JA), `sources/guidelines-teaching-beginners`
- Author: Kuwami Masakumo (10th Shike); 7-page EN instructor guide

## [2026-06-29] ingest | Tachiai 12 Kata curriculum

- Raw EN: `raw/books/_root/ZB ENG Copy of  Tachiai Battojyutsu 12 Kata(勢法).txt`
- Raw JA: `raw/books/TSR Books/ZB Copy of 立合（立相）十二本の勢法.txt` + PDF
- Pages: `techniques/tachiai-12-kata` + 12 seiho subpages (EN/JA), `concepts/seiho`, `concepts/tachiai`, `arts/battojutsu`
- Notes: JP has jutka + name etymology; EN unproofread; 門外不出

## [2026-06-29] sync | Google Drive books folder

- Folder: `1-C8IwDxv5jDdPUOGRXU8yrH6Zw6NL5qb`
- Synced text/PDF (videos skipped): TSR Books, 12 Kata, root Google Docs

## [2026-06-29] init | Wiki scaffold

- Created `tenshinryu-wiki/` with Karpathy LLM Wiki layout (EN/JA)
- Seeded from international.tenshinryu.net homepage clip

## [2026-06-30] fix | Tachiai 12 seihō synthesis tables

- Replaced truncated `4–12 … See hub for full list` row in `wiki/en/synthesis.md` with full 12-row table
- Added matching 12-row seihō tables to `wiki/ja/synthesis.md`, `wiki/es/synthesis.md`, `wiki/el/synthesis.md`
- Order and names verified against `wiki/*/techniques/tachiai-12-kata.md` hub pages

## [2026-06-30] fix | Shike lineage table order (9 → 10 → 11)

- **Before:** index pages (en/es/el) listed 9th → 11th → 10th; `en/history/instructors.md` table was 11th → 10th → 9th (reverse)
- **After:** chronological 9th Nakamura Tenshin → 10th Kuwami Masakumo → 11th Ide Ryusetsu; Instructor Lineage hub row remains last in People section (matches index style)
- **Files:** `wiki/en/index.md`, `wiki/es/index.md`, `wiki/el/index.md`, `wiki/en/history/instructors.md`
- `en/synthesis.md` and es/el synthesis bullet lists were already correct; JA index lists only 9th shike
- Lint OK; build + deploy to relay-2
