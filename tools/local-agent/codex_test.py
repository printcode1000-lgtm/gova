#!/usr/bin/env python3
"""Real Codex worker validation through the persistent Gova agent gateway.

This is intentionally separate from selftest.py: selftest is deterministic and
model-free, while this probe invokes the authenticated Codex CLI as a real local
worker inside its own gateway-created worktree. It never pushes an agent branch.
"""
from __future__ import annotations

import argparse
import json
import os
import shlex
import sqlite3
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

BASE = os.environ.get("GOVA_AGENT_URL", "http://127.0.0.1:8765").rstrip("/")
AUTH = Path(os.environ.get("GOVA_AGENT_AUTH_FILE", "/home/hesham/.config/gova-agent/auth"))
RUNTIME_DB = Path(os.environ.get("GOVA_AGENT_RUNTIME", "/home/hesham/.local/share/gova-agent-runtime")) / "runtime.sqlite3"
MONITOR = Path("/home/hesham/.local/bin/gova-agent-monitor")
DEFAULT_CODEX = Path("/home/hesham/.codex/plugins/.plugin-appserver/codex")


def key():
    return AUTH.read_text().strip()


def call(method, path, data=None, expect=(200,)):
    raw = None if data is None else json.dumps(data).encode()
    headers = {"Accept": "application/json"}
    if path != "/health":
        headers["X-Gova-Agent-Key"] = key()
    if raw is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=raw, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            status, body = r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        status = e.code
        body = json.loads(e.read() or b"{}")
    if status not in expect:
        raise RuntimeError(f"{method} {path}: {status}: {body}")
    return status, body


def wait_command(cid, timeout=480):
    deadline = time.time() + timeout
    while time.time() < deadline:
        _, body = call("GET", f"/v1/commands/{urllib.parse.quote(cid)}")
        cmd = body["command"]
        if cmd["status"] != "running":
            return cmd
        time.sleep(0.5)
    call("POST", "/v1/exec/cancel", {"command_id": cid})
    raise RuntimeError(f"Codex command timed out: {cid}")


def git(worktree: Path, *args, check=True):
    cp = subprocess.run(["git", *args], cwd=str(worktree), text=True, capture_output=True)
    if check and cp.returncode:
        raise RuntimeError(cp.stderr or cp.stdout)
    return cp.stdout.strip()


def register(aid, task, goal):
    call("POST", "/v1/agent/register", {"agent_id": aid})
    call("POST", "/v1/task/create", {"agent_id": aid, "task_id": task, "goal": goal})
    _, ws = call("POST", "/v1/workspace/create", {"agent_id": aid, "task_id": task})
    return Path(ws["worktree"])


def monitor_once():
    cp = subprocess.run([str(MONITOR), "--once"], text=True, capture_output=True, timeout=10)
    if cp.returncode:
        raise RuntimeError(f"monitor --once failed: {cp.stderr or cp.stdout}")
    return cp.stdout


def purge_runtime(tag):
    if not RUNTIME_DB.exists():
        return
    c = sqlite3.connect(RUNTIME_DB, timeout=5)
    c.execute("PRAGMA busy_timeout=5000")
    c.execute("BEGIN IMMEDIATE")
    like = f"%{tag}%"
    ids = [r[0] for r in c.execute("SELECT id FROM tasks WHERE id LIKE ?", (like,)).fetchall()]
    agents = [r[0] for r in c.execute("SELECT id FROM agents WHERE id LIKE ?", (like,)).fetchall()]
    for tid in ids:
        c.execute("DELETE FROM handoffs WHERE task_id=?", (tid,))
        c.execute("DELETE FROM events WHERE task_id=?", (tid,))
        c.execute("DELETE FROM commands WHERE task_id=?", (tid,))
        c.execute("DELETE FROM locks WHERE task_id=?", (tid,))
        c.execute("DELETE FROM tasks WHERE id=?", (tid,))
    for aid in agents:
        c.execute("DELETE FROM messages WHERE sender=? OR recipient=?", (aid, aid))
        c.execute("DELETE FROM events WHERE agent_id=?", (aid,))
        c.execute("DELETE FROM sessions WHERE agent_id=?", (aid,))
        try:
            c.execute("DELETE FROM agent_profiles WHERE agent_id=?", (aid,))
        except sqlite3.OperationalError:
            pass
        c.execute("DELETE FROM agents WHERE id=?", (aid,))
    c.commit(); c.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--codex-bin", default=str(DEFAULT_CODEX))
    ap.add_argument("--integrate-safe", action="store_true")
    args = ap.parse_args()
    codex = Path(args.codex_bin)
    if not codex.is_file() or not os.access(codex, os.X_OK):
        raise SystemExit(f"Codex binary missing/not executable: {codex}")

    version = subprocess.run([str(codex), "--version"], text=True, capture_output=True, check=True).stdout.strip()
    login = subprocess.run([str(codex), "login", "status"], text=True, capture_output=True)
    if login.returncode or "Logged in" not in (login.stdout + login.stderr):
        raise RuntimeError(f"Codex is not authenticated: {login.stdout} {login.stderr}")

    tag = uuid.uuid4().hex[:8]
    codex_agent = f"codex-local-real-{tag}"
    codex_task = f"codex-real-task-{tag}"
    reviewer = f"reviewer-local-{tag}"
    review_task = f"review-task-{tag}"
    cloud_agent = f"cloud-probe-{tag}"
    cloud_task = f"cloud-probe-task-{tag}"
    workspaces = []
    result = {"tag": tag, "codex_version": version, "authenticated": True}

    try:
        cw = register(codex_agent, codex_task, "Real Codex review and safe improvement of persistent local-agent tooling")
        rw = register(reviewer, review_task, "Review Codex local-agent change before integration")
        cloudw = register(cloud_agent, cloud_task, "Cloud-agent monitor visibility probe")
        workspaces += [(codex_agent, codex_task), (reviewer, review_task), (cloud_agent, cloud_task)]
        baseline = git(cw, "rev-parse", "HEAD")

        prompt = """You are a real local validation worker inside an isolated Gova Git worktree.
Read the relevant docs before editing. Inspect only tools/local-agent/monitor.py, tools/local-agent/selftest.py, tools/local-agent/install.sh and their direct behavior. Find one concrete robustness/usability issue in the new persistent local-agent monitor or self-test and implement the SMALLEST safe improvement.
Constraints: do not modify anything outside tools/local-agent/; do not push, fetch, merge, rebase, create remote branches, edit workflows, or touch main/integration refs. Do not install dependencies. Do not delete the gateway runtime or user data. Run python3 -m py_compile on Python files you changed and run `python3 tools/local-agent/monitor.py --once`. Then git add only your changed tools/local-agent files and create one local commit with message `test(local-agent): Codex real-worker improvement`. End by printing `CODEX_REAL_WORKER_DONE` followed by the commit SHA and a one-line summary."""
        cmd = " ".join([
            shlex.quote(str(codex)), "exec", "-C", shlex.quote(str(cw)),
            "--sandbox", "workspace-write", "--ask-for-approval", "never",
            "--ephemeral", "--color", "never", shlex.quote(prompt),
        ])
        _, started = call("POST", "/v1/exec/start", {"agent_id": codex_agent, "task_id": codex_task, "command": cmd})
        cid = started["command_id"]

        # A second peer works concurrently while Codex is live.
        _, peer = call("POST", "/v1/exec/start", {
            "agent_id": reviewer, "task_id": review_task,
            "command": "printf reviewer-online; sleep 2; git status --short",
        })
        time.sleep(0.8)
        frame = monitor_once()
        if codex_agent not in frame or cloud_agent not in frame or "CLOUD" not in frame:
            raise RuntimeError(f"monitor did not show real Codex + cloud probe:\n{frame}")
        result["monitor_live_local_and_cloud"] = "pass"
        result["concurrent_peer_command"] = wait_command(peer["command_id"], 30)["status"]

        final = wait_command(cid)
        _, logs = call("GET", f"/v1/commands/{urllib.parse.quote(cid)}/logs?tail=30000")
        if final.get("exit_code") != 0 or "CODEX_REAL_WORKER_DONE" not in logs.get("stdout", "") + logs.get("stderr", ""):
            raise RuntimeError(f"real Codex worker failed: {final}\n{logs.get('stdout','')}\n{logs.get('stderr','')}")
        head = git(cw, "rev-parse", "HEAD")
        if head == baseline:
            raise RuntimeError("Codex completed without creating the required local commit")
        changed = [x for x in git(cw, "diff", "--name-only", f"{baseline}..{head}").splitlines() if x]
        if not changed or any(not x.startswith("tools/local-agent/") for x in changed):
            raise RuntimeError(f"Codex changed paths outside allowed scope: {changed}")
        stat = git(cw, "diff", "--stat", f"{baseline}..{head}")
        result["codex_commit"] = head
        result["codex_changed_paths"] = changed
        result["codex_diff_stat"] = stat

        # Real peer communication + handoff before integration.
        call("POST", "/v1/message/send", {"sender": codex_agent, "recipient": reviewer, "kind": "review", "body": f"Review commit {head}"})
        call("POST", "/v1/task/checkpoint", {"agent_id": codex_agent, "task_id": codex_task, "fields": {"completed": ["real-codex-run", "local-commit"], "tests": ["py_compile", "monitor --once"], "next_action": "peer review"}})
        call("POST", "/v1/task/handoff", {"task_id": codex_task, "from_agent": codex_agent, "to_agent": reviewer, "notes": f"Review real Codex commit {head}"})
        _, handed = call("GET", "/v1/tasks/" + urllib.parse.quote(codex_task))
        if handed["task"]["current_agent"] != reviewer:
            raise RuntimeError("Codex -> reviewer handoff failed")
        result["codex_peer_handoff"] = "pass"

        # Independent deterministic review in the Codex worktree.
        subprocess.run(["python3", "-m", "py_compile", *[str(cw / p) for p in changed if p.endswith(".py")]], check=True)
        subprocess.run(["python3", str(cw / "tools/local-agent/monitor.py"), "--once"], check=True, stdout=subprocess.DEVNULL)
        if len(changed) > 5:
            raise RuntimeError(f"Codex change too broad for automatic integration: {changed}")

        if args.integrate_safe:
            _, integrated = call("POST", "/v1/integration/submit", {
                "agent_id": reviewer,
                "task_id": codex_task,
                "commit_sha": head,
                "verification": ["python3 -m py_compile tools/local-agent/*.py", "python3 tools/local-agent/monitor.py --once >/dev/null"],
            })
            result["integration_sha"] = integrated["integration_sha"]
        else:
            result["integration_sha"] = None

        call("POST", "/v1/task/complete", {"task_id": codex_task, "agent_id": reviewer, "completed": "Real Codex worker validated and peer-reviewed"})
        call("POST", "/v1/task/complete", {"task_id": review_task, "agent_id": reviewer, "completed": "Concurrent peer/reviewer path validated"})
        call("POST", "/v1/task/complete", {"task_id": cloud_task, "agent_id": cloud_agent, "completed": "Cloud monitor visibility validated"})
        result["ok"] = True
        print(json.dumps(result, indent=2, ensure_ascii=False))
    finally:
        for agent, task in reversed(workspaces):
            try:
                call("POST", "/v1/workspace/remove", {"agent_id": agent, "task_id": task, "force": True})
            except Exception:
                pass
        try:
            purge_runtime(tag)
        except Exception as e:
            print(f"warning: runtime purge failed: {e}")


if __name__ == "__main__":
    main()
