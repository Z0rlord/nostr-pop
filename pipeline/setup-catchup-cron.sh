#!/usr/bin/env bash
# Install periodic feed catch-up cron on relay-2 (belt-and-suspenders for missed PubSub pings).
#
# YouTube's hub does not always deliver notifications. catchup scans the Atom feed
# and runs pipeline.py for any video id missing from published.json.
#
# Usage: ./setup-catchup-cron.sh [ssh-host]
set -euo pipefail

HOST="${1:-relay-2}"
CRON_LINE='15 */6 * * * cd /opt/dojopop/pipeline && /usr/bin/docker compose exec -T youtube-pubsub uv run --project pipeline pipeline/youtube_pubsub.py catchup >> /var/log/dojopop-pubsub-catchup.log 2>&1'

echo "==> Installing catch-up cron on ${HOST}..."
ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  touch /var/log/dojopop-pubsub-catchup.log
  chmod 644 /var/log/dojopop-pubsub-catchup.log
  (crontab -l 2>/dev/null | grep -v 'youtube_pubsub.py catchup' || true; echo '${CRON_LINE}') | crontab -
  echo '==> Current crontab:'
  crontab -l | grep youtube_pubsub || true
"
