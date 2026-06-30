# Session: School class attendance — protocol design

**Date:** 2026-06-11  
**Project:** dojopop / nostr-pop  
**Status:** Pilot scaffold (Hikari Warsaw)

## Problem

Solo practice (kind **22** video, one practitioner, public feed) is solved in v1.
School owners need to log **one class, many students**, with:

- A different UX (roster check-in, no per-student video)
- **Per-school isolation** (Tenshinryu’s log ≠ another dojo’s log)
- Instructor as authority (not each student self-attesting)

## Recommendation: two event types, one protocol

| Mode | Kind | Who signs | Visible on |
|------|------|-----------|------------|
| Solo practice | 22 (NIP-71 video) | Student | Public `/watch` |
| Class attendance | **34567** (DojoPop JSON) | School owner / instructor | School dashboard only |

Do **not** overload kind 22 for attendance. Class sessions are structured data, not short videos.

## Kind 34567 — class attendance event

### Tags (query + permissions)

```
["d", "school-{school_id}"]           # namespace — separate log per school
["t", "dojopop"]
["t", "attendance"]
["t", "class"]                        # vs future t=solo on 34567
["p", "<student_hex_pubkey>"]         # repeat per present student (NIP-01)
["instructor", "<instructor_hex>"]    # optional co-instructor
["title", "Monday Longsword Fundamentals"]
["started_at", "1718128800"]
```

- **`#d` = school id** → `REQ` with `#d: ["school-tenshinryu-shibuya"]` returns only that school’s log.
- **`p` tags** → each student can `REQ` `#p: [their_hex]` and see classes they attended (any school).

### Content (JSON)

```json
{
  "v": 1,
  "type": "class_attendance",
  "school_id": "tenshinryu-shibuya",
  "class": {
    "name": "Monday Longsword Fundamentals",
    "discipline": "HEMA",
    "started_at": "2026-06-11T18:00:00Z",
    "ended_at": "2026-06-11T19:30:00Z",
    "location": "Shibuya"
  },
  "present_count": 12,
  "notes": "Meyer cutting drills, free sparring last 20 min"
}
```

Student list lives in **`p` tags** (standard Nostr), not only in JSON — so relays and clients can filter without parsing content.

Optional later: `absent` npubs in JSON for school-internal reporting.

## School registration (off-chain v1, Nostr-native later)

Web app stores `data/schools.json` (same pattern as `members.json`):

```json
{
  "schools": [{
    "id": "tenshinryu-shibuya",
    "name": "Tenshinryu Shibuya",
    "ownerNpub": "npub1…",
    "instructorNpubs": ["npub1…"],
    "studentNpubs": ["npub1…", "npub1…"],
    "disciplines": ["iaido", "HEMA"],
    "createdAt": "…"
  }]
}
```

**School plan** (separate from $0.99 individual): owner pays → school id issued → owner + instructors added to relay whitelist → can publish `d: school-{id}` events.

Students on the roster do **not** need individual membership to be marked present; they are tagged by the instructor’s signed event.

## Owner workflow (UI sketch)

1. **Sign in** — NIP-07 extension (`nostr` window), same as join flow.
2. **`/school/{school_id}/attendance`** — verify connected npub is owner/instructor.
3. **New class** — pick date/time, class name, discipline (HEMA / kendo / …).
4. **Roster** — checklist of enrolled student npubs (search + add npub).
5. **Submit** — client builds kind 34567, owner signs, publish to `wss://relay.dojopop.live`.
6. **Confirmation** — “12 students logged for Monday Longsword.”

No video step. Optional: one class photo later (separate kind 22 or imeta on 34567).

## School dashboard (separate from public `/watch`)

- **`/school/{id}`** — attendance calendar, per-class list, export CSV.
- Queries: `#d` + `kind:34567` + `#t: attendance`.
- **Not** mixed into public solo leaderboard (filter out `#t: class` on `/watch`).

Student view (future): **`/my/attendance`** — `#p: my_pubkey` + `#t: attendance`.

## Auth / trust model

| Risk | Mitigation |
|------|------------|
| Random person fakes a school log | Only whitelisted owner/instructor pubkeys can publish; `school_id` bound to owner at registration |
| Owner marks students who weren’t there | Social/reputational; optional student tap-to-confirm in v2 |
| School A sees School B’s data | Strict `#d` filter per school id in UI; ids are unguessable slugs or UUIDs |

Relay whitelist today is global — extend sync script to add **school owner + instructor** pubkeys when school is active.

## Implementation phases

### Phase 1 — Protocol + one school pilot
- [x] Document kind 34567 `class_attendance` in `docs/protocol/`
- [x] `schools.json` + seed script (`web/scripts/seed-hikari-warsaw.mjs`)
- [x] `/school/{id}/join` QR roster page
- [x] `/school/{id}/attendance` (NIP-07 sign + publish)
- [x] `/school/{id}` members-only attendance log
- [x] Whitelist sync includes school owner/instructor pubkeys
- [ ] Bartek `OWNER_NPUB` + relay whitelist on relay-2
- [ ] Print QR poster for Warsaw dojo

### Phase 2 — Roster + student view
- [ ] CRUD roster (add/remove npubs)
- [ ] Student “my attendance” page via `#p` filter
- [ ] CSV export for school owner

### Phase 3 — Multi-instructor + confirmations
- [ ] Delegate instructors (nsecBunker or nip46)
- [ ] Optional student NIP-07 co-sign within 24h

## Pilot decisions (2026-06-11)

| Item | Decision |
|------|----------|
| **Pilot dojo** | Hikari Aikido Warsaw — Bartek Sensei |
| **School id** | `hikari-warsaw` |
| **Privacy** | Members only — AES-encrypted event content; roster-gated API read |
| **Roster** | QR at dojo → `/school/hikari-warsaw/join` |
| **Pricing** | TBD (manual onboarding for pilot) |

## Open decisions

1. **School pricing** — flat monthly per school vs per-seat?

## Relation to existing v1

- Individual **$0.99/mo** → solo publish (kind 22) + personal leaderboard.
- **School plan** → kind 34567 attendance + private school dashboard.
- Same relay, same Nostr identity model; separated by **kind + tags**, not separate infrastructure per school.
