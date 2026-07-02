"""Meta (Instagram/Facebook) and TikTok posting stubs — direct APIs, no aggregator.

Secrets are injected via Doppler (`dojopop` / `prd_zorie`); names only below.

Meta / Instagram / Facebook (Graph API v21+):
  META_APP_ID           — Meta developer app ID
  META_APP_SECRET       — app secret (server-side only)
  META_ACCESS_TOKEN     — long-lived user or page access token
  META_IG_USER_ID       — Instagram Business/Creator account ID
  META_FB_PAGE_ID       — Facebook Page ID (page posts; optional for IG-only)

TikTok (Content Posting API):
  TIKTOK_CLIENT_KEY     — app client key from TikTok Developer Portal
  TIKTOK_CLIENT_SECRET  — app client secret
  TIKTOK_ACCESS_TOKEN   — user access token (OAuth 2.0)
  TIKTOK_OPEN_ID        — authorized user's open_id

Setup (not yet implemented in code — follow when wiring real calls):

Instagram / Facebook
  1. Create a Meta developer app: https://developers.facebook.com/apps/
  2. Add Instagram Graph API + Facebook Login products.
  3. Connect an Instagram Business/Creator account to a Facebook Page.
  4. Generate a long-lived token (`META_ACCESS_TOKEN`) with scopes:
     instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement.
  5. Resolve `META_IG_USER_ID` via GET /{page-id}?fields=instagram_business_account.
  6. Store all META_* names in Doppler; never commit values.

TikTok
  1. Register app: https://developers.tiktok.com/
  2. Enable Content Posting API; complete app review for production.
  3. OAuth authorize a creator account; exchange for `TIKTOK_ACCESS_TOKEN`.
  4. Store TIKTOK_* names in Doppler.

Reference docs:
  - Instagram: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
  - Facebook:  https://developers.facebook.com/docs/graph-api/reference/page/feed
  - TikTok:    https://developers.tiktok.com/doc/content-posting-api-get-started
"""

from __future__ import annotations

from pathlib import Path

_META_SETUP = (
    "Meta posting not implemented. Add META_APP_ID, META_APP_SECRET, META_ACCESS_TOKEN, "
    "META_IG_USER_ID (and META_FB_PAGE_ID for Facebook) to Doppler, then implement "
    "Graph API calls in pipeline/meta_tiktok.py. See module docstring."
)

_TIKTOK_SETUP = (
    "TikTok posting not implemented. Add TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, "
    "TIKTOK_ACCESS_TOKEN, TIKTOK_OPEN_ID to Doppler, then implement Content Posting API "
    "calls in pipeline/meta_tiktok.py. See module docstring."
)


def post_instagram(text: str, media: Path | None = None) -> dict:
    """Post to Instagram (Reels/feed). Raises NotImplementedError until wired."""
    detail = _META_SETUP
    if media:
        detail += f" Media: {media.name} (video → Reels container flow)."
    raise NotImplementedError(detail)


def post_facebook(text: str, media: Path | None = None) -> dict:
    """Post to a Facebook Page feed. Raises NotImplementedError until wired."""
    detail = _META_SETUP
    if media:
        detail += f" Media: {media.name} (resumable upload → /{page-id}/photos|videos)."
    raise NotImplementedError(detail)


def post_tiktok(text: str, media: Path | None = None) -> dict:
    """Post to TikTok via Content Posting API. Raises NotImplementedError until wired."""
    detail = _TIKTOK_SETUP
    if media:
        detail += f" Media: {media.name} (direct post or upload-then-publish)."
    raise NotImplementedError(detail)
