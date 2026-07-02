#!/usr/bin/env bash
# Install PubSub subscription renewal cron on relay-2 (every 5 days).
#
# Usage: ./setup-renew-cron.sh [ssh-host]
set -euo pipefail

HOST="${1:-relay-2}"
CRON_LINE='0 4 */5 * * cd /opt/dojopop/pipeline && /usr/bin/docker compose exec -T youtube-pubsub uv run --project pipeline pipeline/youtube_pubsub.py renew >> /var/log/dojopop-pubsub-renew.log 2>&1'

echo "==> Installing renewal cron on ${HOST}..."
ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  touch /var/log/dojopop-pubsub-renew.log
  chmod 644 /var/log/dojopop-pubsub-renew.log
  (crontab -l 2>/dev/null | grep -v 'youtube_pubsub.py renew' || true; echo '${CRON_LINE}') | crontab -
  echo '==> Current crontab:'
  crontab -l | grep youtube_pubsub || true
"
