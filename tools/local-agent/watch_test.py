#!/usr/bin/env python3
"""Offline contract test for the integration watcher's decisions."""
import importlib.util
import os
import tempfile
from pathlib import Path

with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    os.environ.update({'GOVA_AGENT_REPO': str(root), 'GOVA_AGENT_PROJECTION_LOGS': str(root / 'state')})
    spec = importlib.util.spec_from_file_location('watch_under_test', Path(__file__).with_name('project_watch.py'))
    watch = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(watch)

    marked = 'hok_ fix the seller card fallback'
    sha = 'a' * 40

    # The marker is the opt-in. Nothing else on integration is touched.
    assert watch.decide(sha, marked, set(), set(), False) == (True, None)
    ok, reason = watch.decide(sha, 'fix the seller card fallback', set(), set(), False)
    assert ok is False and 'not marked' in reason
    ok, reason = watch.decide(sha, 'HOK_ uppercase is not the marker', set(), set(), False)
    assert ok is False and 'not marked' in reason

    # One attempt per head, whichever trigger handled it.
    assert watch.decide(sha, marked, {sha}, set(), False) == (False, None)
    ok, reason = watch.decide(sha, marked, set(), {sha}, False)
    assert ok is False and 'already projected' in reason

    # An alignment commit carries no work of its own.
    ok, reason = watch.decide(sha, marked, set(), set(), True)
    assert ok is False and 'already contained in main' in reason

    # Identity: the commit's trailers win, and the marker is not part of the goal.
    agent, task, goal = watch.identity(sha, marked, f'{marked}\n\nGova-Agent: cloud-7\nGova-Task: seller-card-phone\n')
    assert (agent, task, goal) == ('cloud-7', 'seller-card-phone', 'fix the seller card fallback')

    agent, task, goal = watch.identity(sha, marked, marked)
    assert (agent, task, goal) == ('cloud-auto', f'integration-{sha[:8]}', 'fix the seller card fallback')

    # A marker with nothing after it still yields a usable goal.
    agent, task, goal = watch.identity(sha, 'hok_', 'hok_')
    assert goal == f'integration commit {sha[:8]}'

    # Handled SHAs survive across ticks through the state file.
    assert watch.read_handled() == set()
    watch.remember(sha)
    assert watch.read_handled() == {sha}

    # A full tick against a real repository: the marked head is picked up once,
    # the projection command receives the identity, and the next tick is silent.
    import subprocess

    def git_in(path, *args):
        return subprocess.run(['git', *args], cwd=str(path), text=True, capture_output=True, check=True).stdout.strip()

    work = root / 'work'
    origin = root / 'origin.git'
    work.mkdir()
    subprocess.run(['git', 'init', '--bare', '-b', 'main', str(origin)], check=True, capture_output=True)
    git_in(work, 'init', '-b', 'main')
    git_in(work, 'config', 'user.name', 'Watcher Test')
    git_in(work, 'config', 'user.email', 'watcher@example.test')
    (work / 'file.txt').write_text('base\n')
    git_in(work, 'add', 'file.txt')
    git_in(work, 'commit', '-m', 'base')
    git_in(work, 'remote', 'add', 'origin', str(origin))
    git_in(work, 'push', '-q', 'origin', 'main')
    git_in(work, 'checkout', '-b', 'integration')
    (work / 'file.txt').write_text('cloud work\n')
    git_in(work, 'commit', '-am', 'hok_ deliver the cloud task\n\nGova-Agent: cloud-9\nGova-Task: watched-task\n')
    head = git_in(work, 'rev-parse', 'HEAD')
    git_in(work, 'push', '-q', 'origin', 'integration')
    git_in(work, 'checkout', 'main')

    stub = root / 'stub-project.sh'
    receipt = root / 'receipt.env'
    stub.write_text(f'#!/usr/bin/env bash\nprintf "%s\\n" "$AGENT_ID" "$TASK_ID" "$TASK_GOAL" "$INTEGRATION_SHA" > {receipt}\n')
    stub.chmod(0o755)

    watch.REPO = work
    watch.PROJECT_SCRIPT = stub
    watch.gateway_projected_shas = lambda: set()

    assert watch.tick() == 0
    assert receipt.read_text().split('\n')[:4] == ['cloud-9', 'watched-task', 'deliver the cloud task', head]
    assert head in watch.read_handled()

    # Nothing is ever picked up twice: the second tick does not run the projection.
    receipt.unlink()
    assert watch.tick() == 0
    assert not receipt.exists()

print('local-agent integration watcher: PASS')
