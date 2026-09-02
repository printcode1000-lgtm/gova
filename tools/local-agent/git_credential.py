#!/usr/bin/env python3
"""Minimal Git credential helper for the persistent local-agent runtime.

The helper never stores a credential. On `get` it resolves the same local GitHub
runtime token used by gateway.py from process environment or ignored repo env
files and writes it only to Git's credential-helper stdout protocol.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

REPO = Path(os.environ.get("GOVA_AGENT_REPO", "/home/hesham/gova")).resolve()
TOKEN_NAMES = ("GOVA_LOCAL_DISPATCH_TOKEN", "GITHUB_ADMIN_TOKEN", "GOVA_RUNNER_STATUS_TOKEN")


def token() -> str:
    for name in TOKEN_NAMES:
        value = os.environ.get(name, "").strip()
        if value:
            return value
    for env_file in (REPO / ".env.local", REPO / ".env"):
        try:
            lines = env_file.read_text().splitlines()
        except Exception:
            continue
        for raw in lines:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() not in TOKEN_NAMES:
                continue
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]
            if value:
                return value
    return ""


def main() -> int:
    action = sys.argv[1] if len(sys.argv) > 1 else "get"
    if action != "get":
        return 0
    # Consume Git's request so the helper behaves correctly when invoked by Git.
    request = sys.stdin.read()
    if "host=github.com" not in request and "protocol=https" in request:
        return 0
    value = token()
    if not value:
        return 1
    sys.stdout.write("username=x-access-token\n")
    sys.stdout.write(f"password={value}\n\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
