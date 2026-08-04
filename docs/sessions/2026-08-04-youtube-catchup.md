# Session: YouTube catch-up (Days 1347–1358)
**Date:** 2026-08-04
**Project:** dojopop

## Summary
Channel Shorts were 12 videos ahead of DojoPop after Day 1346 (2026-07-20).
Published all missing shorts from the laptop (cookies + residential IP): Blossom,
kind-22, Primal kind-1, and login-bot nostu.be mirrors. Merge-only update of
relay-2 `published.json` (183 → 195). Local count: 195.

## Decisions
- Same path as prior catch-ups: `watch?v=` URLs; laptop publish when relay yt-dlp
  is bot-blocked.
- `UP81_up6wfQ` (三尺刀, 99s) needed `--max-duration 120`; prepare still trims to
  60s @ 480p for upload.
- Merge-only update of relay-2 `published.json` (never full overwrite from laptop).

## Actions taken
- Listed channel Shorts via yt-dlp; Atom feed 404 from this network (use Shorts
  tab listing instead).
- Missing since Day 1346: Days 1347–1353, untitled Jul 28 (`jI9bZI8zdoE`),
  1355–1356, 三尺刀 (`UP81_up6wfQ`), Day 1358. (No Day 1354/1357 titles on YT.)
- Published with
  `doppler run --project dojopop --config prd_zorie -- uv run --project pipeline pipeline/pipeline.py --url <watch-url>`
  (UP81 with `--max-duration 120`).
- Kind-22 accepted on relay-2 + public relays (occasional damus 503).
- Nostube mirrors accepted on relay-2 / dojopop / primal / nos.lol (login-bot
  whitelist still good).
- Merged 12 entries into `/opt/dojopop/pipeline/data/published.json` on relay-2
  (backup `published.json.bak-20260804`).

### Event ids

| Day | yt id | kind-22 | Primal kind-1 | nostube mirror |
|-----|-------|---------|---------------|----------------|
| 1347 | VfI07hnUZ5M | `f4c4601ec3579978d63bdf1da501ae10ae630e0ed620a7e3b4ce07d0ec7f455e` | `7ed5c23635df1090b1f25d7accf0e8681420302e7378614ed08e4c15212fa321` | `7c167f412258ce4c2aa09aa62589027c1fe13fe4c2adbb59c9d6d107788f1518` |
| 1348 | ZtNGl7T7O6Y | `662116c7746660aa7a4f8f19c87f216364396bc0b683c0a9c5410977744bad68` | `ee457bf315fa6ef750a00bf17e42e6b898254e42a3cd4bf83e36de5709a08b37` | `56d5334722072900385ed32126ef19f16565a9f84a6dd2dd26e39b45ee5754a7` |
| 1349 | n38zRvnNtQk | `bd2edfd42a80086f387dae9472162f29da187a65802798d8bf8151270418ec1a` | `c601c3542fc62fbc05f0425f281f6c5ace2573e1ef138465637642d74887c850` | `19385882bfac8e2a49b4173a8643586b6ddbb2dd02c20568cd223a0ae8abfaf5` |
| 1350 | GmX8qeA5xHU | `32478f4f20e42a8c821b3deabbe6e0b643aa29d1eb5e484e0e27fd850761bec4` | `78e3d94052e13c7b5a1d2a892c11fa10a4016e13b90c2467f52b159ef1d16ad8` | `a3593c8ca163ba951ca22ee1efedbfb63213f316d91c947ef5104fdba9b6cd19` |
| 1351 | gPkuE7rh8qE | `d197c690b02295ced97bcae7a66cf23bb1fd0bbc40ed8072289cf9d804bc1b75` | `7cf29c8369b8961dbe26d6cd917be96e8f7c0f2e3c4d73a085a0bd1778cffe08` | `420c64d8d3a22132446ae7cbb3bb7ddeaf08d62d4c78647060dcf517a29dd93c` |
| 1352 | XKdYPPaiLrA | `07e7d1b50599daecc8ceb7c13e6a0d91231ec3109c054e943ecfa1a2357d1b51` | `8ef61f95a456aff4fc1a6fe52f6b37bcbae9e6bfad6fe62db52a139946519a07` | `6a8d94132ad49552c3a48c83e81b3a73dbe6de48c5481791eb387062ecbe854f` |
| 1353 | wjNTC91PTFU | `275772ac328d6b86b42e4031962dcb7abe978c6c5ccc943083fe884bdc75c603` | `5789bb6a97830ecb3b5215c46929d46f3465593e1103bfc568c6f828c6e1a856` | `0b49f97ef7065aa2c61e4cd33a33600df5150827fd94c1d87ae51440625e0e6c` |
| — (Jul 28) | jI9bZI8zdoE | `d6bf4993ed298ff2cfca2276b35f78dd2bf186c894f6c96079add045409ef087` | `61470cafa2a88352ff4b8ba9464af6652b9ac054ce5bac3ba802eb585f0ebb02` | `07dec3429fa506d98c259d1cbd6475bcfc6545e2be1178f7b08203b811645ccc` |
| 1355 | 4Tn7N5lpsD8 | `338d61338c7ff7d7768a95cfc9386bb0328b3a11c9e6810c09cbe6c6963ea8e7` | `ac8a2be1f60596e8c8d96b513fd3ca9a50db754146ec2a218bcfb3a09889883f` | `5592f121cf77c7105132439d864a862d56547cd6ae754ae9c7069ca9898f1893` |
| 1356 | qaezwlzvhPk | `7496dd736415d2c9d913ce921383a8801757ec6c5a5c271539e1f5db3b6bb19c` | `e61090c94ea53cff5c9b364067c37496f82fc473f44c503fa2a7a12ac8de8cf3` | `8ccf557f2cbb53017c6f225649a55bbefc7bf959c1e60b59a0eb646ca2a20121` |
| — (三尺刀) | UP81_up6wfQ | `b97ac42036846c1436e80fe508b64a4afe74b661e8b5d6ba49e4cec58b265bc1` | `062a1bf369dce5b3745d757591f1d4151d3ce7e79991aef328afc860e305e18d` | `4e125f4ae00190428648467f6a339ac258b519f257117cfae16b43808c324497` |
| 1358 | nPETA3DstKQ | `d0dbd5ae0dd9152344b6adaaa3dbf073b7976d90aa130e2cf9ddc2c70c118a66` | `650e1eb1d996e5440904ca1af9a4ed80c01772adb19b6c3b5c04578e55a05d53` | `10871da02b97fda36af68960fe7c11ab0e4baab0b13d2c99b4da249e2b3957ca` |

## Open items
- Keep `data/youtube-cookies.txt` fresh on relay-2 (or set `YT_DLP_PROXY`) so
  automated catch-up does not stall.
- YouTube Atom feed returned 404 from laptop today; Shorts tab listing worked.
- Channel titles skip Day 1354 / 1357 numbering (Jul 28 + 三尺刀 fill those slots).

## References
- Prior: `docs/sessions/2026-07-20-youtube-catchup.md` (Days 1345–1346)
- Doppler: `dojopop` / `prd_zorie` (`NOSTR_NSEC`, `DOJOPOP_LOGIN_NSEC`, `YOUTUBE_CHANNEL_ID`)
- Login-bot npub: `npub1tr2lmpne0npfznnmurnktqat9ya0thf4hsx6zkmhmyksjwlvg97qkctgqa`
