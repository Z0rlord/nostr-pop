# Tenshinryu Hyoho Wiki

Multilingual (English / Japanese / Spanish / Greek / French / German / Italian) knowledge base for **天心流兵法** — built with the [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) pattern.

## Three layers

| Layer | Path | Who writes |
|-------|------|------------|
| Raw sources | `raw/` | You (immutable) |
| Wiki pages | `wiki/en/`, `wiki/ja/`, `wiki/es/`, `wiki/el/`, `wiki/fr/`, `wiki/de/`, `wiki/it/` | LLM agent (you review) |
| Schema | [`WIKI.md`](./WIKI.md) | You + LLM (conventions) |

Navigation: [`wiki/en/index.md`](./wiki/en/index.md) · [`wiki/ja/index.md`](./wiki/ja/index.md) · [`wiki/es/index.md`](./wiki/es/index.md) · [`wiki/el/index.md`](./wiki/el/index.md) · [`wiki/fr/index.md`](./wiki/fr/index.md) · [`wiki/de/index.md`](./wiki/de/index.md) · [`wiki/it/index.md`](./wiki/it/index.md) · [`log.md`](./log.md)

## Sources

1. **Website** — [international.tenshinryu.net](https://international.tenshinryu.net/) (articles, technique intros, culture posts)
2. **Books** — PDFs / scans in your Google Drive (private; not committed to git)

## Quick start

### 1. Configure Drive (books)

Copy config and set your books folder ID:

```bash
cp tenshinryu-wiki/config.example.json ~/.config/dojopop/tenshinryu-wiki.json
```

Find the folder ID in Drive URL: `https://drive.google.com/drive/folders/<FOLDER_ID>`

OAuth for wiki sync needs **read** access to existing files. One-time setup:

```bash
uv run --project . python3 tenshinryu-wiki/scripts/drive-oauth-setup.py
```

### 2. Pull sources

```bash
# Single web page → raw/web/
uv run --project . python3 tenshinryu-wiki/scripts/fetch-web.py \
  --url "https://international.tenshinryu.net/"

# Sync all books from Google Drive → raw/books/ (text/PDF only; skips videos)
uv run --project . python3 tenshinryu-wiki/scripts/sync-drive-books.py
```

### 3. Ingest with Cursor

Open this repo and tell the agent (see [`WIKI.md`](./WIKI.md)):

> Ingest `raw/web/international-tenshinryu-net-home.md` into the wiki.

The agent reads the source, updates EN + JA pages (and es/el when translated), refreshes indexes, and appends `log.md`.

### 4. Scaffold Spanish or Greek

```bash
cd tenshinryu-wiki
uv run python scripts/scaffold-locale.py es
uv run python scripts/scaffold-locale.py el
```

Creates stub pages for every EN slug (`pair: en/...`, pending-translation banner). Translate hub pages and high-traffic sections manually or in a follow-up pass.

### 5. Browse

- **Web** — [wiki.tenshinryu.xyz](https://wiki.tenshinryu.xyz) (EN / JA / ES / EL)
- **Obsidian** — open `tenshinryu-wiki/` as a vault; graph view shows cross-links per language.

### 6. Deploy the public wiki

Build static HTML and deploy to relay-2 (`:3014` → Cloudflare tunnel):

```bash
cd tenshinryu-wiki
./deploy.sh          # default host: relay-2
```

First-time tunnel + DNS for `wiki.tenshinryu.xyz`:

```bash
cd web && doppler run --project dojopop --config prd_zorie -- ./scripts/update-tunnel-ingress.sh
```

Local preview after build:

```bash
cd tenshinryu-wiki && uv run python scripts/build-site.py
python3 -m http.server 8088 --directory dist
# open http://localhost:8088/
```

## v1 scope

- **Languages:** English + Japanese (full); Spanish (es-ES) + Greek (el) — hubs translated, remainder stubbed
- Categories: history, arts, people, concepts, techniques, reiho, philosophy, sources
- Citations required on every wiki claim (`sources:` frontmatter)
- Books stay local (`raw/books/` gitignored)

## Related

- [Tenshinryu KIWAMI PWA](../tenshinryu/README.md) — membership app (`/wiki` redirects here with locale)
- [Karpathy LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

## Version control

The wiki lives in the **dojopop** monorepo at `tenshinryu-wiki/` (not a separate git repo). The KIWAMI app is `tenshinryu/` in the same tree.

| Tracked | Gitignored |
|---------|------------|
| `wiki/` markdown (EN/JA/ES/EL) | `dist/`, `.venv/` |
| `raw/web/` scraped articles | `raw/books/**` (except `.meta.yaml`, `.txt`, `.csv`) |
| `scripts/`, `site/`, deploy config | `raw/assets/**` (kata photos), `config.json` |
| `log.md`, `WIKI.md`, `uv.lock` | OAuth tokens |

```bash
# From repo root
git add tenshinryu-wiki/
git status   # confirm no dist/ or Drive book binaries

# Wiki lint (lang attrs, frontmatter)
cd tenshinryu-wiki && uv run python scripts/lint-wiki-lang.py
```

Production deploy path on relay-2 stays `/opt/dojopop/tenshinryu-wiki` — see [`deploy.sh`](./deploy.sh).
