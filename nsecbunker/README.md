# DojoPop nsecBunker (DEPRECATED)

> **Status:** Decommissioned 2026-06-24. Replaced by [Bunker46](../bunker46/) at
> `https://admin.dojopop.live`. Docker volumes retained on relay-2 for rollback (7–14 days).

Self-hosted [nsecBunker](https://github.com/kind-0/nsecbunkerd) daemon plus the
[Z0rlord/nsecbunker-admin-ui](https://github.com/Z0rlord/nsecbunker-admin-ui)
admin panel for secure team key management over Nostr (NIP-46).

## Former stack

| Service | Port (relay-2) | Public URL |
|---------|----------------|------------|
| `nsecbunkerd` | 3003 | NIP-46 via `wss://relay.dojopop.live` |
| Admin UI | 3002 | `https://admin.dojopop.live` (now Bunker46) |

## Rollback (emergency only)

```bash
ssh relay-2 'cd /opt/dojopop/bunker46 && docker compose stop'
ssh relay-2 'cd /opt/dojopop/nsecbunker && docker compose up -d'
```

Config backup: `/opt/dojopop/backups/nsecbunker-config-YYYYMMDD.tar.gz`

## Local dev (admin UI only)

```bash
cd nsecbunker-admin-ui
npm install
npm run dev
# → http://localhost:5173
```

## Notes

- Do not delete `dojopop_nsecbunker_bunker-config` volume until rollback window expires.
- See [bunker46/README.md](../bunker46/README.md) for the current bunker manager.
