# DojoPop class attendance (kind 34567)

Members-only class logs for martial arts schools. Separate from solo practice (kind 22).

## Pilot

- **School:** Hikari Aikido Warsaw  
- **Sensei:** Bartek  
- **School id:** `hikari-warsaw`  
- **Privacy:** members only (encrypted event content on relay)  
- **Roster:** QR at dojo → `/school/hikari-warsaw/join`  
- **Pricing:** TBD (manual onboarding for pilot)

## Event shape

**Kind:** `34567`  
**Signer:** school owner or instructor npub (relay whitelist)

### Public tags (relay-visible, minimal)

```
["d", "school-hikari-warsaw"]
["t", "dojopop"]
["t", "attendance"]
["t", "class"]
["enc", "v1"]
["started_at", "<unix>"]
["title", "<class name>"]
```

Student pubkeys are **not** in public tags for the pilot (members-only). They live inside encrypted content.

### Encrypted content (AES-256-GCM, school key)

```json
{
  "v": 1,
  "type": "class_attendance",
  "school_id": "hikari-warsaw",
  "class": {
    "name": "Monday Aikido fundamentals",
    "discipline": "aikido",
    "started_at": "2026-06-11T18:00:00Z",
    "ended_at": "2026-06-11T19:30:00Z",
    "location": "Warsaw"
  },
  "present": ["<hex_pubkey>", "..."],
  "notes": "Ukemi and irimi practice"
}
```

Relay stores `content` as `enc::<base64(ciphertext)>`. Only roster members receive decrypted data via the web app after NIP-07 identity check.

## School registry

`web/data/schools.json` (volume on relay-2, not in git):

```json
{
  "schools": [{
    "id": "hikari-warsaw",
    "name": "Hikari Aikido Warsaw",
    "disciplines": ["aikido"],
    "ownerNpub": "npub1…",
    "instructorNpubs": [],
    "studentNpubs": [],
    "encryptionKeyHex": "<64-char hex, 32 bytes>",
    "createdAt": "2026-06-11T00:00:00.000Z"
  }]
}
```

## QR join flow

1. Poster at dojo: QR → `https://dojopop.live/school/hikari-warsaw/join`
2. Student opens link, connects Nostr extension (NIP-07)
3. `POST /api/schools/hikari-warsaw/join` with `{ npub }`
4. npub appended to `studentNpubs` (deduped)

## Instructor attendance flow

1. `https://dojopop.live/school/hikari-warsaw/attendance`
2. Connect as owner/instructor (NIP-07)
3. Select class details + check present students from roster
4. `POST /api/schools/hikari-warsaw/attendance/prepare` → encrypted event template
5. Sign with NIP-07, publish to relay (client websocket)

## Member read flow

1. `https://dojopop.live/school/hikari-warsaw`
2. Connect NIP-07; must be on roster
3. `GET /api/schools/hikari-warsaw/attendance?npub=…` → server fetches `#d` events, decrypts, returns class list

## Query filter

```
{ "kinds": [34567], "#d": ["school-hikari-warsaw"], "#t": ["attendance"] }
```
