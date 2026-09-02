#!/usr/bin/env python3
"""Read-only multi-window monitor for the persistent Gova local execution stack.

The monitor combines:
- persistent local/cloud agents from runtime SQLite,
- GitHub self-hosted runner state and active Actions jobs,
- gateway/service/runtime health,
- canonical checkout and local worktrees,
- recent agent and runner logs.

Opening the monitor never registers an agent, refreshes a heartbeat, takes a lock,
mutates Git, or dispatches a GitHub job.
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
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

REPO = Path(os.environ.get("GOVA_AGENT_REPO", "/home/hesham/gova")).resolve()
RUNTIME = Path(os.environ.get("GOVA_AGENT_RUNTIME", "/home/hesham/.local/share/gova-agent-runtime")).resolve()
DB_PATH = RUNTIME / "runtime.sqlite3"
WORKTREE_ROOT = Path(os.environ.get("GOVA_AGENT_WORKTREES", "/home/hesham/gova-agents")).resolve()
GITHUB_REPO = os.environ.get("GOVA_GITHUB_REPO", "printcode1000-lgtm/gova")
SELF = Path(__file__).resolve()
REFRESH_SECONDS = 0.7
ONLINE_SECONDS = 120
NETWORK_REFRESH_SECONDS = 5.0
GIT_REFRESH_SECONDS = 2.0
_CACHE: dict[str, tuple[float, Any]] = {}


def cached(key: str, ttl: float, loader: Callable[[], Any]):
    now = time.monotonic()
    item = _CACHE.get(key)
    if item and now - item[0] < ttl:
        return item[1]
    value = loader()
    _CACHE[key] = (now, value)
    return value


def run_cmd(args: list[str], cwd: Path | None = None, timeout: float = 3.0, input_text: str | None = None):
    try:
        cp = subprocess.run(
            args,
            cwd=str(cwd) if cwd else None,
            text=True,
            input=input_text,
            capture_output=True,
            timeout=timeout,
            env=os.environ.copy(),
        )
        return {"ok": cp.returncode == 0, "code": cp.returncode, "out": cp.stdout.strip(), "err": cp.stderr.strip()}
    except Exception as exc:
        return {"ok": False, "code": -1, "out": "", "err": str(exc)}


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


def with_db(loader: Callable[[sqlite3.Connection], Any], default):
    if not DB_PATH.exists():
        return default
    try:
        c = db()
        try:
            return loader(c)
        finally:
            c.close()
    except Exception:
        return default


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


def clip(value, n=72):
    s = "" if value is None else str(value).replace("\n", " ")
    return s if len(s) <= n else s[: max(0, n - 1)] + "…"


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


def agents_snapshot():
    def load(c):
        profiles = {p.get("agent_id"): p for p in rows(c, "SELECT * FROM agent_profiles")}
        agents = rows(c, "SELECT * FROM agents ORDER BY updated_at DESC")
        commands = rows(c, "SELECT * FROM commands ORDER BY started_at DESC")
        tasks = {x["id"]: x for x in rows(c, "SELECT * FROM tasks ORDER BY updated_at DESC")}
        locks = rows(c, "SELECT * FROM locks ORDER BY updated_at DESC")
        result = []
        for a in agents:
            aid = a["id"]
            ac = [x for x in commands if x.get("agent_id") == aid]
            p = profiles.get(aid)
            kind = inferred_kind(aid, p)
            result.append({
                **a,
                "kind": kind,
                "transport": (p or {}).get("transport") or ("gateway" if kind == "local" else "remote-gateway"),
                "display_name": (p or {}).get("display_name") or aid,
                "effective_status": effective_status(a, ac),
                "running_commands": sum(1 for x in ac if x.get("status") == "running"),
                "task": tasks.get(a.get("task_id")),
                "locks_count": sum(1 for x in locks if x.get("agent_id") == aid),
            })
        result.sort(key=lambda x: (x["effective_status"] not in ("executing", "active"), x["kind"] != "local", x["id"]))
        return result

    return with_db(load, [])


def git_info(path: str | None):
    if not path:
        return {"status": "", "head": "", "branch": "", "modified": []}
    p = Path(path)
    if not p.exists():
        return {"status": "missing", "head": "", "branch": "", "modified": []}

    def git(*args):
        r = run_cmd(["git", *args], cwd=p, timeout=2)
        return r["out"] if r["ok"] else ""

    status = git("status", "--porcelain=v1", "-b")
    modified = [line[3:] for line in status.splitlines() if line and not line.startswith("##")]
    return {
        "status": status,
        "head": git("rev-parse", "HEAD"),
        "branch": git("branch", "--show-current"),
        "modified": modified,
    }


def agent_detail(agent_id: str):
    def load(c):
        a = one(c, "SELECT * FROM agents WHERE id=?", (agent_id,))
        if not a:
            return None
        p = one(c, "SELECT * FROM agent_profiles WHERE agent_id=?", (agent_id,))
        task = one(c, "SELECT * FROM tasks WHERE id=?", (a.get("task_id"),)) if a.get("task_id") else None
        commands = rows(c, "SELECT * FROM commands WHERE agent_id=? ORDER BY started_at DESC LIMIT 20", (agent_id,))
        locks = rows(c, "SELECT * FROM locks WHERE agent_id=? ORDER BY updated_at DESC", (agent_id,))
        messages = rows(c, "SELECT * FROM messages WHERE sender=? OR recipient=? OR recipient='all' ORDER BY id DESC LIMIT 30", (agent_id, agent_id))
        handoffs = rows(c, "SELECT * FROM handoffs WHERE from_agent=? OR to_agent=? ORDER BY id DESC LIMIT 20", (agent_id, agent_id))
        events = rows(c, "SELECT * FROM events WHERE agent_id=? ORDER BY id DESC LIMIT 30", (agent_id,))
        kind = inferred_kind(agent_id, p)
        a["kind"] = kind
        a["transport"] = (p or {}).get("transport") or ("gateway" if kind == "local" else "remote-gateway")
        a["display_name"] = (p or {}).get("display_name") or agent_id
        a["effective_status"] = effective_status(a, commands)
        latest = commands[0] if commands else None
        logs = {"stdout": "", "stderr": ""}
        if latest:
            for key, path_key in (("stdout", "out_path"), ("stderr", "err_path")):
                try:
                    b = Path(latest[path_key]).read_bytes()
                    logs[key] = b[-12000:].decode(errors="replace")
                except Exception:
                    pass
        worktree = (task or {}).get("worktree") or a.get("worktree")
        return {
            "agent": a,
            "task": task,
            "commands": commands,
            "running": [x for x in commands if x.get("status") == "running"],
            "locks": locks,
            "messages": messages,
            "handoffs": handoffs,
            "events": events,
            "logs": logs,
            "git": git_info(worktree),
        }

    return with_db(load, None)


def _credential_token():
    if not REPO.exists():
        return ""
    r = run_cmd(
        ["git", "credential", "fill"],
        cwd=REPO,
        timeout=2,
        input_text="protocol=https\nhost=github.com\n\n",
    )
    if not r["ok"]:
        return ""
    for line in r["out"].splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1].strip()
    return ""


def github_api(path: str):
    gh = shutil.which("gh")
    if gh:
        r = run_cmd([gh, "api", "-H", "Accept: application/vnd.github+json", path], cwd=REPO if REPO.exists() else None, timeout=4)
        if r["ok"]:
            try:
                return json.loads(r["out"]), ""
            except Exception as exc:
                return None, f"gh-json: {exc}"
    token = _credential_token()
    url = f"https://api.github.com/{path.lstrip('/')}"
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "gova-agent-monitor",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=4) as response:
            return json.loads(response.read().decode()), ""
    except Exception as exc:
        return None, str(exc)


def local_runner_processes():
    r = run_cmd(["ps", "-eo", "pid=,etime=,cmd="], timeout=2)
    result = []
    if not r["ok"]:
        return result
    needles = ("Runner.Listener", "Runner.Worker", "runsvc.sh", "RunnerService")
    for line in r["out"].splitlines():
        if not any(n in line for n in needles):
            continue
        parts = line.strip().split(None, 2)
        if len(parts) < 3:
            continue
        pid, elapsed, command = parts
        cwd = ""
        try:
            cwd = os.readlink(f"/proc/{pid}/cwd")
        except Exception:
            pass
        result.append({"pid": pid, "elapsed": elapsed, "command": command, "cwd": cwd})
    return result


def _github_snapshot_loader():
    data: dict[str, Any] = {
        "runners": [],
        "runs": [],
        "jobs": [],
        "runner_processes": local_runner_processes(),
        "errors": [],
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    runners, err = github_api(f"repos/{GITHUB_REPO}/actions/runners?per_page=100")
    if isinstance(runners, dict):
        data["runners"] = runners.get("runners") or []
    elif err:
        data["errors"].append(f"runners: {err}")

    runs, err = github_api(f"repos/{GITHUB_REPO}/actions/runs?per_page=30")
    active_statuses = {"queued", "in_progress", "waiting", "pending", "requested"}
    if isinstance(runs, dict):
        data["runs"] = [x for x in runs.get("workflow_runs", []) if x.get("status") in active_statuses]
    elif err:
        data["errors"].append(f"runs: {err}")

    for run in data["runs"][:8]:
        run_id = run.get("id")
        if not run_id:
            continue
        jobs, job_err = github_api(f"repos/{GITHUB_REPO}/actions/runs/{run_id}/jobs?per_page=100")
        if isinstance(jobs, dict):
            for job in jobs.get("jobs", []):
                if job.get("status") in active_statuses:
                    data["jobs"].append({
                        **job,
                        "workflow_name": run.get("name"),
                        "head_branch": run.get("head_branch"),
                        "head_sha": run.get("head_sha"),
                        "run_id": run_id,
                    })
        elif job_err:
            data["errors"].append(f"jobs {run_id}: {job_err}")
    return data


def github_snapshot():
    return cached("github", NETWORK_REFRESH_SECONDS, _github_snapshot_loader)


def _gateway_snapshot_loader():
    health = None
    error = ""
    try:
        req = urllib.request.Request("http://127.0.0.1:8765/health", headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=0.7) as response:
            health = json.loads(response.read().decode())
    except Exception as exc:
        error = str(exc)

    service = run_cmd(["systemctl", "is-active", "gova-agent-gateway.service"], timeout=1.5)
    service_scope = "system"
    if not service["ok"]:
        user = run_cmd(["systemctl", "--user", "is-active", "gova-agent-gateway.service"], timeout=1.5)
        if user["ok"]:
            service, service_scope = user, "user"

    def db_state(c):
        tables = {}
        for name in ("agents", "tasks", "commands", "locks", "messages", "handoffs", "events"):
            row = one(c, f"SELECT COUNT(*) AS n FROM {name}")
            tables[name] = (row or {}).get("n", 0)
        running = one(c, "SELECT COUNT(*) AS n FROM commands WHERE status='running'")
        return {"counts": tables, "running_commands": (running or {}).get("n", 0)}

    state = with_db(db_state, {"counts": {}, "running_commands": 0})
    return {
        "health": health,
        "health_error": error,
        "service": service["out"] if service["ok"] else (service["out"] or service["err"] or "inactive"),
        "service_scope": service_scope,
        "db_exists": DB_PATH.exists(),
        **state,
    }


def gateway_snapshot():
    return cached("gateway", 2.0, _gateway_snapshot_loader)


def runtime_snapshot():
    def load(c):
        return {
            "commands": rows(c, "SELECT * FROM commands ORDER BY started_at DESC LIMIT 25"),
            "events": rows(c, "SELECT * FROM events ORDER BY id DESC LIMIT 35"),
            "locks": rows(c, "SELECT * FROM locks ORDER BY updated_at DESC"),
            "messages": rows(c, "SELECT * FROM messages ORDER BY id DESC LIMIT 20"),
            "handoffs": rows(c, "SELECT * FROM handoffs ORDER BY id DESC LIMIT 20"),
        }

    return with_db(load, {"commands": [], "events": [], "locks": [], "messages": [], "handoffs": []})


def _git_snapshot_loader():
    result = {
        "canonical": git_info(str(REPO)),
        "origin_main": "",
        "origin_integration": "",
        "worktrees": [],
    }
    if not REPO.exists():
        return result
    for ref, key in (("origin/main", "origin_main"), ("origin/integration", "origin_integration")):
        r = run_cmd(["git", "rev-parse", ref], cwd=REPO, timeout=2)
        result[key] = r["out"] if r["ok"] else ""

    listing = run_cmd(["git", "worktree", "list", "--porcelain"], cwd=REPO, timeout=3)
    blocks: list[dict[str, str]] = []
    current: dict[str, str] = {}
    if listing["ok"]:
        for line in listing["out"].splitlines() + [""]:
            if not line:
                if current:
                    blocks.append(current)
                    current = {}
                continue
            if " " in line:
                key, value = line.split(" ", 1)
                current[key] = value
            else:
                current[line] = "true"
    for item in blocks:
        path = item.get("worktree", "")
        info = git_info(path)
        result["worktrees"].append({
            "path": path,
            "head": item.get("HEAD") or info.get("head") or "",
            "branch": (item.get("branch") or "").removeprefix("refs/heads/") or info.get("branch") or "",
            "detached": "detached" in item,
            "modified": info.get("modified", []),
        })
    return result


def git_snapshot():
    return cached("git", GIT_REFRESH_SECONDS, _git_snapshot_loader)


def runner_log_tail():
    processes = local_runner_processes()
    roots = []
    for p in processes:
        cwd = p.get("cwd")
        if cwd:
            roots.append(Path(cwd))
    roots.extend([Path("/home/hesham/actions-runner"), Path("/home/hesham/.local/github-runners")])
    candidates = []
    seen = set()
    for root in roots:
        try:
            for p in root.glob("_diag/*.log"):
                rp = str(p.resolve())
                if rp not in seen:
                    seen.add(rp)
                    candidates.append(p)
        except Exception:
            pass
    if not candidates:
        return {"path": "", "lines": []}
    latest = max(candidates, key=lambda p: p.stat().st_mtime)
    try:
        lines = latest.read_text(errors="replace").splitlines()[-35:]
    except Exception:
        lines = []
    return {"path": str(latest), "lines": lines}


def full_snapshot():
    return {
        "agents": agents_snapshot(),
        "github": github_snapshot(),
        "gateway": gateway_snapshot(),
        "runtime": runtime_snapshot(),
        "git": git_snapshot(),
        "runner_log": runner_log_tail(),
    }


def add(stdscr, y, x, text, attr=0):
    h, w = stdscr.getmaxyx()
    if y < 0 or y >= h or x >= w:
        return
    try:
        stdscr.addnstr(y, x, str(text), max(0, w - x - 1), attr)
    except curses.error:
        pass


def title(stdscr, name: str):
    add(stdscr, 0, 0, f"GOVA LOCAL EXECUTION MONITOR — {name}", curses.A_BOLD)
    add(stdscr, 1, 0, "1 Dashboard   2 Agents   3 GitHub   4 Runtime   5 Worktrees   6 Logs   Q Quit")
    h, w = stdscr.getmaxyx()
    add(stdscr, 2, 0, "─" * max(1, min(w - 1, 132)))


def loading_frame(stdscr, name: str, source: str):
    """Paint immediately before any potentially slow snapshot work."""
    stdscr.erase()
    title(stdscr, name)
    add(stdscr, 4, 0, f"Loading {source} …", curses.A_BOLD)
    add(stdscr, 5, 0, "The window is live. Data will replace this message as soon as the source responds.")
    stdscr.refresh()


def installed_monitor():
    return shutil.which("gova-agent-monitor") or str(SELF)


def launch_window(view: str, agent_id: str | None = None):
    cmd = [installed_monitor()]
    window_title = f"Gova Monitor: {view}"
    if agent_id:
        cmd += ["--agent", agent_id]
        window_title = f"Gova Agent: {agent_id}"
    else:
        cmd += ["--view", view]
    terminal = shutil.which("gnome-terminal")
    if terminal and os.environ.get("DISPLAY"):
        subprocess.Popen([terminal, f"--title={window_title}", "--", *cmd], start_new_session=True)
        return True
    terminal = shutil.which("x-terminal-emulator")
    if terminal and os.environ.get("DISPLAY"):
        subprocess.Popen([terminal, "-e", *cmd], start_new_session=True)
        return True
    return False


def open_workspace():
    views = ("dashboard", "agents", "github", "runtime", "worktrees", "logs")
    opened = sum(1 for view in views if launch_window(view))
    if opened != len(views):
        raise SystemExit("A graphical terminal is required to open the multi-window workspace.")


def render_dashboard(stdscr):
    agents = agents_snapshot()
    gh = github_snapshot()
    gate = gateway_snapshot()
    git = git_snapshot()
    stdscr.erase()
    title(stdscr, "DASHBOARD")
    h, _ = stdscr.getmaxyx()

    executing = [a for a in agents if a.get("effective_status") == "executing"]
    active_runners = [r for r in gh.get("runners", []) if r.get("status") == "online"]
    busy_runners = [r for r in active_runners if r.get("busy")]
    jobs = gh.get("jobs", [])
    health_ok = bool((gate.get("health") or {}).get("ok"))

    add(stdscr, 4, 0, "SYSTEM", curses.A_BOLD)
    add(stdscr, 5, 0, f"gateway={'OK' if health_ok else 'DOWN'}  service={gate.get('service')}({gate.get('service_scope')})  db={'OK' if gate.get('db_exists') else 'MISSING'}")
    add(stdscr, 6, 0, f"github-runners online={len(active_runners)} busy={len(busy_runners)}  runner-processes={len(gh.get('runner_processes', []))}  active-jobs={len(jobs)}")
    add(stdscr, 7, 0, f"agents={len(agents)} executing={len(executing)}  running-agent-commands={gate.get('running_commands', 0)}")
    add(stdscr, 8, 0, f"canonical={REPO}  branch={git.get('canonical',{}).get('branch') or '-'}  head={clip(git.get('canonical',{}).get('head'),12)}  worktrees={len(git.get('worktrees', []))}")

    y = 10
    add(stdscr, y, 0, "ACTIVE AGENTS", curses.A_BOLD)
    y += 1
    for a in executing[: max(1, min(6, h - y - 8))]:
        task = a.get("task") or {}
        add(stdscr, y, 0, f"{a.get('id')}  task={task.get('id') or '-'}  branch={a.get('branch') or task.get('branch') or '-'}")
        y += 1
    if not executing:
        add(stdscr, y, 0, "none")
        y += 1

    y += 1
    add(stdscr, y, 0, "ACTIVE GITHUB JOBS", curses.A_BOLD)
    y += 1
    for job in jobs[: max(1, min(8, h - y - 3))]:
        add(stdscr, y, 0, f"{job.get('workflow_name')}/{job.get('name')}  {job.get('status')}  branch={job.get('head_branch')}  sha={clip(job.get('head_sha'),10)}")
        y += 1
    if not jobs:
        add(stdscr, y, 0, "none")
    add(stdscr, h - 1, 0, "Read-only unified status. Network data refreshes every 5s; local runtime refreshes continuously.")
    stdscr.refresh()


def render_agents(stdscr, selected: int):
    agents = agents_snapshot()
    stdscr.erase()
    title(stdscr, "AGENTS")
    h, w = stdscr.getmaxyx()
    add(stdscr, 4, 0, " #  TYPE   STATUS       AGENT                         TASK                          BRANCH")
    add(stdscr, 5, 0, "─" * max(1, min(w - 1, 130)))
    max_rows = max(1, h - 8)
    if agents:
        selected = max(0, min(selected, min(len(agents), max_rows) - 1))
    for i, a in enumerate(agents[:max_rows]):
        task = a.get("task") or {}
        prefix = f"{i+1:>2}" if i < 9 else " ·"
        line = f" {prefix}  {a['kind'][:5].upper():<5}  {a['effective_status'][:11]:<11}  {clip(a['id'],28):<28}  {clip(task.get('id'),28):<28}  {clip(a.get('branch') or task.get('branch'),34)}"
        attr = curses.A_REVERSE if i == selected else 0
        if a["effective_status"] == "executing":
            attr |= curses.A_BOLD
        add(stdscr, 6 + i, 0, line, attr)
    if not agents:
        add(stdscr, 7, 2, "No agents registered.")
    add(stdscr, h - 1, 0, "↑↓ select   Enter opens agent details here   1-6 switch screens")
    stdscr.refresh()
    return agents, selected


def render_github(stdscr):
    gh = github_snapshot()
    stdscr.erase()
    title(stdscr, "GITHUB RUNNER / ACTIONS")
    h, w = stdscr.getmaxyx()
    y = 4

    add(stdscr, y, 0, "SELF-HOSTED RUNNERS", curses.A_BOLD)
    y += 1
    runners = gh.get("runners", [])
    for r in runners[:8]:
        labels = ",".join(x.get("name", "") for x in r.get("labels", []))
        add(stdscr, y, 0, f"{r.get('name')}  status={r.get('status')} busy={r.get('busy')}  labels={clip(labels,70)}")
        y += 1
    if not runners:
        add(stdscr, y, 0, "GitHub runner API returned no visible runners.")
        y += 1

    y += 1
    add(stdscr, y, 0, "LOCAL RUNNER PROCESSES", curses.A_BOLD)
    y += 1
    for p in gh.get("runner_processes", [])[:6]:
        add(stdscr, y, 0, f"pid={p.get('pid')} age={p.get('elapsed')} cwd={p.get('cwd') or '-'}  {clip(p.get('command'),70)}")
        y += 1
    if not gh.get("runner_processes"):
        add(stdscr, y, 0, "No Runner.Listener/Runner.Worker process detected.")
        y += 1

    y += 1
    add(stdscr, y, 0, "ACTIVE / QUEUED JOBS", curses.A_BOLD)
    y += 1
    for job in gh.get("jobs", [])[: max(1, h - y - 4)]:
        add(stdscr, y, 0, f"{job.get('workflow_name')}/{job.get('name')}  {job.get('status')}  runner={job.get('runner_name') or '-'}  branch={job.get('head_branch')}  sha={clip(job.get('head_sha'),10)}")
        y += 1
    if not gh.get("jobs"):
        add(stdscr, y, 0, "No active or queued jobs.")

    errors = gh.get("errors", [])
    if errors and h - y > 3:
        y += 2
        add(stdscr, y, 0, "SOURCE WARNINGS", curses.A_BOLD)
        for err in errors[: max(1, h - y - 2)]:
            y += 1
            add(stdscr, y, 0, clip(err, max(20, w - 1)))
    add(stdscr, h - 1, 0, f"GitHub snapshot age={age_text(gh.get('fetched_at'))}; refreshed every {int(NETWORK_REFRESH_SECONDS)}s.")
    stdscr.refresh()


def render_runtime(stdscr):
    gate = gateway_snapshot()
    rt = runtime_snapshot()
    stdscr.erase()
    title(stdscr, "GATEWAY / RUNTIME")
    h, w = stdscr.getmaxyx()
    y = 4
    health = gate.get("health") or {}
    add(stdscr, y, 0, "GATEWAY", curses.A_BOLD)
    y += 1
    add(stdscr, y, 0, f"health={'OK' if health.get('ok') else 'DOWN'}  pid={health.get('pid') or '-'}  service={gate.get('service')} ({gate.get('service_scope')})")
    y += 1
    add(stdscr, y, 0, f"repo={health.get('repo') or REPO}  runtime={health.get('runtime') or RUNTIME}")
    y += 1
    add(stdscr, y, 0, f"db={DB_PATH}  exists={gate.get('db_exists')}  counts={gate.get('counts')}")
    if gate.get("health_error"):
        y += 1
        add(stdscr, y, 0, f"health-error: {clip(gate.get('health_error'), max(20,w-15))}")

    y += 2
    add(stdscr, y, 0, "LOCKS", curses.A_BOLD)
    y += 1
    for lock in rt.get("locks", [])[:6]:
        add(stdscr, y, 0, f"{lock.get('kind') or '-'}:{lock.get('scope') or lock.get('name') or lock.get('path') or '-'}  agent={lock.get('agent_id') or '-'}  updated={age_text(lock.get('updated_at'))} ago")
        y += 1
    if not rt.get("locks"):
        add(stdscr, y, 0, "none")
        y += 1

    y += 1
    add(stdscr, y, 0, "RECENT EVENTS", curses.A_BOLD)
    y += 1
    for ev in rt.get("events", [])[: max(1, h - y - 2)]:
        add(stdscr, y, 0, f"{ev.get('id','-')} agent={ev.get('agent_id') or '-'}  {clip(ev.get('type') or ev.get('event') or ev.get('message') or ev, max(25,w-32))}")
        y += 1
    add(stdscr, h - 1, 0, "SQLite is opened query_only; this window never writes runtime state.")
    stdscr.refresh()


def render_worktrees(stdscr):
    data = git_snapshot()
    stdscr.erase()
    title(stdscr, "GIT / WORKTREES")
    h, _ = stdscr.getmaxyx()
    canonical = data.get("canonical", {})
    add(stdscr, 4, 0, "CANONICAL CHECKOUT", curses.A_BOLD)
    add(stdscr, 5, 0, f"path={REPO}")
    add(stdscr, 6, 0, f"branch={canonical.get('branch') or '-'}  head={canonical.get('head') or '-'}")
    add(stdscr, 7, 0, f"origin/main={data.get('origin_main') or '-'}")
    add(stdscr, 8, 0, f"origin/integration={data.get('origin_integration') or '-'}")
    add(stdscr, 9, 0, f"modified={', '.join(canonical.get('modified', [])[:10]) or '-'}")

    add(stdscr, 11, 0, "ALL LOCAL WORKTREES", curses.A_BOLD)
    add(stdscr, 12, 0, "BRANCH                         HEAD          MOD  PATH")
    y = 13
    for wt in data.get("worktrees", [])[: max(1, h - y - 2)]:
        add(stdscr, y, 0, f"{clip(wt.get('branch') or '(detached)',30):<30} {clip(wt.get('head'),12):<12} {len(wt.get('modified',[])):>3}  {wt.get('path')}")
        y += 1
    add(stdscr, h - 1, 0, "Read-only git status/worktree inspection; no fetch, checkout, reset or clean is performed.")
    stdscr.refresh()


def render_logs(stdscr):
    rt = runtime_snapshot()
    runner = cached("runner-log", 2.0, runner_log_tail)
    stdscr.erase()
    title(stdscr, "LOGS")
    h, w = stdscr.getmaxyx()
    y = 4
    add(stdscr, y, 0, "RECENT AGENT COMMANDS", curses.A_BOLD)
    y += 1
    for cmd in rt.get("commands", [])[:8]:
        add(stdscr, y, 0, f"{cmd.get('status','-'):<10} agent={clip(cmd.get('agent_id'),22):<22} pid={cmd.get('pid') or '-'}  {clip(cmd.get('command'), max(20,w-55))}")
        y += 1
    if not rt.get("commands"):
        add(stdscr, y, 0, "none")
        y += 1

    y += 1
    add(stdscr, y, 0, "LATEST GITHUB RUNNER DIAGNOSTIC LOG", curses.A_BOLD)
    y += 1
    add(stdscr, y, 0, f"path={runner.get('path') or '-'}")
    y += 1
    remaining = max(1, h - y - 2)
    for line in runner.get("lines", [])[-remaining:]:
        add(stdscr, y, 0, clip(line, max(20, w - 1)))
        y += 1
    if not runner.get("lines"):
        add(stdscr, y, 0, "No runner diagnostic log discovered from the active runner process.")
    add(stdscr, h - 1, 0, "Live read-only tail; source files are never truncated or modified.")
    stdscr.refresh()


def render_detail(stdscr, agent_id: str):
    d = agent_detail(agent_id)
    stdscr.erase()
    h, w = stdscr.getmaxyx()
    if not d:
        add(stdscr, 0, 0, f"Agent not found: {agent_id}", curses.A_BOLD)
        add(stdscr, h - 1, 0, "q: close")
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


def general_ui(stdscr, view: str):
    """Single-window UI with numeric navigation and stable refreshes."""
    curses.curs_set(0)
    stdscr.nodelay(True)
    stdscr.timeout(int(REFRESH_SECONDS * 1000))
    selected = 0
    view_meta = {
        "dashboard": ("DASHBOARD", "agents, GitHub, gateway and Git"),
        "agents": ("AGENTS", "local runtime database"),
        "github": ("GITHUB RUNNER / ACTIONS", "GitHub runner and job status"),
        "runtime": ("GATEWAY / RUNTIME", "gateway and runtime database"),
        "worktrees": ("GIT / WORKTREES", "canonical checkout and worktrees"),
        "logs": ("LOGS", "agent and GitHub runner logs"),
    }
    shortcuts = {
        ord("1"): "dashboard",
        ord("2"): "agents",
        ord("3"): "github",
        ord("4"): "runtime",
        ord("5"): "worktrees",
        ord("6"): "logs",
    }

    loading_frame(stdscr, *view_meta[view])
    while True:
        agents = None
        if view == "dashboard":
            render_dashboard(stdscr)
        elif view == "agents":
            agents, selected = render_agents(stdscr, selected)
        elif view == "github":
            render_github(stdscr)
        elif view == "runtime":
            render_runtime(stdscr)
        elif view == "worktrees":
            render_worktrees(stdscr)
        elif view == "logs":
            render_logs(stdscr)

        key = stdscr.getch()
        if key in (ord("q"), ord("Q"), 27, 3):
            return
        if key in shortcuts:
            next_view = shortcuts[key]
            if next_view != view:
                view = next_view
                selected = 0
                _CACHE.clear()
                loading_frame(stdscr, *view_meta[view])
            continue
        if view == "agents" and agents:
            if key in (curses.KEY_DOWN, ord("j")):
                selected = min(len(agents) - 1, selected + 1)
            elif key in (curses.KEY_UP, ord("k")):
                selected = max(0, selected - 1)
            elif key in (10, 13):
                detail_ui(stdscr, agents[selected]["id"])
                loading_frame(stdscr, *view_meta[view])

def detail_ui(stdscr, agent_id: str):
    curses.curs_set(0)
    stdscr.nodelay(True)
    stdscr.timeout(int(REFRESH_SECONDS * 1000))
    while True:
        render_detail(stdscr, agent_id)
        key = stdscr.getch()
        if key in (ord("q"), ord("Q"), 27, 3):
            return


def plain(view: str):
    if view == "dashboard":
        s = full_snapshot()
        agents = s["agents"]
        gh = s["github"]
        gate = s["gateway"]
        git = s["git"]
        print("GOVA LOCAL EXECUTION MONITOR")
        print(f"gateway={'OK' if (gate.get('health') or {}).get('ok') else 'DOWN'} service={gate.get('service')}")
        print(f"agents={len(agents)} executing={sum(1 for a in agents if a.get('effective_status') == 'executing')}")
        print(f"github_runners={len(gh.get('runners', []))} active_jobs={len(gh.get('jobs', []))} runner_processes={len(gh.get('runner_processes', []))}")
        print(f"branch={git.get('canonical',{}).get('branch') or '-'} head={git.get('canonical',{}).get('head') or '-'} worktrees={len(git.get('worktrees', []))}")
    elif view == "agents":
        for i, a in enumerate(agents_snapshot()):
            t = a.get("task") or {}
            print(f"{i+1:>2}. [{a['kind'].upper():5}] {a['effective_status']:<11} {a['id']} task={t.get('id') or '-'} branch={a.get('branch') or t.get('branch') or '-'}")
    else:
        data = {
            "github": github_snapshot,
            "runtime": lambda: {"gateway": gateway_snapshot(), **runtime_snapshot()},
            "worktrees": git_snapshot,
            "logs": lambda: {"runtime": runtime_snapshot(), "runner_log": runner_log_tail()},
        }[view]()
        print(json.dumps(data, indent=2, ensure_ascii=False, default=str))


def main():
    ap = argparse.ArgumentParser(prog="gova-agent-monitor")
    ap.add_argument("--agent")
    ap.add_argument("--view", choices=("dashboard", "agents", "github", "runtime", "worktrees", "logs"), default="dashboard")
    ap.add_argument("--workspace", action="store_true", help="Open the complete monitor as multiple terminal windows.")
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    if args.workspace:
        open_workspace()
        return
    if args.json:
        if args.agent:
            data = agent_detail(args.agent)
        elif args.view == "dashboard":
            data = full_snapshot()
        else:
            data = {
                "agents": agents_snapshot,
                "github": github_snapshot,
                "runtime": lambda: {"gateway": gateway_snapshot(), **runtime_snapshot()},
                "worktrees": git_snapshot,
                "logs": lambda: {"runtime": runtime_snapshot(), "runner_log": runner_log_tail()},
            }[args.view]()
        print(json.dumps(data, indent=2, ensure_ascii=False, default=str))
        return
    if args.once or not sys.stdout.isatty():
        if args.agent:
            print(json.dumps(agent_detail(args.agent), indent=2, ensure_ascii=False, default=str))
        else:
            plain(args.view)
        return
    if args.agent:
        curses.wrapper(lambda s: detail_ui(s, args.agent))
    else:
        curses.wrapper(lambda s: general_ui(s, args.view))


if __name__ == "__main__":
    main()
