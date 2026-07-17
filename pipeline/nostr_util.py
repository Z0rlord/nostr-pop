"""Minimal NIP-01 event utilities: bech32 key decoding, signing, verification.

No heavyweight nostr SDK — just coincurve (libsecp256k1 bindings, BIP-340
Schnorr) and a vendored bech32 decoder. The signing key is read from the
NOSTR_NSEC environment variable (inject via `doppler run --`); it is never
logged or printed.
"""

from __future__ import annotations

import hashlib
import json
import os
import time

from coincurve import PrivateKey
from coincurve.keys import PublicKeyXOnly

# --- bech32 (BIP-173), trimmed to decoding needs -----------------------------

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


def _convertbits(data: list[int], frombits: int, tobits: int, pad: bool = True) -> list[int]:
    acc = 0
    bits = 0
    ret = []
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


def bech32_decode(bech: str) -> tuple[str, bytes]:
    """Decode a bech32 string (npub/nsec/...) -> (hrp, data bytes)."""
    bech = bech.strip().lower()
    pos = bech.rfind("1")
    if pos < 1 or pos + 7 > len(bech):
        raise ValueError("invalid bech32 string")
    hrp, data_part = bech[:pos], bech[pos + 1 :]
    data = [_CHARSET.find(c) for c in data_part]
    if -1 in data:
        raise ValueError("invalid bech32 character")
    if _bech32_polymod(_bech32_hrp_expand(hrp) + data) != 1:
        raise ValueError("bech32 checksum failure")
    decoded = _convertbits(data[:-6], 5, 8, pad=False)
    return hrp, bytes(decoded)


def bech32_encode(hrp: str, data: bytes) -> str:
    converted = _convertbits(list(data), 8, 5, pad=True)
    combined = converted + [0] * 6
    chk = _bech32_polymod(_bech32_hrp_expand(hrp) + combined) ^ 1
    checksum = [(chk >> 5 * (5 - i)) & 31 for i in range(6)]
    return hrp + "1" + "".join(_CHARSET[d] for d in combined + checksum)


def hex_to_npub(pubkey_hex: str) -> str:
    return bech32_encode("npub", bytes.fromhex(pubkey_hex))


def npub_to_hex(npub: str) -> str:
    hrp, data = bech32_decode(npub)
    if hrp != "npub" or len(data) != 32:
        raise ValueError("not an npub")
    return data.hex()


# --- keys ---------------------------------------------------------------------


class Signer:
    """Wraps the secret key; exposes only pubkey + signing, never the secret."""

    def __init__(self, secret: bytes):
        if len(secret) != 32:
            raise ValueError("secret key must be 32 bytes")
        self._priv = PrivateKey(secret)
        # x-only pubkey = compressed pubkey minus the parity byte
        self.pubkey_hex: str = self._priv.public_key.format(compressed=True)[1:].hex()

    @classmethod
    def from_env(cls, var: str = "NOSTR_NSEC") -> "Signer":
        raw = os.environ.get(var)
        if not raw:
            raise SystemExit(
                f"{var} is not set. Run via Doppler: doppler run -- <command>"
            )
        return cls.from_raw(raw, var)

    @classmethod
    def from_env_preferred(cls, *vars: str) -> "Signer":
        for var in vars:
            raw = os.environ.get(var)
            if raw and raw.strip():
                return cls.from_env(var)
        names = ", ".join(vars)
        raise SystemExit(
            f"None of {names} is set. Run via Doppler: doppler run -- <command>"
        )

    @classmethod
    def from_raw(cls, raw: str, label: str = "secret key") -> "Signer":
        raw = raw.strip()
        if raw.startswith("nsec1"):
            hrp, data = bech32_decode(raw)
            if hrp != "nsec" or len(data) != 32:
                raise SystemExit(f"{label} is not a valid nsec")
            secret = data
        else:
            try:
                secret = bytes.fromhex(raw.removeprefix("0x").removeprefix("0X"))
            except ValueError:
                raise SystemExit(f"{label} is neither nsec bech32 nor hex") from None
        return cls(secret)

    def sign_event(
        self,
        kind: int,
        content: str,
        tags: list[list[str]],
        created_at: int | None = None,
    ) -> dict:
        created_at = created_at if created_at is not None else int(time.time())
        event_id = compute_event_id(self.pubkey_hex, created_at, kind, tags, content)
        sig = self._priv.sign_schnorr(bytes.fromhex(event_id))
        return {
            "id": event_id,
            "pubkey": self.pubkey_hex,
            "created_at": created_at,
            "kind": kind,
            "tags": tags,
            "content": content,
            "sig": sig.hex(),
        }


# --- events --------------------------------------------------------------------


def compute_event_id(pubkey: str, created_at: int, kind: int, tags: list[list[str]], content: str) -> str:
    serialized = json.dumps(
        [0, pubkey, created_at, kind, tags, content],
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def verify_event(event: dict) -> bool:
    """Verify event id and BIP-340 signature. Returns True if valid."""
    expected_id = compute_event_id(
        event["pubkey"], event["created_at"], event["kind"], event["tags"], event["content"]
    )
    if expected_id != event["id"]:
        return False
    try:
        pub = PublicKeyXOnly(bytes.fromhex(event["pubkey"]))
        pub.verify(bytes.fromhex(event["sig"]), bytes.fromhex(event["id"]))
        return True
    except Exception:
        return False
