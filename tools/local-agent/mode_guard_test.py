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

    c = gateway.db()
    c.execute("INSERT INTO tasks(id,goal,execution_mode,execution_transport,originating_agent,current_agent,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
              ('mode-a', 'test', 'A', 'local', 'agent', 'agent', 'active', gateway.now(), gateway.now()))
    c.execute("INSERT INTO tasks(id,goal,execution_mode,execution_transport,originating_agent,current_agent,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
              ('mode-b', 'test', 'B', 'local', 'agent', 'agent', 'active', gateway.now(), gateway.now()))
    c.execute("INSERT INTO tasks(id,goal,execution_mode,execution_transport,originating_agent,current_agent,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
              ('mode-b-cloud', 'test', 'B', 'cloud-bridge', 'agent', 'agent', 'active', gateway.now(), gateway.now()))
    c.close()

    try:
        gateway.require_task_mode('mode-b')
        raise AssertionError('Mode B was accepted for a Gateway mutation')
    except RuntimeError as error:
        assert 'Mode A' in str(error)

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

print('local-agent mode guard: PASS')
