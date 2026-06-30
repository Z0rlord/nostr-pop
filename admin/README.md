# DojoPop Admin (placeholder)

Static placeholder for **admin.dojopop.live** on relay-2 port **3002**.

Reserved for a future DojoPop operations dashboard (relay health, pipeline status, bunker ops, etc.). For now serves a simple link hub.

| Service | Port | Public URL |
|---------|------|------------|
| nginx + static HTML | 3002 | `https://admin.dojopop.live` |

## Deploy

```bash
chmod +x deploy.sh
./deploy.sh relay-2
```

Tunnel ingress: `admin.dojopop.live` → `:3002` via `web/scripts/update-tunnel-ingress.sh`.
