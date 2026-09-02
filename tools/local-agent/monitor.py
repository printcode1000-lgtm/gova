#!/usr/bin/env python3
"""Live terminal monitor for the persistent Gova local-agent runtime.

The monitor is intentionally read-only. It reads the runtime SQLite database and
command log files directly, so opening it never registers an agent, takes a lock,
or creates a GitHub job. Press 1-9 or Enter to open an agent in a separate terminal.
"""
from __future__ import annotations

import argparse
import curses
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

RUNTIME = Path(os.environ.get("GOVA_AGENT_RUNTIME", "/home/hesham/.local/share/gova-agent-runtime")).resolve()
DB_PATH = RUNTIME / "runtime.sqlite3"
WORKTREE_ROOT = Path(os.environ.get("GOVA_AGENT_WORKTREES", "/home/hesham/gova-agents")).resolve()
SELF = Path(__file__).resolve()
REFRESH_SECONDS = 0.7
ONLINE_SECONDS = 120


def db() -> sqlite3.Connection:
    c = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, timeout=1)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA query_only=ON")
    c.execute("PRAGMA busy_timeout=1000")
    return c


def rows(c: sqlite3.Connection, sql: str, args=()):
    try:
        return [dict(r) for r in c.execute(sql, args).fetchall()]
    except sqlite3.OperationalError:
        return []


def one(c: sqlite3.Connection, sql: str, args=()):
    try:
        r = c.execute(sql, args).fetchone()
        return dict(r) if r else None
    except sqlite3.OperationalError:
        return None


def parse_time(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def age_seconds(value: str | None):
    t = parse_time(value)
    if not t:
        return None
    if t.tzinfo is None:
        t = t.replace(tzinfo=timezone.utc)
    return max(0, int((datetime.now(timezone.utc) - t.astimezone(timezone.utc)).total_seconds()))


def age_text(value: str | None):
    n = age_seconds(value)
    if n is None:
        return "-"
    if n < 60:
        return f"{n}s"
    if n < 3600:
        return f"{n // 60}m"
    if n < 86400:
        return f"{n // 3600}h"
    return f"{n // 86400}d"


def profile_map(c: sqlite3.Connection):
    profiles = rows(c, "SELECT * FROM agent_profiles")
    return {p.get("agent_id"): p for p in profiles}


def inferred_kind(agent_id: str, profile: dict | None):
    if profile and profile.get("kind"):
        return str(profile["kind"]).lower()
    low = agent_id.lower()
    if low.startswith(("cloud-", "remote-")) or "cloud" in low:
        return "cloud"
    return "local"


def effective_status(agent: dict, commands: list[dict]):
    if any(x.get("status") == "running" for x in commands):
        return "executing"
    n = age_seconds(agent.get("last_seen"))
    if n is not None and n > ONLINE_SECONDS:
        stored = agent.get("status") or "idle"
        if stored not in ("completed", "failed"):
            return "stale"
    return agent.get("status") or "idle"


def git_info(path: str | None):
    if not path:
        return {"status": "", "head": "", "modified": []}
    p = Path(path)
    if not p.exists():
        return {"status": "missing", "head": "", "modified": []}
    def run(*args):
        cp = subprocess.run(["git", *args], cwd=str(p), text=True, capture_output=True)
        return cp.stdout.strip() if cp.returncode == 0 else ""
    status = run("status", "--porcelain=v1", "-b")
    modified = [line[3:] for line in status.splitlines() if line and not line.startswith("##")]
    return {"status": status, "head": run("rev-parse", "HEAD"), "modified": modified}


def snapshot():
    c = db()
    profiles = profile_map(c)
    agents = rows(c, "SELECT * FROM agents ORDER BY updated_at DESC")
    commands = rows(c, "SELECT * FROM commands ORDER BY started_at DESC")
    tasks = {x["id"]: x for x in rows(c, "SELECT * FROM tasks ORDER BY updated_at DESC")}
    locks = rows(c, "SELECT * FROM locks ORDER BY updated_at DESC")
    result = []
    for a in agents:
        aid = a["id"]
        ac = [x for x in commands if x.get("agent_id") == aid]
        p = profiles.get(aid)
        result.append({
            **a,
            "kind": inferred_kind(aid, p),
            "transport": (p or {}).get("transport") or ("gateway" if inferred_kind(aid, p) == "local" else "remote-gateway"),
            "display_name": (p or {}).get("display_name") or aid,
            "effective_status": effective_status(a, ac),
            "running_commands": sum(1 for x in ac if x.get("status") == "running"),
            "task": tasks.get(a.get("task_id")),
            "locks_count": sum(1 for x in locks if x.get("agent_id") == aid),
        })
    c.close()
    result.sort(key=lambda x: (x["effective_status"] not in ("executing", "active"), x["kind"] != "local", x["id"]))
    return result


def agent_detail(agent_id: str):
    c = db()
    a = one(c, "SELECT * FROM agents WHERE id=?", (agent_id,))
    if not a:
        c.close()
        return None
    p = one(c, "SELECT * FROM agent_profiles WHERE agent_id=?", (agent_id,))
    task = one(c, "SELECT * FROM tasks WHERE id=?", (a.get("task_id"),)) if a.get("task_id") else None
    commands = rows(c, "SELECT * FROM commands WHERE agent_id=? ORDER BY started_at DESC LIMIT 12", (agent_id,))
    locks = rows(c, "SELECT * FROM locks WHERE agent_id=? ORDER BY updated_at DESC", (agent_id,))
    messages = rows(c, "SELECT * FROM messages WHERE sender=? OR recipient=? OR recipient='all' ORDER BY id DESC LIMIT 20", (agent_id, agent_id))
    handoffs = rows(c, "SELECT * FROM handoffs WHERE from_agent=? OR to_agent=? ORDER BY id DESC LIMIT 12", (agent_id, agent_id))
    events = rows(c, "SELECT * FROM events WHERE agent_id=? ORDER BY id DESC LIMIT 20", (agent_id,))
    c.close()
    kind = inferred_kind(agent_id, p)
    a["kind"] = kind
    a["transport"] = (p or {}).get("transport") or ("gateway" if kind == "local" else "remote-gateway")
    a["display_name"] = (p or {}).get("display_name") or agent_id
    a["effective_status"] = effective_status(a, commands)
    running = [x for x in commands if x.get("status") == "running"]
    latest = commands[0] if commands else None
    logs = {"stdout": "", "stderr": ""}
    if latest:
        for key, path_key in (("stdout", "out_path"), ("stderr", "err_path")):
            try:
                b = Path(latest[path_key]).read_bytes()
                logs[key] = b[-6000:].decode(errors="replace")
            except Exception:
                pass
    worktree = (task or {}).get("worktree") or a.get("worktree")
    return {
        "agent": a,
        "task": task,
        "commands": commands,
        "running": running,
        "locks": locks,
        "messages": messages,
        "handoffs": handoffs,
        "events": events,
        "logs": logs,
        "git": git_info(worktree),
    }


def clip(value, n=72):
    s = "" if value is None else str(value).replace("\n", " ")
    return s if len(s) <= n else s[: n - 1] + "…"


def add(stdscr, y, x, text, attr=0):
    h, w = stdscr.getmaxyx()
    if y < 0 or y >= h or x >= w:
        return
    try:
        stdscr.addnstr(y, x, str(text), max(0, w - x - 1), attr)
    except curses.error:
        pass


def launch_detail(agent_id: str):
    cmd = [str(SELF), "--agent", agent_id]
    installed = shutil.which("gova-agent-monitor")
    if installed:
        cmd[0] = installed
    terminal = shutil.which("gnome-terminal")
    if terminal and os.environ.get("DISPLAY"):
        subprocess.Popen([terminal, f"--title=Gova Agent: {agent_id}", "--", *cmd], start_new_session=True)
        return True
    terminal = shutil.which("x-terminal-emulator")
    if terminal and os.environ.get("DISPLAY"):
        subprocess.Popen([terminal, "-e", *cmd], start_new_session=True)
        return True
    return False


def render_main(stdscr, selected: int):
    agents = snapshot()
    stdscr.erase()
    h, w = stdscr.getmaxyx()
    add(stdscr, 0, 0, "GOVA LOCAL AGENTS MONITOR", curses.A_BOLD)
    add(stdscr, 1, 0, f"runtime: {DB_PATH}   agents: {len(agents)}   refresh: {REFRESH_SECONDS}s")
    add(stdscr, 2, 0, "1-9/Enter: open agent window   ↑↓: select   r: refresh   q: quit")
    add(stdscr, 4, 0, " #  TYPE   STATUS       AGENT                         TASK                          BRANCH")
    add(stdscr, 5, 0, "─" * min(w - 1, 118))
    max_rows = max(1, h - 8)
    if agents:
        selected = max(0, min(selected, len(agents) - 1))
    for i, a in enumerate(agents[:max_rows]):
        task = a.get("task") or {}
        prefix = f"{i+1:>2}" if i < 9 else " ·"
        line = f" {prefix}  {a['kind'][:5].upper():<5}  {a['effective_status'][:11]:<11}  {clip(a['id'],28):<28}  {clip(task.get('id'),28):<28}  {clip(a.get('branch'),34)}"
        attr = curses.A_REVERSE if i == selected else 0
        if a["effective_status"] == "executing":
            attr |= curses.A_BOLD
        add(stdscr, 6 + i, 0, line, attr)
    if not agents:
        add(stdscr, 7, 2, "No agents registered yet.")
    add(stdscr, h - 1, 0, "Read-only monitor — no GitHub jobs, locks or heartbeats are created.")
    stdscr.refresh()
    return agents, selected


def main_ui(stdscr):
    curses.curs_set(0)
    stdscr.nodelay(True)
    stdscr.timeout(int(REFRESH_SECONDS * 1000))
    selected = 0
    while True:
        agents, selected = render_main(stdscr, selected)
        key = stdscr.getch()
        if key in (ord("q"), 3):
            return
        if key in (curses.KEY_DOWN, ord("j")) and agents:
            selected = min(len(agents) - 1, selected + 1)
        elif key in (curses.KEY_UP, ord("k")) and agents:
            selected = max(0, selected - 1)
        elif key in (10, 13) and agents:
            if not launch_detail(agents[selected]["id"]):
                detail_ui(stdscr, agents[selected]["id"], embedded=True)
        elif ord("1") <= key <= ord("9"):
            idx = key - ord("1")
            if idx < len(agents):
                selected = idx
                if not launch_detail(agents[idx]["id"]):
                    detail_ui(stdscr, agents[idx]["id"], embedded=True)


def render_detail(stdscr, agent_id: str):
    d = agent_detail(agent_id)
    stdscr.erase()
    h, w = stdscr.getmaxyx()
    if not d:
        add(stdscr, 0, 0, f"Agent not found: {agent_id}", curses.A_BOLD)
        stdscr.refresh()
        return
    a, t = d["agent"], d["task"] or {}
    add(stdscr, 0, 0, f"GOVA AGENT — {a['display_name']}", curses.A_BOLD)
    add(stdscr, 1, 0, f"type={a['kind']}  transport={a['transport']}  status={a['effective_status']}  last_seen={age_text(a.get('last_seen'))} ago")
    add(stdscr, 2, 0, f"session={a.get('session_id') or '-'}  task={a.get('task_id') or '-'}")
    add(stdscr, 3, 0, f"worktree={t.get('worktree') or a.get('worktree') or '-'}")
    add(stdscr, 4, 0, f"branch={t.get('branch') or a.get('branch') or '-'}  head={d['git'].get('head') or '-'}")
    add(stdscr, 6, 0, "CURRENT TASK", curses.A_BOLD)
    add(stdscr, 7, 0, f"goal: {clip(t.get('goal'), max(50, w-7))}")
    add(stdscr, 8, 0, f"state: {t.get('status') or '-'}   next: {clip(t.get('next_action'), max(30, w-32))}")
    add(stdscr, 9, 0, f"completed: {clip(t.get('completed'), max(30, w-12))}")
    add(stdscr, 10, 0, f"remaining: {clip(t.get('remaining'), max(30, w-12))}")
    add(stdscr, 11, 0, f"handoff: {clip(t.get('handoff'), max(30, w-10))}")
    add(stdscr, 13, 0, "PROCESS / COMMAND", curses.A_BOLD)
    latest = d["commands"][0] if d["commands"] else {}
    add(stdscr, 14, 0, f"id={latest.get('id','-')} pid={latest.get('pid','-')} state={latest.get('status','-')} exit={latest.get('exit_code','-')}")
    add(stdscr, 15, 0, f"cmd: {clip(latest.get('command'), max(50, w-5))}")
    add(stdscr, 16, 0, f"locks={len(d['locks'])} messages={len(d['messages'])} handoffs={len(d['handoffs'])} recent-events={len(d['events'])}")
    add(stdscr, 18, 0, "GIT / WORKFLOW", curses.A_BOLD)
    add(stdscr, 19, 0, f"modified: {', '.join(d['git'].get('modified', [])[:8]) or '-'}")
    add(stdscr, 20, 0, f"tests: {clip(t.get('tests'), max(30, w-7))}")
    add(stdscr, 21, 0, f"results: {clip(t.get('test_results'), max(30, w-9))}")
    add(stdscr, 22, 0, f"blockers: {clip(t.get('blockers'), max(30, w-10))}")
    if h > 27:
        add(stdscr, 24, 0, "LATEST OUTPUT", curses.A_BOLD)
        out = (d["logs"].get("stdout") or d["logs"].get("stderr") or "").splitlines()[-max(1, h-27):]
        for i, line in enumerate(out):
            add(stdscr, 25 + i, 0, clip(line, max(20, w-1)))
    add(stdscr, h - 1, 0, "q: close   r: refresh   live read-only view")
    stdscr.refresh()


def detail_ui(stdscr, agent_id: str, embedded=False):
    stdscr.nodelay(True)
    stdscr.timeout(int(REFRESH_SECONDS * 1000))
    while True:
        render_detail(stdscr, agent_id)
        key = stdscr.getch()
        if key in (ord("q"), 27, 3):
            return
        if embedded and key in (10, 13):
            return


def plain_main():
    agents = snapshot()
    print(f"GOVA LOCAL AGENTS MONITOR — {len(agents)} agents")
    for i, a in enumerate(agents):
        t = a.get("task") or {}
        print(f"{i+1:>2}. [{a['kind'].upper():5}] {a['effective_status']:<11} {a['id']} task={t.get('id') or '-'} branch={a.get('branch') or '-'}")


def plain_detail(agent_id):
    d = agent_detail(agent_id)
    print(json.dumps(d, indent=2, ensure_ascii=False, default=str))


def main():
    ap = argparse.ArgumentParser(prog="gova-agent-monitor")
    ap.add_argument("--agent")
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    if not DB_PATH.exists():
        raise SystemExit(f"runtime database not found: {DB_PATH}")
    if args.json:
        print(json.dumps(agent_detail(args.agent) if args.agent else snapshot(), indent=2, ensure_ascii=False, default=str))
        return
    if args.once or not sys.stdout.isatty():
        plain_detail(args.agent) if args.agent else plain_main()
        return
    if args.agent:
        curses.wrapper(lambda s: detail_ui(s, args.agent))
    else:
        curses.wrapper(main_ui)


if __name__ == "__main__":
    main()
