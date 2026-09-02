#!/usr/bin/env python3
"""Arabic HTML dashboard for the Gova local execution monitor.

The HTTP service remains bound to loopback and observability-only. Optional public
access is provided externally by Tailscale Funnel; this process exposes no mutation endpoint.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import socket
import threading
import time
import urllib.parse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import monitor

SELF = Path(__file__).resolve()
WEB_ROOT = SELF.parent / "web"
INDEX = WEB_ROOT / "index.html"
STARTED_AT = time.time()
PUBLIC_URL_FILE = Path(os.environ.get("GOVA_MONITOR_PUBLIC_URL_FILE", "/home/hesham/.local/state/gova-agent-monitor/public-url"))

def public_url() -> str:
    try:
        value = PUBLIC_URL_FILE.read_text().strip()
        return value if value.startswith("https://") else ""
    except Exception:
        return ""


_SNAPSHOT_LOCK = threading.Lock()
_LAST_SNAPSHOT: dict[str, Any] = {}
_LAST_ERROR = ""
_LAST_UPDATED = 0.0
_STOP = threading.Event()


def system_snapshot() -> dict[str, Any]:
    try:
        load = list(os.getloadavg())
    except Exception:
        load = []
    try:
        uptime_seconds = int(float(Path('/proc/uptime').read_text().split()[0]))
    except Exception:
        uptime_seconds = 0
    mem: dict[str, int] = {}
    try:
        for line in Path('/proc/meminfo').read_text().splitlines():
            if ':' not in line:
                continue
            key, raw = line.split(':', 1)
            value = raw.strip().split()[0]
            if value.isdigit():
                mem[key] = int(value) * 1024
    except Exception:
        pass
    disk = shutil.disk_usage('/')
    return {
        "hostname": socket.gethostname(),
        "pid": os.getpid(),
        "server_started_at": datetime.fromtimestamp(STARTED_AT, timezone.utc).isoformat(),
        "server_uptime_seconds": int(time.time() - STARTED_AT),
        "machine_uptime_seconds": uptime_seconds,
        "loadavg": load,
        "memory_total": mem.get('MemTotal', 0),
        "memory_available": mem.get('MemAvailable', 0),
        "disk_total": disk.total,
        "disk_free": disk.free,
        "repo": str(monitor.REPO),
        "runtime": str(monitor.RUNTIME),
        "web_bind": "127.0.0.1",
    }


def collect_snapshot() -> dict[str, Any]:
    snap = monitor.full_snapshot()
    snap["system"] = system_snapshot()
    url = public_url()
    snap["meta"] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "refresh_seconds": 2,
        "network_refresh_seconds": monitor.NETWORK_REFRESH_SECONDS,
        "read_only": True,
        "language": "ar",
        "public_url": url,
        "public_transport": "cloudflare-quick-tunnel" if url else "",
    }
    return snap


def collector() -> None:
    global _LAST_SNAPSHOT, _LAST_ERROR, _LAST_UPDATED
    while not _STOP.is_set():
        try:
            value = collect_snapshot()
            with _SNAPSHOT_LOCK:
                _LAST_SNAPSHOT = value
                _LAST_ERROR = ""
                _LAST_UPDATED = time.time()
        except Exception as exc:
            with _SNAPSHOT_LOCK:
                _LAST_ERROR = str(exc)
        _STOP.wait(2.0)


def current_snapshot() -> dict[str, Any]:
    with _SNAPSHOT_LOCK:
        return {
            "ready": bool(_LAST_SNAPSHOT),
            "error": _LAST_ERROR,
            "age_seconds": int(max(0, time.time() - _LAST_UPDATED)) if _LAST_UPDATED else None,
            "data": _LAST_SNAPSHOT,
        }


def json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, default=str, separators=(",", ":")).encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    server_version = "GovaLocalMonitor/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        # Keep request noise out of the desktop experience.
        return

    def headers_common(self, content_type: str, length: int) -> None:
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(length))
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'")

    def send_json(self, value: Any, status: int = 200) -> None:
        body = json_bytes(value)
        self.send_response(status)
        self.headers_common("application/json; charset=utf-8", len(body))
        self.end_headers()
        self.wfile.write(body)

    def send_html(self) -> None:
        try:
            body = INDEX.read_bytes()
        except FileNotFoundError:
            self.send_json({"ok": False, "error": f"missing UI: {INDEX}"}, 500)
            return
        self.send_response(200)
        self.headers_common("text/html; charset=utf-8", len(body))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ("/", "/index.html"):
            self.send_html()
            return
        if parsed.path == "/health":
            state = current_snapshot()
            self.send_json({
                "ok": True,
                "read_only": True,
                "ready": state["ready"],
                "snapshot_age_seconds": state["age_seconds"],
                "snapshot_error": state["error"],
                "pid": os.getpid(),
            })
            return
        if parsed.path == "/api/snapshot":
            self.send_json(current_snapshot())
            return
        if parsed.path == "/api/agent":
            query = urllib.parse.parse_qs(parsed.query)
            agent_id = (query.get("id") or [""])[0]
            if not agent_id:
                self.send_json({"ok": False, "error": "missing agent id"}, 400)
                return
            detail = monitor.agent_detail(agent_id)
            if not detail:
                self.send_json({"ok": False, "error": "agent not found"}, 404)
                return
            self.send_json({"ok": True, "agent": detail})
            return
        self.send_json({"ok": False, "error": "not found"}, 404)


def main() -> None:
    ap = argparse.ArgumentParser(prog="gova-agent-monitor-web")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8766)
    args = ap.parse_args()
    if args.host not in ("127.0.0.1", "localhost", "::1"):
        raise SystemExit("The HTML monitor is intentionally loopback-only.")
    if not INDEX.exists():
        raise SystemExit(f"Missing HTML UI: {INDEX}")
    thread = threading.Thread(target=collector, name="gova-monitor-collector", daemon=True)
    thread.start()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    try:
        server.serve_forever(poll_interval=0.5)
    finally:
        _STOP.set()
        server.server_close()


if __name__ == "__main__":
    main()
