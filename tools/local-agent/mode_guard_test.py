#!/usr/bin/env python3
"""Focused, offline contract test for Gateway execution modes."""
import importlib.util
import os
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

    c = gateway.db()
    c.execute("INSERT INTO tasks(id,goal,execution_mode,originating_agent,current_agent,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
              ('mode-a', 'test', 'A', 'agent', 'agent', 'active', gateway.now(), gateway.now()))
    c.execute("INSERT INTO tasks(id,goal,execution_mode,originating_agent,current_agent,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
              ('mode-b', 'test', 'B', 'agent', 'agent', 'active', gateway.now(), gateway.now()))
    c.close()

    try:
        gateway.require_task_mode('mode-b')
        raise AssertionError('Mode B was accepted for a Gateway mutation')
    except RuntimeError as error:
        assert 'Mode A' in str(error)

    dry = gateway.dispatch_mode_a_bootstrap('agent', 'mode-a', dry_run=True)
    assert dry == {'task_id': 'mode-a', 'workflow': 'local-agent-bootstrap.yml', 'ref': 'main', 'dry_run': True}

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

print('local-agent mode guard: PASS')
