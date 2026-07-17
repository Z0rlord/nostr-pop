# DojoPop Cordn coordinator

[ Cordn](https://github.com/Z0rlord/cordn) — MLS group messaging over Nostr relays (ContextVM).
Self-hosted coordinator for encrypted dojo channels (membership groups, school cohorts).

| Item | Value |
|------|--------|
| Image | `ghcr.io/cordn-msg/cordn:latest` |
| Host | relay-2 (Docker, `dojopop-internal` network) |
| Transport | **Relays only** — no HTTP tunnel; clients use [cordn.net](https://cordn.net) or a Cordn-aware app |
| Relays | `wss://relay.dojopop.live` + public fallbacks |

## First-time setup

1. Generate a stable coordinator key (once):

```bash
openssl rand -hex 32
```

2. Add to Doppler `dojopop` / `prd_zorie` as **`CORDN_SERVER_PRIVATE_KEY`**.

3. Deploy:

```bash
cd cordn
chmod +x deploy.sh
doppler run --project dojopop --config prd_zorie -- ./deploy.sh relay-2
```

Coordinator pubkey: `d969813a5c0e3e65dad03fc9e1d2db5933dda8b307ddce474e8da60b4e288259`

Add in [cordn.net](https://cordn.net/chat/coordinators) via logs on relay-2:
`docker logs dojopop-cordn 2>&1 | head -20`

## DojoPop Global group

After coordinator deploy, create the global MLS group:

```bash
doppler run --project dojopop --config prd_zorie -- ./bootstrap-global.sh
```

Writes `cordn/dojopop-global.json` (gid, coordinator, relays). Bootstrap uses `encryptOutbound: true` so the welcome message posts via the coordinator opaque `gid` path (required for current coordinator builds).

Chat UI: **dojopop.live/chat** → Cordn web client at `/chat-app/` (see `chat-ui/README.md`).

## Notes

- Cordn is **not** classic Nostr DMs (kind 4). It uses MLS groups with Nostr-shaped message envelopes inside ciphertext.
- Members request to join via the chat UI; the group admin (`DOJOPOP_CORDN_ADMIN_PRIVATE_KEY`) signs in to approve join requests.
- `DOJOPOP_LOGIN_NSEC` / pipeline `NOSTR_NSEC` are separate identities — do not reuse for Cordn unless intentional.

## Related

- Bouquet (blob browser): `bouquet.dojopop.live`
- Practice video mirror to self-hosted Blossom: `pipeline/mirror_yakihonne_to_dojopop.py`
