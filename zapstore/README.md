# DojoPop on Zapstore

Spike scaffold for listing [DojoPop](https://dojopop.live) on [Zapstore](https://zapstore.dev/) — the Nostr-native app store (NIP-82 kinds 32267 / 30063 / 1063).

## Current state (2026-07-17)

| Item | Status |
|------|--------|
| Native Android/iOS app in repo | **No** |
| `web/` PWA manifest | **No** (`manifest.json` / `manifest.webmanifest` missing) |
| TWA / Bubblewrap / Capacitor | **No** |
| NIP-05 at `dojopop.live` | **Yes** — `web/src/app/.well-known/nostr.json/route.ts` (name `z0rlord` only; no domain-root `_` claim yet) |
| Zapstore CLI (`zsp`) on dev machine | **Not installed** |
| Android SDK | **Not installed** (not required for `goapk` wrapper path) |

DojoPop is a **Next.js** site (`web/`), not a packaged mobile app. Zapstore’s primary distribution format is still an **APK** (or an APK wrapper around a PWA URL).

## Zapstore artifact types (research summary)

| Type | Supported today? | Notes |
|------|------------------|-------|
| **Android APK** | Yes | Primary path via [`zsp`](https://github.com/zapstore/zsp) (`go install github.com/zapstore/zsp@latest`). Old name `zapstore-cli` → now **`zsp`**. |
| **CLI binaries** | Yes | Same `zsp publish` flow; release asset is the binary instead of APK. |
| **PWA (URL / web-pwa)** | Partial / rolling out | [Webapps design (#326)](https://github.com/zapstore/zapstore/issues/326): indexed crawl, **claimed** via NIP-05 domain proof, or developer-published. Still needs installable `manifest.json` (`display: standalone\|minimal-ui\|fullscreen`). |
| **Web Bundle (.wbn)** | Design / early | Hash-verified offline bundle via `zsp`; Zapstore generates APK wrapper. |
| **Web link only (no APK)** | Fallback | “Open in browser” for PWAs; install path still uses Zapstore-generated APK wrapper when available. |

Publishing flow (APK):

1. Build or obtain an APK (native build, or [`goapk`](https://github.com/zapstore/goapk) PWA wrapper).
2. Configure `zapstore.yaml` (this directory) with `repository` + `pubkey`.
3. Commit `zapstore.yaml` to the linked Git repo (whitelist verification).
4. `SIGN_WITH=<signing-method> zsp publish zapstore/zapstore.yaml`
5. First publish: link APK signing certificate to Nostr identity (`zsp identity --link-key`, NIP-C1).

Signing (`SIGN_WITH`):

| Method | Example |
|--------|---------|
| nsec | `SIGN_WITH=nsec1...` (prefer bunker in CI) |
| hex | `SIGN_WITH=0123...` |
| NIP-46 bunker | `SIGN_WITH=bunker://pubkey?relay=...&secret=...` |
| NIP-07 browser | `SIGN_WITH=browser` |

Docs: https://zapstore.dev/docs/publish · Trust / whitelist: https://zapstore.dev/docs/trust-model

## Recommended path for DojoPop

**Short term (feasible now): Option A — PWA wrapper APK + `zsp`**

1. Add a proper PWA manifest to `web/public/` (see `manifest.webmanifest` template here).
2. Deploy to `dojopop.live`.
3. Build wrapper APK with `goapk` (no Android SDK): `./zapstore/build-apk.sh`
4. Publish with `zsp` using a **dedicated release Nostr key** (see below).
5. Optionally add domain-root NIP-05 claim (`"_"` key) for Tier-1 “claimed PWA” once Zapstore web indexing is live.

**Simpler but incomplete: Option B — claimed/indexed PWA only**

- Requires installable manifest on the live site + NIP-05 domain claim.
- Does **not** replace a developer-signed APK listing today; good complement once PWA catalog is live.
- DojoPop is **not** installable yet (no manifest).

**Defer: Option C — real native app**

- Wait for Capacitor/React Native/etc. if you need camera, background upload, or offline-first UX beyond WebView.

### Which Nostr key?

| Key | Use today | Use for Zapstore? |
|-----|-----------|-------------------|
| `NOSTR_NSEC` | Founder / YouTube→Nostr pipeline | Possible, but couples store identity to content pipeline |
| `DOJOPOP_LOGIN_NSEC` | DM login bot, nostu.be mirrors | **Not recommended** — keep bot separate from human-facing release identity |
| **New `DOJOPOP_RELEASE_NSEC`** | — | **Recommended** — generate fresh nsec/npub in Doppler (`dojopop` / `prd_zorie`), add `pubkey` to `zapstore.yaml`, whitelist via repo |

Add the release npub to `/.well-known/nostr.json` under `"_"` when pursuing claimed-PWA tier:

```json
{
  "names": {
    "_": "<release-pubkey-hex>",
    "z0rlord": "..."
  }
}
```

## Quick start (manual — you run these)

### 1. Install tools

```bash
# Zapstore publisher CLI
go install github.com/zapstore/zsp@latest

# PWA → APK wrapper (single binary, no Android SDK)
# Download from https://github.com/zapstore/goapk/releases for your arch
# or: go install github.com/zapstore/goapk@latest
```

### 2. PWA prerequisites (web app)

Copy/adapt `zapstore/manifest.webmanifest` → `web/public/manifest.webmanifest`, add icons under `web/public/icons/`, link from `web/src/app/layout.tsx`, deploy.

### 3. Build wrapper APK

```bash
cd /Users/perseus-air/Projects/dojopop
./zapstore/build-apk.sh
# Output: zapstore/dist/dojopop-release.apk
```

For production, create a release keystore once and pass `KEYSTORE_PATH` / `KEYSTORE_PASSWORD` (see script).

### 4. Configure signing identity

```bash
# Generate key (example — run locally, store in Doppler only)
# node web/scripts/generate-login-bot-key.mjs  # or your preferred nsec generator

# Edit zapstore/zapstore.yaml: set pubkey to the release npub
# Commit zapstore.yaml to GitHub/GitLab (whitelist)
```

### 5. Publish

```bash
export SIGN_WITH=bunker://...   # or nsec via doppler run --
doppler run -- zsp publish zapstore/zapstore.yaml
```

First run will prompt for APK certificate linking (`zsp identity --link-key`).

### 6. Verify

- Open Zapstore app / https://zapstore.dev and search for DojoPop.
- Confirm kind 32267 app event on relays (see `zsp` output `naddr`).

## Files in this directory

| File | Purpose |
|------|---------|
| `zapstore.yaml` | `zsp` config (repository, pubkey, release path) |
| `build-apk.sh` | `goapk` wrapper build helper |
| `manifest.webmanifest` | Template to copy into `web/public/` |
| `twa-config.json` | Optional Bubblewrap/TWA reference (if you later use Chrome tooling + Play asset links) |

## Open questions

- Confirm Zapstore relay accepts `web-pwa` developer publishes on your target client version (Milestone 1.3).
- App icons: `web/` currently has `hero-dojo.jpg` only — generate 192/512 PNG icons before store listing.
- Package name `live.dojopop.app` is a suggestion; changing it later requires a new listing.

## References

- https://zapstore.dev/
- https://zapstore.dev/docs/publish
- https://github.com/zapstore/zsp
- https://github.com/zapstore/goapk
- https://github.com/zapstore/zapstore/issues/326 (webapps design)
