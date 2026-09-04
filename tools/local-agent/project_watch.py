#!/usr/bin/env python3
"""Automatic pickup of marked `integration` commits.

Pushing to `integration` projects nothing on its own; the dispatch, or an
operator, has to ask for it. This watcher is the third way to ask: a systemd
timer runs one tick, and a tick projects the branch head when — and only when —
it is work that opted in and has not been handled before.

Two rules keep it from surprising anyone:

* **Opt-in by marker.** Only a head commit whose subject starts with `hok_` is
  picked up. Everything else is left alone, so `integration` stays usable for
  work that is not meant to land on this machine automatically.
* **One attempt per head.** The SHA is recorded as handled *before* the
  projection runs, never after. A failed verification therefore does not
  re-run every tick; it waits for a new commit, which is exactly what the agent
  must produce anyway. Nothing is ever picked up twice.

The watcher only decides *whether* to ask. What happens next — verification,
the fail-closed guards, the reason written onto the task — belongs to
`project.sh` and the Gateway and is identical for all three trigger paths.
"""
import fcntl
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(os.environ.get('GOVA_AGENT_REPO', '/home/hesham/gova'))
STATE = Path(os.environ.get('GOVA_AGENT_PROJECTION_LOGS', '/home/hesham/.local/state/gova-agent-projection'))
PROJECT_SCRIPT = Path(os.environ.get('GOVA_AGENT_PROJECT_SCRIPT', str(REPO / 'tools/local-agent/project.sh')))
BASE = os.environ.get('GOVA_AGENT_URL', 'http://127.0.0.1:8765').rstrip('/')
AUTH_FILE = Path(os.environ.get('GOVA_AGENT_AUTH_FILE', '/home/hesham/.config/gova-agent/auth'))

SEEN_FILE = STATE / 'handled-integration-shas'
LOCK_FILE = STATE / 'watch.lock'
LOG_FILE = STATE / 'watch.log'

MARKER = 'hok_'
SHA_RE = re.compile(r'^[0-9a-f]{40}$')


def log(message):
    STATE.mkdir(parents=True, exist_ok=True)
    line = f'{__import__("datetime").datetime.now().astimezone().isoformat()} {message}\n'
    with LOG_FILE.open('a') as handle:
        handle.write(line)
    print(line.rstrip(), flush=True)


def git(args, check=True):
    cp = subprocess.run(['git', *args], cwd=str(REPO), text=True, capture_output=True)
    if check and cp.returncode:
        raise RuntimeError(f"git {' '.join(args)} failed: {cp.stderr or cp.stdout}")
    return cp


def remote_head():
    """The current `integration` head, read with one ref query rather than a fetch."""
    out = git(['ls-remote', 'origin', 'refs/heads/integration']).stdout.split()
    return out[0] if out and SHA_RE.match(out[0]) else None


def read_handled():
    try:
        return {line.strip() for line in SEEN_FILE.read_text().splitlines() if line.strip()}
    except FileNotFoundError:
        return set()


def remember(sha):
    STATE.mkdir(parents=True, exist_ok=True)
    with SEEN_FILE.open('a') as handle:
        handle.write(sha + '\n')


def gateway_projected_shas():
    """Commits the Gateway already projected, so a dispatch and a tick never collide."""
    try:
        key = AUTH_FILE.read_text().strip()
        request = urllib.request.Request(f'{BASE}/v1/tasks', headers={'X-Gova-Agent-Key': key})
        with urllib.request.urlopen(request, timeout=10) as response:
            tasks = json.loads(response.read() or b'{}').get('tasks', [])
    except Exception:
        return set()
    shas = set()
    for task in tasks:
        if task.get('status') != 'canonical-projected':
            continue
        try:
            shas.update(json.loads(task.get('commits') or '[]'))
        except Exception:
            continue
    return shas


def is_marked(subject):
    return subject.startswith(MARKER)


def trailer(body, name):
    match = re.search(rf'^{re.escape(name)}:\s*(\S.*?)\s*$', body, re.MULTILINE)
    return match.group(1) if match else None


def identity(sha, subject, body):
    """Who the task belongs to: the commit's own trailers, else a derived identity."""
    agent = trailer(body, 'Gova-Agent') or 'cloud-auto'
    task = trailer(body, 'Gova-Task') or f'integration-{sha[:8]}'
    goal = subject[len(MARKER):].strip() if is_marked(subject) else subject
    return agent, task, goal or f'integration commit {sha[:8]}'


def decide(sha, subject, handled, projected, already_on_main):
    """Whether this head should be projected, and the reason when it should not.

    Returns (should_project, reason). Every branch except the first records the
    SHA as handled, so each head is judged exactly once.
    """
    if sha in handled:
        return False, None
    if already_on_main:
        return False, 'no work of its own: head is already contained in main'
    if not is_marked(subject):
        return False, f'not marked for automatic pickup (subject does not start with {MARKER!r})'
    if sha in projected:
        return False, 'already projected through another trigger'
    return True, None


def tick():
    sha = remote_head()
    if not sha:
        log('integration head could not be read')
        return 1
    handled = read_handled()
    if sha in handled:
        return 0

    git(['fetch', '--prune', 'origin', 'main', 'integration'])
    subject = git(['log', '-1', '--format=%s', sha]).stdout.strip()
    body = git(['log', '-1', '--format=%B', sha]).stdout
    already_on_main = git(['merge-base', '--is-ancestor', sha, 'origin/main'], check=False).returncode == 0

    should, reason = decide(sha, subject, handled, gateway_projected_shas(), already_on_main)
    remember(sha)
    if not should:
        log(f'{sha[:8]} skipped: {reason}')
        return 0

    agent, task, goal = identity(sha, subject, body)
    log(f'{sha[:8]} picked up as task {task} for {agent}: {goal}')
    result = subprocess.run(
        ['/bin/bash', str(PROJECT_SCRIPT)],
        cwd=str(REPO),
        text=True,
        capture_output=True,
        env={**os.environ, 'AGENT_ID': agent, 'TASK_ID': task, 'TASK_GOAL': goal, 'INTEGRATION_SHA': sha},
    )
    (STATE / f'{task}.watch.log').write_text(result.stdout + result.stderr)
    if result.returncode:
        log(f'{sha[:8]} refused (exit {result.returncode}); reason recorded on task {task}')
    else:
        log(f'{sha[:8]} projected into the canonical checkout as task {task}')
    return 0


def main():
    STATE.mkdir(parents=True, exist_ok=True)
    with LOCK_FILE.open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return 0  # a previous tick is still verifying; ticks never overlap
        return tick()


if __name__ == '__main__':
    sys.exit(main())
