# Session: Zapstore listing feasibility (DojoPop)
**Date:** 2026-07-17
**Project:** dojopop

## Summary

Researched [Zapstore](https://zapstore.dev/) for listing DojoPop. The site is a Nostr-native app store (NIP-82); publishing uses **`zsp`** (successor to `zapstore-cli`), not a separate `zapstore-cli` repo. Primary artifacts are **Android APKs** and CLI binaries. PWA/web listing is designed ([zapstore#326](https://github.com/zapstore/zapstore/issues/326)) with indexed/claimed/bundled tiers, but DojoPop has **no PWA manifest** and **no native app** in-repo today. Recommended path: **wrapper APK via `goapk` + `zsp publish`**, with a **new `DOJOPOP_RELEASE_NSEC`** (not `DOJOPOP_LOGIN_NSEC`). Scaffold added under `zapstore/`.

## Decisions

- **Feasible** to list DojoPop on Zapstore without a native app, via PWA-wrapper APK (Option A).
- **Do not** use `DOJOPOP_LOGIN_NSEC` for store publishing — reserve for DM login / nostu.be bot.
- **Recommend** new Doppler secret `DOJOPOP_RELEASE_NSEC` for Zapstore signing + optional NIP-05 domain-root `"_"` claim.
- **Option B** (web-only listing) blocked until `web/public/manifest.webmanifest` with `display: standalone` is deployed and domain claim is added.
- **Option C** (wait for native app) unnecessary for an initial store presence if WebView wrapper is acceptable.

## Actions taken

- Fetched Zapstore publish docs and `zsp` / `goapk` / webapps design issue.
- Verified repo: no `android/`, Capacitor, Bubblewrap, or `web/` PWA manifest; `tenshinryu/` PWA is separate product.
- Confirmed NIP-05 route exists (`web/src/app/.well-known/nostr.json/route.ts`) but only `z0rlord` name, no `"_"` domain claim.
- Checked toolchain: `zsp`, `goapk`, Bubblewrap, Android SDK **not** installed locally.
- Scaffolded `zapstore/` (`README.md`, `zapstore.yaml`, `build-apk.sh`, `manifest.webmanifest` template, `twa-config.json`).

## Open items

- [ ] Generate `DOJOPOP_RELEASE_NSEC` in Doppler; set `pubkey` in `zapstore/zapstore.yaml`.
- [ ] Add PWA manifest + 192/512 icons to `web/public/`; deploy `dojopop.live`.
- [ ] Install `zsp` and `goapk`; create release keystore; run `./zapstore/build-apk.sh`.
- [ ] `SIGN_WITH` via bunker preferred; `zsp publish zapstore/zapstore.yaml`; complete NIP-C1 cert link on first publish.
- [ ] Commit `zapstore.yaml` to GitHub for relay whitelist.
- [ ] Optional: add `"_"` release pubkey to NIP-05 for claimed-PWA tier when Zapstore indexer supports it.

## References

- https://zapstore.dev/docs/publish
- https://github.com/zapstore/zsp
- https://github.com/zapstore/goapk
- https://github.com/zapstore/zapstore/issues/326
- Repo: `zapstore/README.md`, `zapstore/zapstore.yaml`
