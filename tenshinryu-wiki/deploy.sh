#!/usr/bin/env bash
# Build and deploy Tenshinryu Wiki to relay-2 — wiki.tenshinryu.xyz :3014
#
# Usage:
#   ./deploy.sh [ssh-host] [--skip-build]
#   ./deploy.sh relay-2 full deploy   # same as default (atomic full sync)
#
# Deploy packs dist/ into a tarball before transfer so nginx never serves a
# half-deleted tree (old rsync --delete on live dist/) and rsync never reads
# dist/ while build-site.py rmtree's it (concurrent deploy race).
#
# First-time DNS/tunnel: from repo root:
#   cd web && doppler run --project dojopop --config prd_zorie -- ./scripts/update-tunnel-ingress.sh
set -euo pipefail

HOST="relay-2"
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    full|deploy) ;;
    -*) echo "Unknown option: $arg" >&2; exit 1 ;;
    *) HOST="$arg" ;;
  esac
done

REMOTE_DIR="/opt/dojopop/tenshinryu-wiki"
STAGING="dist-staging"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK_DIR="/tmp/tenshinryu-wiki-deploy.lock.d"
ARCHIVE=""
cleanup() { rm -f "${ARCHIVE:-}"; rm -rf "$LOCK_DIR"; }
trap cleanup EXIT
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Another tenshinryu-wiki deploy is running (lock: $LOCK_DIR)" >&2
  exit 1
fi
if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "==> Building static site"
  cd "$SCRIPT_DIR"
  uv sync --quiet
  uv run python scripts/build-site.py
else
  cd "$SCRIPT_DIR"
fi

if [[ ! -f "$SCRIPT_DIR/dist/index.html" ]]; then
  echo "Missing dist/index.html — run build first" >&2
  exit 1
fi

ARCHIVE="/tmp/tenshinryu-wiki-dist-$$.tgz"
REMOTE_TGZ="/tmp/tenshinryu-wiki-dist-$$.tgz"

echo "==> Packing dist/ ($(du -sh "$SCRIPT_DIR/dist" | cut -f1))"
# COPYFILE_DISABLE avoids macOS xattr noise on Linux tar extract
COPYFILE_DISABLE=1 tar czf "$ARCHIVE" -C "$SCRIPT_DIR/dist" .

echo "==> Uploading to ${HOST}:${REMOTE_DIR}/${STAGING}"
ssh -o BatchMode=yes "$HOST" "rm -rf '${REMOTE_DIR}/${STAGING}' && mkdir -p '${REMOTE_DIR}/${STAGING}'"
rsync -az --partial -e "ssh -o BatchMode=yes" "$ARCHIVE" "$HOST:$REMOTE_TGZ"
ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  tar xzf '$REMOTE_TGZ' -C '${REMOTE_DIR}/${STAGING}'
  rm -f '$REMOTE_TGZ'
"

FILE_COUNT="$(ssh -o BatchMode=yes "$HOST" "find '${REMOTE_DIR}/${STAGING}' -type f | wc -l")"
echo "==> Staged ${FILE_COUNT} files"

echo "==> Atomic swap ${STAGING} → dist"
ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  rm -rf '${REMOTE_DIR}/dist-old'
  if [[ -d '${REMOTE_DIR}/dist' ]]; then
    mv '${REMOTE_DIR}/dist' '${REMOTE_DIR}/dist-old'
  fi
  mv '${REMOTE_DIR}/${STAGING}' '${REMOTE_DIR}/dist'
  # dist-old kept until next deploy — emergency server rollback without rebuild
"

rsync -az \
  "$SCRIPT_DIR/docker-compose.yml" \
  "$SCRIPT_DIR/nginx.conf" \
  "$SCRIPT_DIR/Dockerfile.ask" \
  "$SCRIPT_DIR/scripts/wiki_ask.py" \
  "$HOST:$REMOTE_DIR/"

echo "==> Syncing Doppler env for wiki-ask (GEMINI_API_KEY)..."
ENV_TMP="$(mktemp)"
doppler secrets download --project dojopop --config prd_zorie --no-file --format docker > "$ENV_TMP"
grep -E '^(GEMINI_API_KEY)=' "$ENV_TMP" > "${ENV_TMP}.wiki-ask" || true
if ! grep -q '^GEMINI_API_KEY=' "${ENV_TMP}.wiki-ask"; then
  echo "WARN: GEMINI_API_KEY not in Doppler download — wiki Ask will return 503"
fi
scp -o BatchMode=yes "${ENV_TMP}.wiki-ask" "$HOST:$REMOTE_DIR/.env"
ssh -o BatchMode=yes "$HOST" "chmod 600 '$REMOTE_DIR/.env'"
rm -f "$ENV_TMP" "${ENV_TMP}.wiki-ask"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR/scripts'"
rsync -az "$SCRIPT_DIR/scripts/wiki_ask.py" "$HOST:$REMOTE_DIR/scripts/"

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  if ! docker compose version >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq docker-compose-v2
  fi
  cd '${REMOTE_DIR}'
  docker compose build wiki-ask
  docker compose up -d --force-recreate
  docker compose ps
  sleep 2
  echo ''
  echo '==> Health check (localhost:3014):'
  for path in / /en/ /ja/articles/_index /en/arts/kenjutsu /fr/guides/start-here /de/guides/start-here /it/guides/start-here /assets/logo-icon.png; do
    curl -sS -o /dev/null -w \"HTTP %{http_code} \${path}\n\" \"http://127.0.0.1:3014\${path}\" || true
  done
  echo ''
  echo '==> Ask API health (via nginx):'
  curl -sS \"http://127.0.0.1:3014/health\" || true
  echo ''
  curl -sS \"http://127.0.0.1:3014/api/ask\" -o /dev/null -w 'POST /api/ask without body: HTTP %{http_code}\n' -X POST || true
  docker compose exec -T wiki-ask python -c \"import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8080/health').read().decode())\" 2>/dev/null || true
"

echo "==> Done. Wiki on ${HOST}:3014 (https://wiki.tenshinryu.xyz after tunnel + DNS)"
