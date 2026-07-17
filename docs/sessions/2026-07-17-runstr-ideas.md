# Session: RUNSTR ideas for DojoPop
**Date:** 2026-07-17
**Project:** dojopop

## Summary

Researched [runstr.club](https://www.runstr.club) and the open-source [RUNSTR-LLC/RUNSTR](https://github.com/RUNSTR-LLC/RUNSTR) app (React Native + Expo, Supabase + Nostr NDK, LNURL rewards). Mapped their workout-to-earn / clubs / captain-events model onto DojoPop’s martial-arts proof-of-practice stack (kind 22 videos, streaks in `practice-events.ts`, schools pilot, NWC membership, Cordn chat). No features implemented — proposal only.

## RUNSTR feature snapshot

| Area | What RUNSTR does |
|------|------------------|
| Activity | GPS cardio (run/walk/cycle/hike) + Apple Health / Health Connect sync |
| Protocol | Publishes **kind 1301** workout notes (NIP-101e draft; also templates 33401/33402) |
| Social | Fitness feed; like / comment / **zap** |
| Compete | Always-on daily leaderboards (steps, distance, fastest 5K/10K) |
| Clubs | Captain-created clubs; member lists via **kind 30000**; join requests |
| Events | Captain-hosted challenges (templates); members auto-entered; prize pools via captain **NWC** |
| Rewards | ~50 sats/day qualifying workout (LNURL → lud16); streak levels; event placements; captain cut when members train |
| Monetization | Free core + Pro (~7k sats/mo historically); **Seasons** (e.g. charity distance competitions with large prize pools) |
| Stack note | Product story is “open Nostr”; production rewards/leaderboards still lean on **Supabase** + `runstr-zapper` |

NIP-101e ([nips#1816](https://github.com/nostr-protocol/nips/pull/1816)) remains **open** (not merged). Community proposals add challenge/team/event kinds (33403–33405). DojoPop relay allowlist today does **not** include 1301 / 3340x / 30100–30101.

## Fit map (RUNSTR → DojoPop)

| RUNSTR concept | DojoPop analogue | Fit |
|----------------|------------------|-----|
| Clubs + captains | Schools (`web/src/lib/schools.ts`: owner / instructor / student) + attendance | Strong |
| Club chat | Cordn MLS `/chat` (global); per-school chat later | Medium–strong |
| Daily leaderboards | `buildPractitionerStats` / passport / practice dashboard | Already have (video-seconds based) |
| Streak rewards in sats | `computeStreaks` exists; **no payout yet**; NWC is **inbound** membership only | Strong |
| Captain events + prize pools | Missing; Alby Hub NWC could fund **outgoing** `pay_invoice` | Strong if scoped |
| Kind 1301 workouts | Kind **22** NIP-71 + `#dojopop` `#proofofpractice` “Day N” ≤90s | Weak as replace; Medium as **companion** interop |
| GPS / HealthKit | Not core to martial proof-of-practice | Skip |
| Season pass / Pro | Already **$9.99/mo** Stripe + Lightning membership | Reuse as “season eligibility”, don’t fork pricing |
| Zaps on posts | Practice feed exists; zap UX not first-class in web | Medium |

## Prioritized proposal (effort vs impact)

Effort: S ≈ 1–3 days, M ≈ 1–2 weeks, L ≈ 3+ weeks. Impact: relative to retention / school adoption / Nostr interop.

### 1. Streak sats (platform micro-rewards) — **START HERE**
- **Impact:** High — closes the “practice → sats” loop RUNSTR markets; DojoPop already computes streaks and shows them on passport/dashboard.
- **Effort:** M (payout plumbing + anti-abuse + budget caps).
- **Sketch:**
  - Cron/worker (pipeline host or Next API): load recent kind-22 practice sessions → `buildPersonalStats` / `computeStreaks`.
  - Qualifying rule v1: active member + ≥1 practice day today + current streak ≥ N (e.g. 3) → pay fixed sats (e.g. 21–50) once per UTC day.
  - Resolve destination: member profile `lud16` / lightning address (store optional override on Member).
  - Extend Alby Hub NWC connection with **`pay_invoice`**; LNURL-pay → BOLT11 → pay. Cap monthly budget; log payouts (no secrets in logs).
  - Reuse: `practice-events.ts`, `membership.ts`, `nwc-client.ts`, Doppler `NWC_CONNECTION_STRING` / rewards budget secret names only.

### 2. School “Challenge Week” (captain events lite) — **START NEXT**
- **Impact:** High for school pilot (hikari-warsaw pattern); instructors become motivators like RUNSTR captains.
- **Effort:** M.
- **Sketch:**
  - Challenge definition: JSON store or replaceable Nostr event (kind TBD; start with server-side `challenges.json` keyed by `school_id`).
  - Fields: window, goal (practice days or total seconds), optional entry fee (sats), prize pool funded by instructor invoice or school owner NWC.
  - Scoring: filter practice sessions by school member pubkeys (existing `studentNpubs` / roles) via `fetchPracticeSessions` + pubkey set.
  - Payout: top K get sats from school/instructor wallet (same outgoing NWC path as #1), or manual “Zap winners” UI for v1.
  - UI: school page + instructor dashboard; link from passport when enrolled.
  - Reuse: `schools.ts`, `class-attendance.ts`, streak/stats helpers, Cordn for announcement (optional).

### 3. Zap affordances on practice feed
- **Impact:** Medium — social reinforcement without platform treasury risk.
- **Effort:** S–M (depends on wallet UX: Alby extension / NWC in browser).
- **Sketch:** Practice cards call LNURL-pay / NIP-57 zap to author’s lud16; surface “zap this Day N” on `/practice` and video pages.
- **Defer** if streak sats land first (overlapping Lightning UX).

### 4. Companion kind-1301 alongside kind 22 (interop experiment)
- **Impact:** Medium for ecosystem (Amethyst / POWR / Chachi); Low for martial product value (no GPS metrics).
- **Effort:** M (publish path + relay allowlist + dual parsers).
- **Sketch:** On successful practice publish, also emit a minimal 1301: `title`, `exercise: martial_arts` (or discipline tag), `duration` HH:MM:SS, `t: dojopop`, `t: proofofpractice`, optional `a`/`e` link to kind-22 id. Allow kind 1301 on relay. Do **not** replace video as proof.
- **Risk:** NIP-101e unmerged; schema drift with RUNSTR’s Supabase-backed competitions.

### 5. Season / league overlay (membership-gated)
- **Impact:** Medium — marketing event; RUNSTR Seasons (charity distance pools) are a proven narrative.
- **Effort:** L.
- **Sketch:** Quarterly “Dojo Season”: members-only; score = practice days or total seconds; prize pool from platform treasury and/or school sponsorships; optional charity routing. Reuse membership gate + leaderboard math. Skip until #1–#2 prove payout ops.

### 6. Explicitly out of scope (for now)
- GPS tracking / HealthKit / steps as primary proof
- Replacing kind 22 with 1301
- Full RUNSTR-style Pro tier split (DojoPop membership already covers paid access)
- Captain kind-33404 / 30100 leagues on-relay until schools + payouts are stable

## Strongest recommendations

1. **Streak sats** — highest reuse of existing streak logic + membership + Alby Hub; clearest product differentiation vs “leaderboard only.”
2. **School Challenge Week** — maps RUNSTR captain events onto the schools pilot without inventing a second social graph.

## Decisions

- Treat RUNSTR as **inspiration for incentives + school competitions**, not a fitness-tracker clone.
- Keep **kind 22 video** as canonical proof-of-practice; any 1301 is optional companion for interop.
- Prefer **budget-capped platform rewards** and **instructor-funded challenges** over open-ended “earn more than you pay” marketing until ops are proven.
- NWC today is membership **inbound** only; outgoing payouts need explicit Hub permissions and a payout ledger.

## Actions taken

- Fetched runstr.club marketing site and RUNSTR GitHub README / architecture / reward / team / kind-1301 docs.
- Reviewed DojoPop `practice-events.ts` (streaks, leaderboard), `schools.ts`, `membership.ts`, `nwc-client.ts`, relay kind allowlist, Cordn chat session notes.
- Wrote this proposal (no code changes beyond docs).

## Open items

- Confirm Alby Hub NWC connection can grant `pay_invoice` for a dedicated rewards budget (separate connection recommended).
- Decide challenge v1 storage: server JSON vs Nostr replaceable events.
- If pursuing 1301: add kinds to `relay/config.toml` allowlist and document tag schema for martial practices.
- Optional: Notion knowledge-capture of this proposal if preferred over git-only.

---

## Messaging decision (open-protocol copy)

**Date:** 2026-07-17 (same session thread)

### Idea adapted (not copied)

Liked the *shape* of open-protocol marketing (practice as a signed network event, portable across clients, no export/API-key garden) — rewritten for DojoPop’s **NIP-71 kind 22** proof-of-practice. Do **not** claim kind 1301 shipping; optional companion remains future-only.

### Draft variants (EN)

1. **Hero** (`hero.ownership`) — short ownership + portability line  
2. **Nostr guide** (`nostr.whatP2`) — kind 22 / tags / clients / no walled garden  
3. **Practice page** (`practice.description`) — log from relays; DojoPop as one door in  

All three wired (hero + `/nostr` + `/practice`). Other locales temporarily use the same English for these three keys until translated.

### Final English copy shipped

**`hero.ownership`:**  
Each practice clip is a signed Nostr event on the relays — not a row DojoPop locks away. Clients that speak short video can show the same proof without an export or API key.

**`nostr.whatP2`:**  
When you publish, your session becomes a NIP-71 short video (kind 22) tagged #dojopop and #proofofpractice — signed by your keys, stored on relays, not as a private DojoPop database row. Membership unlocks publishing; the record itself is open. YakiHonne, Primal, nostu.be, Damus (limited), and other video-aware clients can surface the same proof. No walled garden, no “download your data” ritual — your training log can travel with the protocol.

**`practice.description`:**  
Your personal training log — sessions, streaks, and clips pulled from the relays under your npub. Proof lives on Nostr as signed short video; DojoPop is one door in, not a silo.

### Files

- `web/src/i18n/dictionaries/en.ts` (+ es/ja/pl/it/el same keys, EN temporary)
- Surfaces: `Hero.tsx` → `hero.ownership`; `NostrGuideContent.tsx` → `nostr.whatP2`; `practice/page.tsx` → `practice.description`

### Constraints honored

- No product name from the inspiration source in UI copy  
- No near-identical sentence structure  
- No kind-1301 claims in marketing

## References

- https://www.runstr.club
- https://github.com/RUNSTR-LLC/RUNSTR (docs: `KIND_1301_SPEC.md`, `REWARD_RULES.md`, `TEAM_MANAGEMENT_SYSTEM.md`, `ARCHITECTURE.md`)
- https://github.com/nostr-protocol/nips/pull/1816 (NIP-101e, open)
- `web/src/lib/practice-events.ts`, `web/src/lib/schools.ts`, `web/src/lib/membership.ts`, `web/src/lib/nwc-client.ts`
- `docs/lightning-nwc.md`, `relay/config.toml`
- Cordn: `docs/sessions/2026-07-09-dojopop-global-cordn-chat.md`
