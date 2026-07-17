# Tenshinryu Hyoho Wiki — Log

Append-only timeline. Prefix: `## [YYYY-MM-DD] ingest|query|lint | …`

## [2026-07-08] fix | Wiki Ask quota blocker — model fallback chain

- **Root cause:** `gemini-2.0-flash` + `gemini-2.0-flash-lite` return **429 quota exceeded** on the free-tier key; `gemini-1.5-flash*` are **404** (retired). Current-gen `gemini-2.5-flash-lite` / `gemini-2.5-flash` return **200** — separate fresh free-tier quota buckets. No billing change needed.
- **Fix:** `scripts/wiki_ask.py` now iterates an ordered **model fallback chain** (`GEMINI_MODELS` env, default `gemini-2.5-flash-lite,gemini-2.5-flash,gemini-2.0-flash-lite,gemini-2.0-flash`). Advances to next model on **429/404/500/503** and on network errors; only 400/401/403 surface immediately. Clearer errors: quota-only → 503 "quota exceeded on all models", transient → 503 "temporarily busy", none usable → 502. `GEMINI_MODEL` (single) still honored, prepended to chain. `/health` now reports `models` list.
- **Files:** `scripts/wiki_ask.py` (chain + retry logic), `docker-compose.yml` (`GEMINI_MODEL` → `GEMINI_MODELS` chain).
- **Deploy:** targeted — rsync `scripts/wiki_ask.py` + `docker-compose.yml` to relay-2, `docker compose build wiki-ask` + `--force-recreate wiki-ask` (no static rebuild, no secret change; `GEMINI_API_KEY` already present).
- **Verify (live):** `POST https://wiki.tenshinryu.xyz/api/ask` `{"question":"What is kurai?","lang":"en"}` → real answer + 5 citations (kurai technique pages). JA query → graceful "no matching excerpts" answer + disclaimer. No more 503.
- **Note:** 2.0-flash quota resets are irrelevant now; if all models get busy the chain degrades to a clear 503. Free-tier 2.5-flash-lite has generous RPM; if sustained traffic exhausts it, enable billing at [Google AI Studio](https://aistudio.google.com/) or add a non-Gemini fallback (no GROQ/OpenAI/Anthropic key currently in Doppler).

## [2026-07-08] feature | Wiki Ask (Gemini RAG sidecar)

- **Feature:** Header **Ask** panel on every wiki page — RAG over `search-index.json` via Gemini 2.0 Flash (`scripts/wiki_ask.py` FastAPI sidecar). nginx `:3014` proxies `/api/` and `/health` → `wiki-ask` container; no Cloudflare tunnel change needed.
- **Files:** `Dockerfile.ask`, `docker-compose.yml` (wiki + wiki-ask), `site/assets/ask.js`, `_nav.html.j2` Ask panel, `style.css` ask styles, localized strings (7 langs) in `build-site.py`, `CSS_VERSION = 20260708a`, cache-bust `?v=` on `ask.js`/CSS.
- **Secrets:** `GEMINI_API_KEY` in Doppler `dojopop` / `prd_zorie`; `deploy.sh` syncs to relay-2 `.env` (chmod 600); `.env` added to `.gitignore`.
- **Deploy:** relay-2 full atomic tarball — **5346** staged files; `docker compose build wiki-ask` + `--force-recreate`; containers healthy.
- **Build:** **5021** pages (EN/JA 720, ES/EL 715, FR/DE/IT 717).
- **Verify (infra):** `https://wiki.tenshinryu.xyz/health` → `ok: true`, `gemini_configured: true`, `index_loaded: true`. Static `/`, `/en/`, `/en/philosophy/_index` → **200**. Ask panel live on `/en/` (`ask-wrap`, `ask.js?v=20260708a`, `WIKI_ASK_STRINGS`).
- **Blocker:** `POST /api/ask` returns **503** — Google Gemini API **429 quota exceeded** on key (tested `gemini-2.0-flash`, `gemini-2.0-flash-lite`). User must enable billing / raise quota in [Google AI Studio](https://aistudio.google.com/). Once quota restored, Ask answers + citations should work without redeploy.

## [2026-07-03] fix | Wiki search relevance ranking

- **Issue:** User report — search box always returned the same articles (Start Here, Tachiai 12 Seiho, Synthesis) regardless of query.
- **Root cause:** `search.js` `score()` seeded every item with `item.boost` (10–25) before query matching; filter only required `s > 0`, so all boosted curriculum pages passed for any query and dominated the top 12.
- **Fix:** `search.js` — relevance-first scoring (title +100, body +10 per term); require actual term match; section `boost` scaled ×0.01 as tiebreaker only; diacritic-insensitive `normalize()` (e.g. `chugi` → `chūgi`); 200 ms debounce; section label badge in results. `build-site.py` — `sectionLabel` on index entries; `CSS_VERSION = 20260703g`. `style.css` — `.search-section` pill.
- **Lint:** OK · **Build:** 5021 pages · **Deploy:** relay-2 targeted rsync (`search.js`, `search-index.json`, `style.css`)
- **Verify (live index simulation):** `omokage` → Seiho 1: Omokage; `chugi` → Spirit of Chūgi; `tabi` → How to Wear Tabi (distinct from omokage/chugi).

## [2026-07-03] feature | Google Calendar on Shinanjo (dojo) overview

- **Calendar:** Official Tenshinryu Hyoho practice & events calendar from tenshinryu.net 稽古日程 articles (`raw/web/tenshinryu-net-p-1161.md`, `tenshinryu-net-page-18.md`). ID `a45kjo3r9fof55lfgr1ot56074@group.calendar.google.com`; embed `…/embed?src=…&ctz=Asia/Tokyo`.
- **Pages:** `wiki/{en,ja,es,el,fr,de,it}/dojo/overview.md` — section **Class schedule** / **稽古日程** with responsive `.calendar-embed` iframe + Google Calendar link; JST disclaimer. JA overview also gained branch table + shinanjo intro.
- **Build:** `autolink_bare_urls` skips lines with HTML tags (iframe `src` was being markdown-linked). `style.css` — `.calendar-embed` responsive wrapper; `CSS_VERSION = 20260703f`.
- **Lint:** OK · **Build:** 5021 pages · **Deploy:** relay-2 full atomic tarball + targeted rsync fix (`DEPLOY_EXIT=0`)
- **Verify:** https://wiki.tenshinryu.xyz/en/dojo/overview — HTTP **200**, `calendar-embed` + valid iframe `src`; nav **Shinanjo (dojo)** → overview.

## [2026-07-03] fix | Philosophy section index (13 essays)

- **Issue:** User report — "philosophy page only has one entry." Clicking **Philosophy** in nav landed on a single essay (`onko-chishin`) with no section index; `[[philosophy/]]` wikilinks 404'd. Essay body was **not** truncated (full curry/recipe essay intact in md + live HTML).
- **Root cause:** Missing `philosophy/_index.md` (unlike `reiho/_index`); `build-site.py` nav/hub/cards all pointed to `philosophy/onko-chishin` instead of a hub.
- **Fix:** Created `wiki/en/philosophy/_index.md` + `wiki/ja/philosophy/_index.md` (13-row table). `build-site.py` — `SECTION_SLUG_HUBS`, `resolve_wikilink` maps `[[philosophy/]]` → hub; nav + home cards → `philosophy/_index`.
- **Lint:** OK · **Build:** 5021 pages · **Deploy:** relay-2 atomic tarball (`DEPLOY_EXIT=0`, ~5.5 min)
- **Verify:** https://wiki.tenshinryu.xyz/en/philosophy/_index — HTTP **200**, 13 essays listed; nav **Philosophy** → index; `/en/philosophy/onko-chishin` essay unchanged.

## [2026-07-03] fix | Restore Start Here onboarding UX (20260703e)

- **Issue:** User report — entire student-friendly Start Here onboarding UX lost during nav/Chrome fix iterations; category cards de-emphasized, footer CTA weak, broken wikilink in index table.
- **Git note:** Session refs `0803067d` / `4d6c743a` are agent transcript IDs, not repo commits. Compared `d687ff3` (nav overhaul) vs working tree — markup (nav-cta-persistent, hero, 8 cards, footer, breadcrumbs, full-index details) was present locally but live CSS was stale and card CTA styling was too subtle (accent-soft only).
- **Restored/strengthened:** `style.css` — solid burgundy `category-card-cta` (white text, matches hero/nav CTA); `footer-cta` pill styling; Chrome grid fixes retained (4-col centered, 900/480 breakpoints). `wiki/en|ja/index.md` — fixed escaped `\|` wikilinks. `build-site.py` — `CSS_VERSION = "20260703e"`. Templates — hreflang fr/de/it on index + page.
- **Kept:** Lang dropdown (7 langs), two-row header, curriculum dropdown, persistent Start Here in row 1, absolute `/ja/` … `/it/` language links (45b6dc86 fix).
- **Build:** 5019 pages · **Deploy:** relay-2 targeted rsync (HTML 7 langs + style.css/js/search/graph JSON, ~2 min, `DEPLOY_EXIT=0`).
- **Verify:** https://wiki.tenshinryu.xyz/en/ — HTTP **200**; `nav-cta-persistent`, `hero-cta`, burgundy `category-card-cta`, `footer-cta`, 8 cards, `?v=20260703e`; `/en/guides/start-here` active CTA + breadcrumbs; no `../ja/index.md` in body.

## [2026-07-03] fix | Full-index markdown render + Chrome flex fallback (20260703d)

- **Issue:** User report — `/en/` still broken in Chrome after 20260703c grid/CSS deploy; Safari OK. Investigation: category grid OK in headless Chrome at desktop; mobile overflow only when viewport not set correctly; **full index** showed raw `##` / `| Page |` pipe markdown inside `<details class="full-index">` (Python-Markdown skips MD inside HTML blocks).
- **Root cause:** `render_details_blocks()` summary regex used `.match()` on inner HTML that starts with leading newline before `<summary>` — never matched, so 10 index tables stayed unrendered. Long raw pipe lines caused horizontal overflow in Chrome (Safari wraps more aggressively).
- **Fix:** `build-site.py` — strip inner before summary match; pre-render details body to HTML tables; `CSS_VERSION = "20260703d"`. `style.css` — flexbox wrap + `@supports (display:grid)` fallback for category cards; `details.full-index h2` spacing.
- **Deploy:** Targeted rsync `dist/assets/style.css` + all 7 `*/index.html` to relay-2 (~1 min).
- **Verify:** Live `/en/` — `?v=20260703d`, 11 `<table>` (1 official + 10 full-index), headless Chrome 1280×800 + 390×844 no horizontal overflow, full index expands with styled tables.

## [2026-07-03] fix | Index language links + Chrome grid deploy (20260703c)

- **Issue:** Live `/en/` still showed link text `../ja/index.md` (href was `/ja/`), category card grid 5+3 asymmetric in Chrome, stale CSS `?v=20260703`; prior deploy workers stalled on 1.4G tarball upload.
- **Fix:** All 7 `wiki/*/index.md` — full “Other languages” bar with absolute `/en/` … `/it/` links (no relative `.md` paths). `style.css` — `.category-cards`/`.category-grid` `max-width: 56rem`, `gap: 1rem`, `repeat(4)` desktop / `2` at ≤900px / `1` at ≤480px; `details.full-index` table/chevron rules retained. `build-site.py` — `CSS_VERSION = "20260703c"` passed to all templates.
- **Deploy:** Full tarball timed out (~17 min); targeted rsync HTML all 7 langs + `assets/style.css` + search/graph JSON to relay-2 `dist/` (`DEPLOY_EXIT=0`, ~3 min).
- **Verify:** https://wiki.tenshinryu.xyz/en/ — HTTP **200**; `Other languages` + `/ja/` links, no `index.md` in body; stylesheet `?v=20260703c`; live CSS has `56rem` grid + `480px` breakpoint.

## [2026-07-03] fix | Chrome index layout — grid/flex min-width + overflow

- **Issue:** User report — `/en/` landing looks correct in Safari but broken in Chrome: category card grid misaligned, nav header crowding/overflow, full-index tables unreadable, horizontal scroll.
- **Root cause (Chrome):** Grid/flex children default `min-width: auto` — Chrome won't shrink below content (Safari is more permissive). Header `1fr` column + search input + negative-margin nav panel caused overflow; `auto-fill` grid left orphan tracks; `details.full-index summary` native marker stacked with content; tables lacked `table-layout: fixed` / `overflow-wrap`.
- **Fix (`style.css`):** `overflow-x: clip` on html/body/header; `minmax(0, …)` header grid + `min-width: 0` on tools/nav/cards/index; `auto-fit` + `min(10.5rem,100%)` category grid; custom `details.full-index` disclosure chevron; `table-layout: fixed` + `overflow-wrap: anywhere` on index tables; `inline-flex` on summary triggers; `flex: 0 0 auto` on nav dropdown.
- **Deploy:** relay-2 targeted rsync — `dist/assets/` + `index.html` all 7 langs (~2 min); HTTP **200** live `/en/`, `/assets/style.css`; cache-bust `?v=20260703` on stylesheet links (templates) so Cloudflare serves fresh CSS on index pages

## [2026-07-02] fix | Restore Start Here — persistent header CTA + home card

- **Issue:** User report — Start Here not visible after nav UX fix (7bbdd438); category card removed from home; on ≤992px entire nav (incl. Start Here) hidden behind hamburger.
- **Fix:** `nav-cta-persistent` in header row 1 (always visible, all viewports); solid accent CTA styling (matches hero button); restored Start Here as first category card (`category-card-cta`) in `index_cards_for()` all 7 langs; footer `footer-cta` emphasis; nav panel skips duplicate Start Here.
- **Files:** `_nav.html.j2`, `index_page.html.j2`, `_footer.html.j2`, `style.css`, `build-site.py`
- **Lint:** OK · **Build:** 5019 pages · **Deploy:** relay-2 full atomic tarball (`DEPLOY_EXIT=0`, ~38 min) — HTML/CSS rsync applied fix live during upload
- **Verify:** https://wiki.tenshinryu.xyz/en/ — `nav-cta-persistent`, `category-card-cta`, `footer-cta`; `/en/guides/start-here` active CTA; localized labels en/ja/es/el/fr/de/it

## [2026-07-02] fix | Nav UX regression — header crowding + duplicate index H1

- **Issue:** After adding FR/DE/IT lang switcher (7 codes inline), sticky header wrapped badly on desktop/tablet; home had triple Start Here (nav CTA + hero + card), duplicate H1 (`hero` + body `# Tenshinryu Hyoho Wiki (English)`), pointless Home-only breadcrumb; brand title hardcoded Japanese on all locales.
- **Fix:** Two-row header grid — brand + search + lang dropdown (row 1), nav links (row 2); Curriculum → dropdown (Arts / 12 Seiho / Kurai); hamburger at ≤992px; removed Start Here from category cards (7 cards); strip index body H1 at build; hide index breadcrumbs; localized `site_subtitle` in nav; shorter nav labels (Shinanjo).
- **Files:** `_nav.html.j2`, `style.css`, `nav.js`, `build-site.py` (`curriculum_subnav_for`, `nav_items_for`, `index_cards_for`, index H1 strip).
- **Lint:** OK · **Build:** 5019 pages · **Deploy:** relay-2 targeted rsync (assets + HTML; full 1.4G tarball skipped)
- **Verify:** https://wiki.tenshinryu.xyz/en/ — single H1, lang dropdown, curriculum submenu, no Home breadcrumb

## [2026-07-02] fix | Seiho photos + clickable bare URLs

- **Issue:** ES/EL/FR/DE/IT seihō subpages had no kata reference photos (only EN/JA markdown had `![](/assets/tachiai-12-kata/…)`). Philosophy/article pages with bare `https://` lines (e.g. `correcting-mistakes`, `kata-culture`) rendered as plain text, not links.
- **Fix:** `build-site.py` — `inject_seiho_photo()` copies hero image line from EN when locale omits it; `autolink_bare_urls()` wraps bare URLs (skips fenced code); `postprocess_html()` adds `target="_blank" rel="noopener noreferrer"` on external links and wraps seihō `<img>` in `<figure class="seiho-hero">`. `style.css` — `.page-content img` sizing/border.
- **Verify:** `/es/techniques/tachiai-12-kata/omokage` shows 面陰 photo; `/en/philosophy/correcting-mistakes` Amazon link clickable; `/en/philosophy/spirit-of-chugi` Hagakure sagalibdb links open in new tab.
- **Lint:** OK · **Build:** 5019 pages · **Deploy:** relay-2

## [2026-07-02] resource | Official YouTube channel links

- **URL:** [youtube.com/@tenshinryu/featured](https://www.youtube.com/@tenshinryu/featured)
- **Pages updated:** `wiki/en|ja/guides/start-here`, `wiki/en|ja/index`, `wiki/en|ja/synthesis`, `wiki/en|ja/community/tenshinryu-hyoho-facebook`; `wiki/de|fr|it/guides/start-here`; `wiki/de|es|el|fr|it/index`
- **Lint:** OK · **Build:** 5019 pages · **Deploy:** relay-2 atomic deploy complete (`DEPLOY_EXIT=0`) — live `/en/guides/start-here` shows YouTube link

## [2026-07-01] fix | Duplicate wiki titles — scrape boilerplate cleanup

- **Root cause:** international.tenshinryu.net ingest left page chrome in markdown (repeated title lines, `│JAPANESE TRADITION TENSHINRYU HYOHO` banner, prev/next + `関連する記事` footers, duplicate kanji in H1 e.g. `温故知新 (温故知新)`). `clean-scrape-noise.py` only stripped lines immediately after a leading H1 — missed stub-banner pages (es/el) and mid-body title repeats.
- **Fix:** `clean-scrape-noise.py` — find H1 after preamble, `filter_scrape_title_lines` body-wide, `dedupe_consecutive_headings`; batch-cleaned **142** wiki files. `build-site.py` — `sanitize_body()` at build time; `page.html.j2` renders `<h1 class="page-title">` only when body H1 exactly matches frontmatter `title` (else richer markdown H1 kept).
- **Example:** `onko-chishin` — before: H1 + 3 title repeats + banner + footer junk; after: one `<h1 class="page-title">Onko Chishin (温故知新)</h1>` then prose.
- **Lint:** OK · **Build:** 5019 pages · **Deploy:** relay-2 partial rsync (`philosophy/` + `reiho/` all langs) after 1.4G tarball upload stalled — HTTP **200** live `/en/philosophy/onko-chishin`, no scrape banner

## [2026-07-01] fix | Chūgi page — restore Hagakure section kanji headers

- **Issue:** Ingest reformatted Hagakure passage labels to English-only `Section N — …` headings; body kanji were preserved but section headers lost `Hagakure (葉隠), Kikigaki Daiichi (聞書第一)` glosses from the Facebook original.
- **Fix:** Restored full section headers, passage/commentary labels, and intro/conclusion headings on `wiki/en/philosophy/spirit-of-chugi.md`.
- **Lint:** OK · **Build:** 5019 pages · **Deploy:** relay-2 — HTTP **200** `/en/philosophy/spirit-of-chugi`

## [2026-07-01] ingest | On the Spirit of Chūgi (Facebook)

- **Raw:** `raw/community/kuwami-spirit-of-chugi-2025-06.md` — Kuwami Masakumo admin post, Tenshinryu Hyoho Official Community (Facebook), 2026-06-26
- **Pages created:** `wiki/en/philosophy/spirit-of-chugi.md` (full EN lesson + 14 Hagakure passages), `wiki/ja/philosophy/spirit-of-chugi.md` (JA hub), `wiki/en|ja/community/tenshinryu-hyoho-facebook.md`, `wiki/en|ja/sources/kuwami-spirit-of-chugi-2025-06.md`; stubs es/el/fr/de/it
- **Cross-links:** `people/kuwami-masakumo`, `synthesis`, `guides/start-here`, all locale indexes
- **External:** [Saga Library Hagakure](https://www.sagalibdb.jp/hagakure/list02); brief DojoPop practice log note in community page
- **Lint:** OK · **Build:** 5019 pages · **Deploy:** relay-2 atomic tarball — HTTP **200** `/en/philosophy/spirit-of-chugi`

## [2026-07-01] ingest | On the Spirit of Chūgi (忠義) — Kuwami Masakumo

- **Raw:** `raw/community/kuwami-spirit-of-chugi-2025-06.md` (Facebook group clip, UI stripped)
- **Pages created:** `wiki/en/philosophy/spirit-of-chugi.md` (full EN), `wiki/ja/philosophy/spirit-of-chugi.md` (JA hub + summary), `wiki/en|ja/community/tenshinryu-hyoho-facebook.md`, `wiki/en|ja/sources/kuwami-spirit-of-chugi-2025-06.md`
- **Locale stubs:** es/el/fr/de/it `philosophy/spirit-of-chugi`
- **Cross-links:** `people/kuwami-masakumo`, `synthesis`, `guides/start-here`, en/ja `index`
- **Notes:** Post date 2026-06-26 (group feed + Zorie practice shorts same week; DojoPop mention on community page only). Hagakure ref: sagalibdb.jp/hagakure/list02. JA full translation deferred.

## [2026-06-30] i18n | French, German, Italian locales (7 langs)

- **Added** `fr`, `de`, `it` to `LANGS` in `scripts/build-site.py` — `ui_strings`, `nav_items_for`, `section_labels`, `index_cards_for`, breadcrumbs, graph labels; lang switcher in `_nav.html.j2`, `_footer.html.j2`, `home.html.j2`
- **Scaffolded** `wiki/fr/`, `wiki/de/`, `wiki/it/` from EN tree via `scaffold-locale.py` (708 stubs + 8 hub pages each)
- **Hub translations** (`scripts/seed-fr-de-it-hubs.py`): full `guides/start-here`; localized `index`, `synthesis`, `overview`, `arts/_index`, `reiho/_index`; partial `techniques/tachiai-12-kata`, `concepts/miden-kurai-no-koto` (Traduction partielle / Teilübersetzung / Traduzione parziale)
- **Scripts:** `lint-wiki-lang.py`, `scaffold-locale.py`, `fix-index-wikilinks.py`, `prune-international-sources.py`; `deploy.sh` health checks for `/fr|de|it/guides/start-here`
- **Lint:** OK · **Build:** 5008 pages (716 × EN/JA/FR/DE/IT; 714 ES/EL)
- **Deploy:** relay-2 atomic tarball → wiki.tenshinryu.xyz

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

## [2026-07-01] deploy | Chūgi lesson pages live

- Live check: `/en/philosophy/spirit-of-chugi` and `/en/community/tenshinryu-hyoho-facebook` were 404
- `uv run python scripts/build-site.py` (5019 pages); `./deploy.sh relay-2` (concurrent rsync completed)
- Verified both URLs 200

## [2026-07-02] deploy | Full atomic relay-2

- lint OK; build **5019** pages; `./deploy.sh relay-2 --skip-build` (~26m, Tailscale was down initially)
- Staged **5343** files; docker recreate on :3014
- Health (wiki.tenshinryu.xyz): `/` `/en/philosophy/onko-chishin` `/en/philosophy/spirit-of-chugi` `/fr/guides/start-here` `/ja/` — all 200
