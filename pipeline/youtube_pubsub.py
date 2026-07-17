"""YouTube PubSubHubbub subscriber + callback for auto-running pipeline.py.

Usage:
    # Run webhook server
    doppler run -- uv run --project pipeline pipeline/youtube_pubsub.py serve

    # Subscribe (or renew) channel feed
    doppler run -- uv run --project pipeline pipeline/youtube_pubsub.py subscribe \
      --channel-id UCxxxxxxxxxxxxxxxxxxxxxx
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

from common import REPO_ROOT, load_state

HUB_URL = "https://pubsubhubbub.appspot.com/subscribe"
DEFAULT_CALLBACK_PATH = "/youtube/pubsub/callback"
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 3009
DEFAULT_LEASE_SECONDS = 864000  # 10 days
YT_FEED_TEMPLATE = "https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
YT_VIDEO_URL_TEMPLATE = "https://www.youtube.com/watch?v={video_id}"

_RUNNING_VIDEO_IDS: set[str] = set()
_RUNNING_LOCK = threading.Lock()


def env_or(value: str | None, key: str) -> str | None:
    if value:
        return value
    return os.getenv(key)


def normalize_callback_path(path: str) -> str:
    parsed = urlparse(path)
    clean = parsed.path if parsed.scheme else path
    clean = clean.strip() or DEFAULT_CALLBACK_PATH
    if not clean.startswith("/"):
        clean = f"/{clean}"
    return clean


def build_topic_url(channel_id: str) -> str:
    return YT_FEED_TEMPLATE.format(channel_id=channel_id.strip())


def submit_subscription(
    callback_url: str,
    topic_url: str,
    mode: str = "subscribe",
    lease_seconds: int = DEFAULT_LEASE_SECONDS,
) -> tuple[int, str]:
    payload = urlencode(
        {
            "hub.mode": mode,
            "hub.topic": topic_url,
            "hub.callback": callback_url,
            "hub.verify": "async",
            "hub.lease_seconds": str(lease_seconds),
        }
    ).encode("utf-8")
    req = Request(HUB_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urlopen(req, timeout=20) as resp:
        body = resp.read().decode("utf-8", errors="replace")
        return resp.status, body


def extract_video_ids(atom_xml: str) -> list[str]:
    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "yt": "http://www.youtube.com/xml/schemas/2015",
    }
    root = ET.fromstring(atom_xml)
    ids: list[str] = []
    for entry in root.findall("atom:entry", ns):
        yt_id = entry.findtext("yt:videoId", default="", namespaces=ns).strip()
        if yt_id:
            ids.append(yt_id)
            continue
        atom_id = entry.findtext("atom:id", default="", namespaces=ns).strip()
        if atom_id and "video:" in atom_id:
            ids.append(atom_id.rsplit("video:", 1)[-1])
    return ids


def _pipeline_worker(video_id: str, video_url: str) -> None:
    try:
        # Use uv run so the venv (yt-dlp, deno opts) matches the pubsub service.
        cmd = [
            "uv",
            "run",
            "--project",
            "pipeline",
            "pipeline/pipeline.py",
            "--url",
            video_url,
        ]
        print(f"[pubsub] running pipeline for {video_id}: {' '.join(cmd)}")
        proc = subprocess.run(
            cmd,
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            env=os.environ.copy(),
        )
        print(f"[pubsub] pipeline exit={proc.returncode} video_id={video_id}")
        if proc.stdout:
            print(proc.stdout.rstrip())
        if proc.stderr:
            print(proc.stderr.rstrip())
    finally:
        with _RUNNING_LOCK:
            _RUNNING_VIDEO_IDS.discard(video_id)


def maybe_trigger_pipeline(video_id: str) -> bool:
    state = load_state()
    if video_id in state:
        print(f"[pubsub] skip {video_id}: already present in published.json")
        return False

    with _RUNNING_LOCK:
        if video_id in _RUNNING_VIDEO_IDS:
            print(f"[pubsub] skip {video_id}: already running")
            return False
        _RUNNING_VIDEO_IDS.add(video_id)

    url = YT_VIDEO_URL_TEMPLATE.format(video_id=video_id)
    t = threading.Thread(target=_pipeline_worker, args=(video_id, url), daemon=True)
    t.start()
    return True


def make_handler(callback_path: str):
    class Handler(BaseHTTPRequestHandler):
        def _send_text(self, status: int, body: str = "") -> None:
            raw = body.encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            if raw:
                self.wfile.write(raw)

        def _read_json(self) -> dict:
            length = int(self.headers.get("Content-Length", "0"))
            payload = self.rfile.read(length).decode("utf-8") if length else "{}"
            return json.loads(payload or "{}")

        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            if parsed.path != callback_path:
                self._send_text(HTTPStatus.NOT_FOUND, "not found")
                return
            params = parse_qs(parsed.query)
            challenge = params.get("hub.challenge", [""])[0]
            mode = params.get("hub.mode", [""])[0]
            topic = params.get("hub.topic", [""])[0]
            print(f"[pubsub] verification GET mode={mode} topic={topic}")
            if not challenge:
                self._send_text(HTTPStatus.BAD_REQUEST, "missing hub.challenge")
                return
            self._send_text(HTTPStatus.OK, challenge)

        def do_POST(self) -> None:
            parsed = urlparse(self.path)
            if parsed.path == callback_path:
                self._handle_callback_post()
                return
            if parsed.path == "/youtube/pubsub/subscribe":
                self._handle_subscribe_post()
                return
            self._send_text(HTTPStatus.NOT_FOUND, "not found")

        def _handle_callback_post(self) -> None:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8", errors="replace")
            try:
                video_ids = extract_video_ids(raw)
            except ET.ParseError as exc:
                self._send_text(HTTPStatus.BAD_REQUEST, f"invalid atom xml: {exc}")
                return

            triggered = 0
            for video_id in video_ids:
                if maybe_trigger_pipeline(video_id):
                    triggered += 1
            print(f"[pubsub] notification received ids={video_ids} triggered={triggered}")
            self._send_text(HTTPStatus.NO_CONTENT)

        def _handle_subscribe_post(self) -> None:
            try:
                data = self._read_json()
            except json.JSONDecodeError:
                self._send_text(HTTPStatus.BAD_REQUEST, "invalid json")
                return

            channel_id = data.get("channel_id") or os.getenv("YOUTUBE_CHANNEL_ID")
            callback_url = data.get("callback_url") or os.getenv("PUBSUB_CALLBACK_URL")
            lease_seconds = int(data.get("lease_seconds") or DEFAULT_LEASE_SECONDS)
            mode = data.get("mode") or "subscribe"

            if not channel_id or not callback_url:
                self._send_text(
                    HTTPStatus.BAD_REQUEST,
                    "channel_id and callback_url required (or set env)",
                )
                return

            topic_url = build_topic_url(channel_id)
            try:
                status, body = submit_subscription(
                    callback_url=callback_url,
                    topic_url=topic_url,
                    mode=mode,
                    lease_seconds=lease_seconds,
                )
            except Exception as exc:
                self._send_text(HTTPStatus.BAD_GATEWAY, f"hub request failed: {exc}")
                return

            resp = {
                "hub_status": status,
                "mode": mode,
                "topic_url": topic_url,
                "callback_url": callback_url,
                "lease_seconds": lease_seconds,
                "hub_response": body,
            }
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            wire = json.dumps(resp, indent=2).encode("utf-8")
            self.send_header("Content-Length", str(len(wire)))
            self.end_headers()
            self.wfile.write(wire)

        def log_message(self, fmt: str, *args) -> None:
            # Keep logs terse and route through stdout.
            print(f"[http] {self.address_string()} - {fmt % args}")

    return Handler


def catch_up_feed(channel_id: str | None) -> None:
    """Scan the Atom feed and trigger pipeline for ids missing from published.json."""
    if not channel_id:
        print("[pubsub] catch-up skipped: YOUTUBE_CHANNEL_ID not set")
        return
    topic_url = build_topic_url(channel_id)
    try:
        with urlopen(topic_url, timeout=30) as resp:
            feed = resp.read().decode("utf-8", errors="replace")
        video_ids = extract_video_ids(feed)
    except Exception as exc:
        print(f"[pubsub] catch-up failed to fetch feed: {exc}")
        return

    triggered = sum(1 for vid in video_ids if maybe_trigger_pipeline(vid))
    print(
        f"[pubsub] catch-up scan topic={topic_url} "
        f"entries={len(video_ids)} triggered={triggered}"
    )


def cmd_serve(args: argparse.Namespace) -> int:
    callback_path = normalize_callback_path(args.callback_path)
    server = ThreadingHTTPServer((args.host, args.port), make_handler(callback_path))
    print(
        f"[pubsub] listening on http://{args.host}:{args.port}{callback_path} "
        "(GET verify, POST notifications)"
    )
    if not args.no_catch_up:
        channel_id = env_or(None, "YOUTUBE_CHANNEL_ID")
        t = threading.Thread(target=catch_up_feed, args=(channel_id,), daemon=True)
        t.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[pubsub] shutting down")
    finally:
        server.server_close()
    return 0


def cmd_subscribe(args: argparse.Namespace) -> int:
    channel_id = env_or(args.channel_id, "YOUTUBE_CHANNEL_ID")
    callback_url = env_or(args.callback_url, "PUBSUB_CALLBACK_URL")
    if not channel_id:
        raise SystemExit("missing channel id: pass --channel-id or set YOUTUBE_CHANNEL_ID")
    if not callback_url:
        raise SystemExit(
            "missing callback url: pass --callback-url or set PUBSUB_CALLBACK_URL"
        )

    topic_url = build_topic_url(channel_id)
    status, body = submit_subscription(
        callback_url=callback_url,
        topic_url=topic_url,
        mode=args.mode,
        lease_seconds=args.lease_seconds,
    )
    print(f"hub status: {status}")
    print(f"mode: {args.mode}")
    print(f"topic: {topic_url}")
    print(f"callback: {callback_url}")
    if body.strip():
        print(f"hub response: {body.strip()}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="command", required=True)

    serve = sub.add_parser("serve", help="Run callback HTTP server")
    serve.add_argument("--host", default=DEFAULT_HOST)
    serve.add_argument("--port", type=int, default=DEFAULT_PORT)
    serve.add_argument("--callback-path", default=DEFAULT_CALLBACK_PATH)
    serve.add_argument(
        "--no-catch-up",
        action="store_true",
        help="Skip startup feed scan for unpublished video ids",
    )
    serve.set_defaults(func=cmd_serve)

    catchup = sub.add_parser("catchup", help="Trigger pipeline for feed ids not in published.json")
    catchup.add_argument("--channel-id", default=None)
    catchup.set_defaults(func=lambda a: catch_up_feed(env_or(a.channel_id, "YOUTUBE_CHANNEL_ID")) or 0)

    subscribe = sub.add_parser("subscribe", help="Subscribe/renew a YouTube channel feed")
    subscribe.add_argument("--channel-id", default=None)
    subscribe.add_argument("--callback-url", default=None)
    subscribe.add_argument("--lease-seconds", type=int, default=DEFAULT_LEASE_SECONDS)
    subscribe.add_argument("--mode", choices=["subscribe", "unsubscribe"], default="subscribe")
    subscribe.set_defaults(func=cmd_subscribe)

    renew = sub.add_parser("renew", help="Alias for subscribe mode")
    renew.add_argument("--channel-id", default=None)
    renew.add_argument("--callback-url", default=None)
    renew.add_argument("--lease-seconds", type=int, default=DEFAULT_LEASE_SECONDS)
    renew.set_defaults(
        func=lambda a: cmd_subscribe(
            argparse.Namespace(
                channel_id=a.channel_id,
                callback_url=a.callback_url,
                lease_seconds=a.lease_seconds,
                mode="subscribe",
            )
        )
    )
    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
