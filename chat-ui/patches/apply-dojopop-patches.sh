#!/usr/bin/env bash
# Apply DojoPop-specific patches to vendored cordn-web before build.
set -euo pipefail

ROOT="${1:?vendor cordn-web path}"
PATCHES="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cp "$PATCHES/dojopop-feedItems.ts" "$ROOT/src/lib/news/feedItems.ts"

export ROOT
python3 <<'PY'
import os
from pathlib import Path

root = Path(os.environ["ROOT"])

news_page = root / "src/routes/chat/news/+page.svelte"
text = news_page.read_text()
text = text.replace(
    "<title>News &amp; updates | Cordn</title>",
    "<title>News &amp; updates | DojoPop</title>",
)
text = text.replace(
    'content="Cordn release notes and product news."',
    'content="DojoPop announcements and product updates."',
)
text = text.replace(
    '<p class="truncate text-xs text-muted-foreground">Release notes and product news</p>',
    '<p class="truncate text-xs text-muted-foreground">DojoPop announcements</p>',
)
text = text.replace("\n\t<SupportersList config={DEFAULT_DONATION} />", "")
text = text.replace(
    "\timport SupportersList from '$lib/components/news/SupportersList.svelte';\n",
    "",
)
if "DEFAULT_DONATION" not in text.replace("getNewsFeedItems", ""):
    text = text.replace(
        "import { getNewsFeedItems, DEFAULT_DONATION, type DonationConfig }",
        "import { getNewsFeedItems, type DonationConfig }",
    )
news_page.write_text(text)

attention = root / "src/lib/services/chatAttention.svelte.ts"
att = attention.read_text()
att = att.replace("return 'News | Cordn';", "return 'News | DojoPop';")
attention.write_text(att)

read_key = root / "src/lib/news/newsReadState.svelte.ts"
rk = read_key.read_text()
rk = rk.replace(
    "const NEWS_READ_VERSIONS_KEY = 'cordn.newsReadVersions';",
    "const NEWS_READ_VERSIONS_KEY = 'dojopop.newsReadVersions';",
)
rk = rk.replace(
    "const LEGACY_READ_KEY = 'cordn.newsLastReadAt';",
    "const LEGACY_READ_KEY = 'dojopop.newsLastReadAt';",
)
read_key.write_text(rk)
PY

echo "==> Applied DojoPop news patches"
