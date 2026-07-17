# DojoPop chat UI (Cordn web client)

Self-hosted [Cordn web](https://github.com/Cordn-msg/cordn-web) build embedded at **dojopop.live/chat-app/**.

## Build

```bash
./chat-ui/build.sh
```

Patches upstream cordn-web:

- Default coordinator → DojoPop (`d969813a…`)
- Base path → `/chat-app`
- News feed → `patches/dojopop-feedItems.ts` (DojoPop announcements, not Cordn release notes)

Output lands in `web/public/chat-app/`. Run before `web` deploy when Cordn web changes.

## Routes

| URL | Purpose |
|-----|---------|
| `/chat` | Redirect to DojoPop Global group |
| `/chat-app/*` | Cordn SPA (MLS encrypted chat) |

## DojoPop Global group

Config: `cordn/dojopop-global.json` and `web/public/cordn/dojopop-global.json`

- **gid:** `cee986f1-2afe-417f-985d-c4fadfc23980`
- **Join:** sign in on `/chat`, request to join; group admin approves in the Join Requests panel

Admin identity (`DOJOPOP_CORDN_ADMIN_PRIVATE_KEY` in Doppler) — sign into chat-app with that key to approve members. Never commit or log the key.

## Related

- Coordinator: `cordn/` on relay-2 (`dojopop-cordn`)
- Bootstrap: `cordn/bootstrap-global.sh`
