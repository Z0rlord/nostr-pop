# Session: Relay / Blossom abuse-prevention controls

**Date:** 2026-07-17
**Project:** dojopop | nostr-pop

## Summary

Audited DojoPop relay (`nostr-rs-relay` 0.10) and self-hosted Blossom for
technical barriers against spam and prohibited content. Random non-members are
already blocked from writes; remaining risk is mostly **active members** (and
synced Blossom uploaders) publishing unconstrained kind-1/22/video events or
uploading blobs outside the web practice path. Applied safe config hardenings;
documented ops delete/report paths. Not legal advice — frame as abuse /
prohibited-content policy (jurisdiction-dependent).

## Honest assessment

### What already blocks random abuse

| Control | Strength |
|--------|----------|
| Relay `pubkey_whitelist` (active members + admin + Cordn extras + login-bot) | **Strong** — non-members cannot `EVENT` |
| Relay `event_kind_allowlist` | **Strong** vs arbitrary kinds; DMs (4/44/1059) never allowed |
| Rate / size limits (`messages_per_sec`, `max_event_bytes` 128 KiB) | **Moderate** DoS / payload size |
| Blossom `requireAuth` + `requirePubkeyInRule` + MIME `video/*`/`image/*` | **Strong** vs anonymous / non-media hosting |
| Web practice publish (`/api/practice/publish`) | **Strong for that path** — active member, kind 22, Day N title, ≤90s, hashtags, daily cooldown |
| Web Blossom proxy membership check | **Strong for that path** — same membership + cooldown |

### Remaining gaps

1. **Whitelisted members bypass practice rules on the relay.** Anyone on
   `pubkey_whitelist` can publish kind `1`, `21`, `22`, `34235`, `34236`,
   `34567`, etc. directly to `wss://relay.dojopop.live` with arbitrary text or
   video metadata. Practice validation is **web API only**, not relay-enforced.
2. **Blossom member sync.** `sync-blossom-whitelist.mjs` puts **all active
   members** into storage rule pubkeys. Members can `PUT /upload` (and
   `/mirror`) with their own BUD-02 auth, bypassing web cooldown/practice
   checks. MIME still limited to video/image; max size is **5 GB**.
3. **No body / media content scanner** in nostr-rs-relay 0.10 or blossom-server
   (by design here). No hash blocklist built into blossom-server config —
   operator force-delete + optional re-upload block after delete (BUD-09 MAY).
4. **Kind 1 / video kinds** can link to **external** URLs (not only
   blossom.dojopop.live) — policy/ToS + ops, not relay MIME.
5. **Membership strength:** active `members.json` → sync scripts / in-app
   `relay-sync` / `blossom-sync`. Revoked members stay writable until sync
   runs. Payment alone does not imply content compliance.
6. **Blossom `GET /:sha` remains public** (content-addressed CDN behavior) —
   knowing a hash still fetches the blob; listing is what we disabled.
7. **NIP-70 protected events / NIP-42:** unused; whitelist already gates writes.
   Optional later for republish control, not spam prevention.

### nostr-rs-relay 0.10 moderation surface

From upstream `config.toml`: `event_kind_allowlist` / `blacklist`,
`pubkey_whitelist`, rate/size limits, `limit_scrapers`, optional NIP-42,
NIP-05 domain lists, pay-to-relay ToS text, **`[grpc] event_admission_server`**
for external admit/deny. **No keyword / CSAM / media classifier.**

## Actions taken (config quick wins)

### `relay/config.toml`

- NIP-11 `description` + contact already point to abuse reporting
  (`admin@dojopop.live`).
- `remote_ip_header = "cf-connecting-ip"`.
- `messages_per_sec`: 50 → **20**; added `subscriptions_per_min = 30`.
- `limit_scrapers = true`.
- **Removed kind `1063`** (unused NIP-94; imeta on kind 22 is enough).
- Documented excluded DMs / 1984 / 24242 and gRPC admission hook in comments.

**Preserved:** Cordn `11316–11320`, `25910`; practice/`pipeline` kinds `22`,
`1`, `5`; membership-related `0`, `3`, `10002`, `10063`, `10096`; video
`21`, `34235`, `34236`; `34567`.

### `blossom-server/config.yml`

- **`list.enabled: false`** (was true + unauthenticated) — reduce enumeration.
- `list.requireAuth: true`, `allowListOthers: false` if re-enabled later.
- Kept **`mirror.enabled: true`** (admin `mirror_yakihonne_to_dojopop.py`).
- Kept **`report.enabled: true`** (BUD-09).
- Commented template for **admin dashboard** (enable on host with Doppler
  password only — never commit).
- Policy comments at top of file.

## Prioritized hardening plan

### P0 — ops (immediate, after deploy configs)

1. Deploy relay + blossom configs: `relay/deploy.sh`, `blossom-server/deploy.sh`.
2. Document delete runbook (already exists):
   - Events: `pipeline/delete_published.py` / `delete_practice_event.py` (NIP-09
     kind 5 + Blossom DELETE).
   - Blobs: BUD-02 DELETE with kind-24242 `t=delete` as owner/admin.
3. Enable Blossom **admin dashboard** on relay-2 with Doppler
   `BLOSSOM_ADMIN_PASSWORD`; review `PUT /report` queue periodically.
4. Publish a short **prohibited-content / ToS** page on dojopop.live (link from
   relay description) — no secrets.

### P1 — code (high leverage)

1. **Blossom upload only via web proxy, re-signed as admin** — stop syncing
   member pubkeys into blossom rules (or keep admin-only). Closes direct
   `/upload` and `/mirror` abuse by members while keeping practice flow.
2. Optional: reject web/proxy uploads unless `Content-Type` is
   `video/mp4` / `image/webp|jpeg` (narrower than `video/*`).
3. Optional: lower default `upload.maxSize` for member path; keep 5 GB only for
   admin/film tooling.
4. Relay admission via gRPC: deny kind 22 unless practice tags, or deny kind 1
   over N chars — only if product wants hard enforcement beyond ToS.

### P2 — process

1. Cron or Stripe webhook → always re-run whitelist sync on cancel/expire.
2. Hash blocklist file maintained ops-side after confirmed abuse (manual
   reject on re-upload if blossom supports, or reverse-proxy).
3. Optional public report form → email/Notion + BUD-09 report.

## Open items

- [ ] Deploy hardened configs to relay-2
- [ ] Enable blossom admin dashboard (Doppler password)
- [ ] Decide P1: admin-only blossom rules + web re-sign
- [ ] Public ToS / prohibited-content page

## References

- `relay/config.toml`, `relay/README.md`
- `blossom-server/config.yml`, `blossom-server/README.md`
- `web/scripts/sync-relay-whitelist.mjs`, `sync-blossom-whitelist.mjs`
- `web/src/app/api/practice/publish/route.ts`, `web/src/lib/practice-events.ts`
- `pipeline/delete_published.py`
- Upstream: [nostr-rs-relay config](https://github.com/scsibug/nostr-rs-relay/blob/master/config.toml),
  [blossom-server](https://github.com/hzrd149/blossom-server) BUD-09 reports
