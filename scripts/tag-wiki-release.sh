#!/usr/bin/env bash
# Bump tenshinryu-wiki/VERSION, commit, and tag for rollback.
#
# Usage:
#   ./scripts/tag-wiki-release.sh              # tag wiki-v$(cat VERSION)
#   ./scripts/tag-wiki-release.sh 2026.07.15   # set VERSION then tag
#
# After tagging, deploy from repo root:
#   cd tenshinryu-wiki && ./deploy.sh relay-2
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="${REPO_ROOT}/tenshinryu-wiki/VERSION"

if [[ $# -ge 1 ]]; then
  echo "$1" >"$VERSION_FILE"
fi

if [[ ! -f "$VERSION_FILE" ]]; then
  echo "Missing $VERSION_FILE" >&2
  exit 1
fi

VERSION="$(tr -d '[:space:]' <"$VERSION_FILE")"
TAG="wiki-v${VERSION}"

cd "$REPO_ROOT"

if ! git diff --quiet -- tenshinryu-wiki/VERSION; then
  git add tenshinryu-wiki/VERSION
  git commit -m "chore(tenshinryu-wiki): bump VERSION to ${VERSION}"
fi

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists ($(git rev-parse --short "$TAG"))" >&2
  exit 1
fi

git tag -a "$TAG" -m "Tenshinryu wiki release ${VERSION}"
SHA="$(git rev-parse --short HEAD)"

echo ""
echo "Tagged ${TAG} at ${SHA}"
echo ""
echo "Rollback to this release:"
echo "  git checkout ${TAG}"
echo "  cd tenshinryu-wiki && uv run python scripts/build-site.py"
echo "  ./deploy.sh relay-2 --skip-build"
echo ""
echo "Or rebuild + deploy:"
echo "  git checkout ${TAG} && cd tenshinryu-wiki && ./deploy.sh relay-2"
