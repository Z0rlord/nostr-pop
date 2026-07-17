"""Publish a film trailer as NIP-71 kind 34236 (addressable video) to Nostr.

Uses an existing Blossom BlobDescriptor (or builds one from --url + --file).
Does not upload or reference the full-film master URL.

Usage:
    doppler run -- uv run --project pipeline pipeline/publish_film_trailer.py \\
        --film yoga-sutra \\
        [--announce]

    doppler run -- uv run --project pipeline pipeline/publish_film_trailer.py \\
        --d-tag yoga-sutra-trailer \\
        --title "The Yoga Sutra — Official Trailer" \\
        --video-url https://blossom.dojopop.live/<sha256>.mp4 \\
        --video-sha256 <sha256> \\
        --paywall https://dojopop.live/films/yoga-sutra \\
        --file /path/to/trailer.mp4 \\
        [--announce] [--dry-run]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from common import DEFAULT_RELAYS, probe_video, sha256_file
from nostr_util import Signer, verify_event
from publish_video_event import KIND_ADDRESSABLE_VIDEO, publish, report

# --- bech32 encode (NIP-19 share codes) ---------------------------------------

_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"


def _bech32_polymod(values: list[int]) -> int:
    gen = (0x3B6A57B2, 0x26508E6D, 0x1EA119FA, 0x3D4233DD, 0x2A1462B3)
    chk = 1
    for value in values:
        top = chk >> 25
        chk = (chk & 0x1FFFFFF) << 5 ^ value
        for i in range(5):
            chk ^= gen[i] if ((top >> i) & 1) else 0
    return chk


def _bech32_hrp_expand(hrp: str) -> list[int]:
    return [ord(x) >> 5 for x in hrp] + [0] + [ord(x) & 31 for x in hrp]


def _convertbits(data: bytes | list[int], frombits: int, tobits: int, pad: bool = True) -> list[int]:
    acc = 0
    bits = 0
    ret: list[int] = []
    maxv = (1 << tobits) - 1
    for value in data:
        acc = (acc << frombits) | value
        bits += frombits
        while bits >= tobits:
            bits -= tobits
            ret.append((acc >> bits) & maxv)
    if pad and bits:
        ret.append((acc << (tobits - bits)) & maxv)
    return ret


def bech32_encode(hrp: str, data: bytes) -> str:
    converted = _convertbits(data, 8, 5)
    polymod = _bech32_polymod(_bech32_hrp_expand(hrp) + converted + [0, 0, 0, 0, 0, 0]) ^ 1
    checksum = [(polymod >> 5 * (5 - i)) & 31 for i in range(6)]
    return hrp + "1" + "".join(_CHARSET[d] for d in converted + checksum)


def _encode_tlv(records: list[tuple[int, bytes]]) -> bytes:
    out = bytearray()
    for typ, value in records:
        out.append(typ)
        out.append(len(value))
        out.extend(value)
    return bytes(out)


def nevent_encode(event_id: str, pubkey: str | None = None, kind: int | None = None) -> str:
    tlv: list[tuple[int, bytes]] = [(0, bytes.fromhex(event_id))]
    if pubkey:
        tlv.append((2, bytes.fromhex(pubkey)))
    if kind is not None:
        tlv.append((3, kind.to_bytes(4, "big")))
    return bech32_encode("nevent", _encode_tlv(tlv))


def naddr_encode(kind: int, pubkey: str, identifier: str) -> str:
    tlv = [
        (0, kind.to_bytes(4, "big")),
        (1, bytes.fromhex(pubkey)),
        (2, identifier.encode("utf-8")),
    ]
    return bech32_encode("naddr", _encode_tlv(tlv))


# --- film presets -------------------------------------------------------------

YOGA_SUTRA = {
    "d_tag": "yoga-sutra-trailer",
    "title": "The Yoga Sutra — Official Trailer",
    "paywall": "https://dojopop.live/films/yoga-sutra",
    "video_url": (
        "https://blossom.dojopop.live/"
        "9f400784d532f37a39dd8f9778f6003b6c6e149b435b95ca50d8983002f669a3.mp4"
    ),
    "video_sha256": "9f400784d532f37a39dd8f9778f6003b6c6e149b435b95ca50d8983002f669a3",
    "hashtags": ["yogasutra", "film", "dojopop"],
    "hook": (
        "Friday, fired from her dead-end corporate job, is on a vision quest — until a "
        "strange book lands her in a backwater jail. Watch the official trailer for "
        "The Yoga Sutra, a Zorie Barber film."
    ),
}

FILM_PRESETS: dict[str, dict] = {"yoga-sutra": YOGA_SUTRA}


def build_descriptor(
    url: str,
    sha256: str,
    mime: str = "video/mp4",
    file_path: Path | None = None,
) -> dict:
    desc: dict = {"url": url, "sha256": sha256, "type": mime}
    if file_path and file_path.is_file():
        if sha256_file(file_path) != sha256.lower():
            raise SystemExit(f"--file sha256 does not match --video-sha256 for {file_path}")
        probe = probe_video(file_path)
        desc["duration"] = int(round(probe["duration"]))
        desc["width"] = probe["width"]
        desc["height"] = probe["height"]
    return desc


def build_trailer_event(
    signer: Signer,
    *,
    d_tag: str,
    title: str,
    content: str,
    video_descriptor: dict,
    paywall_url: str,
    hashtags: list[str],
) -> dict:
    imeta = [
        "imeta",
        f"url {video_descriptor['url']}",
        f"x {video_descriptor['sha256']}",
        f"m {video_descriptor.get('type', 'video/mp4')}",
    ]
    width = video_descriptor.get("width")
    height = video_descriptor.get("height")
    duration = video_descriptor.get("duration")
    if width and height:
        imeta.append(f"dim {width}x{height}")
    if duration:
        imeta.append(f"duration {int(duration)}")

    tags: list[list[str]] = [
        ["d", d_tag],
        ["title", title],
        imeta,
        ["r", paywall_url],
    ]
    if duration:
        tags.append(["duration", str(int(duration))])

    for tag in dict.fromkeys(h.strip().lower() for h in hashtags if h.strip()):
        tags.append(["t", tag])

    tags.append(["alt", f"Film trailer: {title}"])

    event = signer.sign_event(kind=KIND_ADDRESSABLE_VIDEO, content=content, tags=tags)
    assert verify_event(event), "trailer event failed local signature verification"
    return event


def build_announcement_event(signer: Signer, content: str, hashtags: list[str]) -> dict:
    tags: list[list[str]] = []
    for tag in dict.fromkeys(h.strip().lower() for h in hashtags if h.strip()):
        tags.append(["t", tag])
    event = signer.sign_event(kind=1, content=content, tags=tags)
    assert verify_event(event)
    return event


def trailer_content(hook: str, paywall_url: str) -> str:
    return (
        f"{hook}\n\n"
        f"Rent $3.99 / Own $14.99 → {paywall_url}"
    ).strip()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--film", choices=sorted(FILM_PRESETS), help="built-in film preset")
    ap.add_argument("--d-tag", help="addressable identifier (d tag)")
    ap.add_argument("--title", help="trailer title")
    ap.add_argument("--paywall", help="paywall / purchase page URL (r tag + content link)")
    ap.add_argument("--video-url", help="Blossom trailer URL (imeta url)")
    ap.add_argument("--video-sha256", help="trailer blob sha256 (imeta x)")
    ap.add_argument("--video-descriptor", type=Path, help="Blossom BlobDescriptor JSON")
    ap.add_argument("--file", type=Path, dest="file_path", help="local trailer MP4 (probe dim/duration)")
    ap.add_argument("--hook", help="opening line for event content")
    ap.add_argument("--hashtag", action="append", dest="hashtags", default=None)
    ap.add_argument("--relay", action="append", dest="relays", default=None)
    ap.add_argument("--announce", action="store_true", help="also publish a kind-1 announcement note")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    preset = FILM_PRESETS.get(args.film or "", {})
    d_tag = args.d_tag or preset.get("d_tag")
    title = args.title or preset.get("title")
    paywall = args.paywall or preset.get("paywall")
    video_url = args.video_url or preset.get("video_url")
    video_sha256 = args.video_sha256 or preset.get("video_sha256")
    hook = args.hook or preset.get("hook", "")
    hashtags = args.hashtags if args.hashtags is not None else list(preset.get("hashtags") or ["film", "dojopop"])

    if not all([d_tag, title, paywall, video_url, video_sha256]):
        ap.error("provide --film or all of --d-tag --title --paywall --video-url --video-sha256")

    if args.video_descriptor:
        video_desc = json.loads(args.video_descriptor.read_text())
    else:
        video_desc = build_descriptor(video_url, video_sha256, file_path=args.file_path)

    content = trailer_content(hook, paywall)
    signer = Signer.from_env()
    event = build_trailer_event(
        signer,
        d_tag=d_tag,
        title=title,
        content=content,
        video_descriptor=video_desc,
        paywall_url=paywall,
        hashtags=hashtags,
    )

    print(json.dumps(event, indent=2, ensure_ascii=False))
    print()
    print(f"event id:  {event['id']}")
    print(f"nevent:    {nevent_encode(event['id'], event['pubkey'], KIND_ADDRESSABLE_VIDEO)}")
    print(f"naddr:     {naddr_encode(KIND_ADDRESSABLE_VIDEO, event['pubkey'], d_tag)}")

    if args.dry_run:
        print("\n[dry-run] trailer signed + verified locally; not published")
        return 0

    relays = args.relays or DEFAULT_RELAYS
    print(f"\nPublishing kind-34236 trailer {event['id']} to {len(relays)} relays:")
    results = asyncio.run(publish(event, relays))
    ok = report(results)

    if args.announce:
        announce = build_announcement_event(signer, content, hashtags)
        print(f"\nPublishing kind-1 announcement {announce['id']}:")
        announce_results = asyncio.run(publish(announce, relays))
        announce_ok = report(announce_results)
        print(f"announcement nevent: {nevent_encode(announce['id'], announce['pubkey'], 1)}")
        ok = ok or announce_ok

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
