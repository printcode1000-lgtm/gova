#!/usr/bin/env python3
"""Focused, offline contract test for Gateway execution modes."""
import importlib.util
import os
import subprocess
import tempfile
from pathlib import Path


with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    os.environ.update({
        'GOVA_AGENT_RUNTIME': str(root / 'runtime'),
        'GOVA_AGENT_WORKTREES': str(root / 'worktrees'),
        'GOVA_AGENT_REPO': str(root),
        'GOVA_AGENT_AUTH_FILE': str(root / 'auth'),
    })
    spec = importlib.util.spec_from_file_location('gateway_under_test', Path(__file__).with_name('gateway.py'))
    gateway = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gateway)

    def git(*args):
        return subprocess.run(['git', *args], cwd=root, text=True, capture_output=True, check=True).stdout.strip()

    git('init', '-b', 'main')
    git('config', 'user.name', 'Gateway Test')
    git('config', 'user.email', 'gateway@example.test')
    (root / 'bridge.txt').write_text('base\n')
    git('add', 'bridge.txt')
    git('commit', '-m', 'base')

    assert gateway.resolve_execution_transport('A') == ('A', 'local')
    assert gateway.resolve_execution_transport('B') == ('B', 'local')
    assert gateway.resolve_execution_transport('B', True) == ('B', 'cloud-bridge')
    assert gateway.resolve_execution_transport('C') == ('C', 'remote-desktop-commander')
    try:
        gateway.resolve_execution_transport('C', True)
        raise AssertionError('Mode C accepted the cloud bridge transport')
    except RuntimeError as error:
        assert 'unavailable for execution mode C' in str(error)

    c = gateway.db()
    c.execute("INSERT INTO tasks(id,goal,execution_mode,execution_transport,originating_agent,current_agent,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
              ('mode-a', 'test', 'A', 'local', 'agent', 'agent', 'active', gateway.now(), gateway.now()))
    c.execute("INSERT INTO tasks(id,goal,execution_mode,execution_transport,originating_agent,current_agent,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
              ('mode-b', 'test', 'B', 'local', 'agent', 'agent', 'active', gateway.now(), gateway.now()))
    c.execute("INSERT INTO tasks(id,goal,execution_mode,execution_transport,originating_agent,current_agent,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
              ('mode-b-cloud', 'test', 'B', 'cloud-bridge', 'agent', 'agent', 'active', gateway.now(), gateway.now()))
    c.execute("INSERT INTO tasks(id,goal,execution_mode,execution_transport,originating_agent,current_agent,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
              ('mode-c', 'test', 'C', 'remote-desktop-commander', 'agent', 'agent', 'active', gateway.now(), gateway.now()))
    c.close()

    try:
        gateway.require_task_mode('mode-b')
        raise AssertionError('Mode B was accepted for a Gateway mutation')
    except RuntimeError as error:
        assert 'Mode A' in str(error)

    mode_c = gateway.task_execution('mode-c')
    assert mode_c == ('C', 'remote-desktop-commander')
    for guard in (gateway.require_task_mode, gateway.require_managed_transport):
        try:
            guard('mode-c')
            raise AssertionError('Mode C was accepted for Gateway execution')
        except RuntimeError as error:
            assert 'Remote Desktop Commander' in str(error)

    try:
        gateway.remove_worktree('agent', 'mode-c')
        raise AssertionError('Mode C was accepted for a Gateway workspace mutation')
    except RuntimeError as error:
        assert 'Remote Desktop Commander' in str(error)

    dry = gateway.dispatch_mode_a_bootstrap('agent', 'mode-a', dry_run=True)
    assert dry == {'task_id': 'mode-a', 'workflow': 'local-agent-bootstrap.yml', 'ref': 'main', 'execution_mode': 'A', 'execution_transport': 'local', 'dry_run': True}

    calls = []
    gateway._github_api = lambda method, path, body=None, allow=(): calls.append((method, path, body)) or (204, None)
    dispatched = gateway.dispatch_mode_a_bootstrap('agent', 'mode-a')
    assert dispatched['dispatched'] is True
    assert calls == [('POST', '/actions/workflows/local-agent-bootstrap.yml/dispatches', {'ref': 'main', 'inputs': {'execution_mode': 'A'}})]
    try:
        gateway.dispatch_mode_a_bootstrap('agent', 'mode-a')
        raise AssertionError('A second Mode A bootstrap dispatch was accepted')
    except RuntimeError as error:
        assert 'one-time' in str(error)
    gateway.require_mode_a_bootstrap('mode-a')

    cloud_dry = gateway.dispatch_mode_a_bootstrap('agent', 'mode-b-cloud', dry_run=True)
    assert cloud_dry['execution_mode'] == 'B'
    assert cloud_dry['execution_transport'] == 'cloud-bridge'
    gateway.dispatch_mode_a_bootstrap('agent', 'mode-b-cloud')
    gateway.require_mode_a_bootstrap('mode-b-cloud')

    git('checkout', '-b', 'integration')
    (root / 'bridge.txt').write_text('from cloud bridge\n')
    git('commit', '-am', 'cloud bridge integration')
    integration_sha = git('rev-parse', 'HEAD')
    git('checkout', 'main')
    projected = gateway.project_cloud_bridge_commit('agent', 'mode-b-cloud', integration_sha)
    assert projected == ['bridge.txt']
    assert (root / 'bridge.txt').read_text() == 'from cloud bridge\n'

    git('reset', '--hard', 'main')
    (root / 'bridge.txt').write_text('canonical local change\n')
    try:
        gateway.project_cloud_bridge_commit('agent', 'mode-b-cloud', integration_sha)
        raise AssertionError('Cloud bridge overwrote an overlapping canonical edit')
    except RuntimeError as error:
        assert 'projection conflict' in str(error)
    assert (root / 'bridge.txt').read_text() == 'canonical local change\n'

    # Canonical projection: the cloud Mode-B entry point the self-hosted runner
    # calls. It must accept only a full SHA that is published on
    # origin/integration, and only for a cloud-bridge Mode B task.
    git('reset', '--hard', 'main')
    origin = root / 'origin.git'
    subprocess.run(['git', 'init', '--bare', '-b', 'main', str(origin)], check=True, capture_output=True)
    git('remote', 'add', 'origin', str(origin))
    git('push', '-q', 'origin', 'main', 'integration')

    for bad in ('deadbeef', '', 'g' * 40, integration_sha[:39]):
        try:
            gateway.canonical_project('agent', 'mode-b-cloud', bad)
            raise AssertionError(f'canonical projection accepted a malformed SHA: {bad!r}')
        except RuntimeError as error:
            assert '40-character' in str(error)

    for wrong_task in ('mode-a', 'mode-b'):
        try:
            gateway.canonical_project('agent', wrong_task, integration_sha)
            raise AssertionError(f'canonical projection accepted task {wrong_task}')
        except RuntimeError as error:
            assert 'cloud-bridge Mode B' in str(error)

    git('checkout', '-b', 'unpublished')
    (root / 'bridge.txt').write_text('never published\n')
    git('commit', '-am', 'unpublished work')
    unpublished_sha = git('rev-parse', 'HEAD')
    git('checkout', 'main')
    git('reset', '--hard', 'main')
    try:
        gateway.canonical_project('agent', 'mode-b-cloud', unpublished_sha)
        raise AssertionError('canonical projection accepted a commit that is not on integration')
    except RuntimeError as error:
        assert 'not published on origin/integration' in str(error)
    assert (root / 'bridge.txt').read_text() == 'base\n'

    # An uppercase SHA is the same commit; it is normalized, not rejected.
    sha, projected = gateway.canonical_project('agent', 'mode-b-cloud', integration_sha.upper())
    assert sha == integration_sha
    assert projected == ['bridge.txt']
    assert (root / 'bridge.txt').read_text() == 'from cloud bridge\n'

    # A cloud task described as one commit may still arrive as several. The
    # projection is measured from the fork point with main, so the whole task
    # lands — projecting only the last commit would drop the first file and leave
    # the second one's patch without its context.
    git('reset', '--hard', 'main')
    git('checkout', 'integration')
    (root / 'first.txt').write_text('first commit\n')
    git('add', 'first.txt')
    git('commit', '-m', 'first of two')
    (root / 'bridge.txt').write_text('second commit rewrites the bridge\n')
    git('commit', '-am', 'second of two')
    two_commit_sha = git('rev-parse', 'HEAD')
    git('push', '-q', 'origin', 'integration')
    git('checkout', 'main')
    git('reset', '--hard', 'main')

    _sha, projected = gateway.canonical_project('agent', 'mode-b-cloud', two_commit_sha)
    assert projected == ['bridge.txt', 'first.txt'], projected
    assert (root / 'first.txt').read_text() == 'first commit\n'
    assert (root / 'bridge.txt').read_text() == 'second commit rewrites the bridge\n'

print('local-agent mode guard: PASS')
