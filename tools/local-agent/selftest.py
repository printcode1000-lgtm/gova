#!/usr/bin/env python3
import argparse
import concurrent.futures
import json
import os
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

BASE = os.environ.get('GOVA_AGENT_URL', 'http://127.0.0.1:8765').rstrip('/')
AUTH_FILE = Path(os.environ.get('GOVA_AGENT_AUTH_FILE', '/home/hesham/.config/gova-agent/auth'))
REPO = Path(os.environ.get('GOVA_AGENT_REPO', '/home/hesham/gova')).resolve()
WORKTREE_ROOT = Path(os.environ.get('GOVA_AGENT_WORKTREES', '/home/hesham/gova-agents')).resolve()
INTEGRATION_WT = WORKTREE_ROOT / 'integration'


def auth_key():
    return AUTH_FILE.read_text().strip()


def call(method, path, data=None, expect=(200,)):
    raw = None if data is None else json.dumps(data).encode()
    headers = {'Accept': 'application/json'}
    if path != '/health':
        headers['X-Gova-Agent-Key'] = auth_key()
    if raw is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(BASE + path, data=raw, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = json.loads(r.read() or b'{}')
            status = r.status
    except urllib.error.HTTPError as e:
        status = e.code
        try:
            body = json.loads(e.read() or b'{}')
        except Exception:
            body = {'ok': False, 'error': str(e)}
    if status not in expect:
        raise RuntimeError(f'{method} {path}: expected {expect}, got {status}: {body}')
    return status, body


def git(args, cwd=REPO, check=True):
    cp = subprocess.run(['git', *args], cwd=str(cwd), text=True, capture_output=True)
    if check and cp.returncode:
        raise RuntimeError(f"git {' '.join(args)} failed: {cp.stderr or cp.stdout}")
    return cp


def wait_command(command_id, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        _, body = call('GET', f'/v1/commands/{urllib.parse.quote(command_id)}')
        state = body['command']['status']
        if state != 'running':
            return body['command']
        time.sleep(0.05)
    raise RuntimeError(f'command timeout: {command_id}')


def register(agent):
    return call('POST', '/v1/agent/register', {'agent_id': agent})[1]


def create_task(agent, task, goal):
    return call('POST', '/v1/task/create', {'agent_id': agent, 'task_id': task, 'goal': goal})[1]


def create_workspace(agent, task):
    return call('POST', '/v1/workspace/create', {'agent_id': agent, 'task_id': task})[1]


def start_exec(agent, task, command):
    return call('POST', '/v1/exec/start', {'agent_id': agent, 'task_id': task, 'command': command})[1]


def integration_submit(agent, task, sha, expect=(200,)):
    return call('POST', '/v1/integration/submit', {
        'agent_id': agent,
        'task_id': task,
        'commit_sha': sha,
        'verification': ['git diff --check'],
    }, expect=expect)


def configure_git(worktree):
    git(['config', 'user.name', 'gova-runtime-selftest'], cwd=worktree)
    git(['config', 'user.email', 'gova-runtime-selftest@users.noreply.github.com'], cwd=worktree)


def commit_probe(worktree, probe_rel, text):
    probe = worktree / probe_rel
    probe.parent.mkdir(parents=True, exist_ok=True)
    probe.write_text(text)
    git(['add', '--', str(probe_rel)], cwd=worktree)
    git(['commit', '-m', f'test(local-agent): {text.strip()}'], cwd=worktree)
    return git(['rev-parse', 'HEAD'], cwd=worktree).stdout.strip()


def remove_workspace(agent, task):
    call('POST', '/v1/workspace/remove', {'agent_id': agent, 'task_id': task, 'force': True})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--restart-service', action='store_true')
    args = ap.parse_args()
    tag = uuid.uuid4().hex[:8]
    alpha = f'sim-alpha-{tag}'
    beta = f'sim-beta-{tag}'
    cleaner = f'sim-cleaner-{tag}'
    ta = f'sim-alpha-task-{tag}'
    tb = f'sim-beta-task-{tag}'
    tc = f'sim-clean-task-{tag}'
    probe_rel = Path('tools/local-agent') / f'.selftest-conflict-{tag}.txt'
    results = {}
    workspaces = []

    git(['fetch', '--quiet', 'origin', 'integration'])
    baseline = git(['rev-parse', 'origin/integration']).stdout.strip()
    results['baseline'] = baseline

    register(alpha); register(beta)
    create_task(alpha, ta, 'Adversarial alpha runtime simulation')
    create_task(beta, tb, 'Adversarial beta runtime simulation')
    wa = Path(create_workspace(alpha, ta)['worktree'])
    wb = Path(create_workspace(beta, tb)['worktree'])
    workspaces += [(alpha, ta), (beta, tb)]
    if wa == wb:
        raise RuntimeError('workspace isolation failed: identical paths')
    if git(['rev-parse', 'HEAD'], cwd=wa).stdout.strip() != baseline:
        raise RuntimeError('alpha workspace did not start from integration baseline')
    if git(['rev-parse', 'HEAD'], cwd=wb).stdout.strip() != baseline:
        raise RuntimeError('beta workspace did not start from integration baseline')
    results['isolated_worktrees_from_integration'] = 'pass'

    ca = start_exec(alpha, ta, "printf alpha > .agent-alpha; sleep 0.25; test ! -e ../sim-beta-marker; printf alpha-ok")['command_id']
    cb = start_exec(beta, tb, "printf beta > .agent-beta; sleep 0.25; printf beta-ok")['command_id']
    sa = wait_command(ca); sb = wait_command(cb)
    if sa['exit_code'] != 0 or sb['exit_code'] != 0:
        raise RuntimeError('parallel command execution failed')
    _, la = call('GET', f'/v1/commands/{ca}/logs')
    _, lb = call('GET', f'/v1/commands/{cb}/logs')
    if 'alpha-ok' not in la['stdout'] or 'beta-ok' not in lb['stdout']:
        raise RuntimeError('parallel command logs missing expected output')
    results['parallel_exec_and_logs'] = 'pass'

    def send_message(i):
        sender = alpha if i % 2 == 0 else beta
        recipient = beta if i % 2 == 0 else alpha
        return call('POST', '/v1/message/send', {
            'sender': sender, 'recipient': recipient, 'kind': 'stress', 'body': f'{tag}:{i}'
        })[1]
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        sent = list(ex.map(send_message, range(30)))
    if len(sent) != 30:
        raise RuntimeError('message concurrency lost writes')
    _, mb = call('GET', '/v1/messages?recipient=' + urllib.parse.quote(beta))
    if not any(tag in m['body'] for m in mb['messages']):
        raise RuntimeError('agent messaging not observable by recipient')
    results['concurrent_messages'] = 'pass'

    scope = f'selftest/{tag}'
    call('POST', '/v1/lock/acquire', {'agent_id': alpha, 'task_id': ta, 'kind': 'path', 'scope': scope, 'lease_seconds': 5})
    status, _ = call('POST', '/v1/lock/acquire', {'agent_id': beta, 'task_id': tb, 'kind': 'path', 'scope': scope, 'lease_seconds': 5}, expect=(500, 409))
    if status not in (409, 500):
        raise RuntimeError('lock conflict was not rejected')
    call('POST', '/v1/lock/release', {'agent_id': alpha, 'kind': 'path', 'scope': scope})
    call('POST', '/v1/lock/acquire', {'agent_id': beta, 'task_id': tb, 'kind': 'path', 'scope': scope, 'lease_seconds': 1})
    time.sleep(1.15)
    _, recovered = call('POST', '/v1/lock/recover', {})
    if recovered['recovered'] < 1:
        raise RuntimeError('stale lock recovery did not recover expired lease')
    results['lock_conflict_and_stale_recovery'] = 'pass'

    call('POST', '/v1/task/checkpoint', {'agent_id': alpha, 'task_id': ta, 'fields': {'completed': ['parallel-exec', 'messages', 'locks'], 'next_action': 'handoff-to-beta'}})
    call('POST', '/v1/task/handoff', {'task_id': ta, 'from_agent': alpha, 'to_agent': beta, 'notes': f'selftest-handoff-{tag}'})
    _, task_after_handoff = call('GET', '/v1/tasks/' + urllib.parse.quote(ta))
    if task_after_handoff['task']['current_agent'] != beta:
        raise RuntimeError('handoff ownership did not transfer')
    results['checkpoint_and_handoff'] = 'pass'

    if args.restart_service:
        subprocess.run(['bash', str(INTEGRATION_WT / 'tools/local-agent/install.sh')], check=True)
        deadline = time.time() + 10
        while True:
            try:
                call('GET', '/health')
                break
            except Exception:
                if time.time() > deadline:
                    raise RuntimeError('gateway did not recover after restart')
                time.sleep(0.1)
        _, persisted = call('GET', '/v1/tasks/' + urllib.parse.quote(ta))
        if persisted['task']['current_agent'] != beta or f'selftest-handoff-{tag}' not in (persisted['task']['handoff'] or ''):
            raise RuntimeError('checkpoint/handoff did not persist through service restart')
        results['restart_persistence'] = 'pass'

    long_cmd = start_exec(beta, tb, 'sleep 30')['command_id']
    time.sleep(0.15)
    call('POST', '/v1/exec/cancel', {'command_id': long_cmd})
    cancelled = wait_command(long_cmd)
    if cancelled['status'] != 'cancelled':
        raise RuntimeError(f'cancel failed: {cancelled}')
    results['command_cancel'] = 'pass'

    for wt in (wa, wb):
        git(['clean', '-fd'], cwd=wt)
        configure_git(wt)
    sha_a = commit_probe(wa, probe_rel, f'alpha-conflict-{tag}\n')
    sha_b = commit_probe(wb, probe_rel, f'beta-conflict-{tag}\n')
    _, first_submit = integration_submit(alpha, ta, sha_a)
    first_integration_sha = first_submit['integration_sha']
    status, second_submit = integration_submit(beta, tb, sha_b, expect=(409,))
    if status != 409 or 'conflict' not in second_submit.get('error', '').lower():
        raise RuntimeError(f'expected deterministic integration conflict, got: {second_submit}')
    git(['fetch', '--quiet', 'origin', 'integration'])
    remote_after_conflict = git(['rev-parse', 'origin/integration']).stdout.strip()
    integration_head = git(['rev-parse', 'HEAD'], cwd=INTEGRATION_WT).stdout.strip()
    integration_dirty = git(['status', '--porcelain'], cwd=INTEGRATION_WT).stdout.strip()
    if integration_head != remote_after_conflict or integration_dirty:
        raise RuntimeError('integration worktree was not restored cleanly after conflict')
    results['conflict_recovery_clean'] = 'pass'

    register(cleaner)
    create_task(cleaner, tc, 'Clean adversarial integration probe')
    wc = Path(create_workspace(cleaner, tc)['worktree'])
    workspaces.append((cleaner, tc))
    if git(['rev-parse', 'HEAD'], cwd=wc).stdout.strip() != remote_after_conflict:
        raise RuntimeError('new worktree did not see latest integration after submit')
    configure_git(wc)
    target = wc / probe_rel
    if not target.exists():
        raise RuntimeError('cleanup probe missing from latest integration baseline')
    target.unlink()
    git(['add', '-u', '--', str(probe_rel)], cwd=wc)
    git(['commit', '-m', 'test(local-agent): clean adversarial integration probe'], cwd=wc)
    cleanup_sha = git(['rev-parse', 'HEAD'], cwd=wc).stdout.strip()
    _, cleanup_submit = integration_submit(cleaner, tc, cleanup_sha)
    results['integration_submit_and_cleanup'] = {
        'first_submit': first_integration_sha,
        'cleanup_submit': cleanup_submit['integration_sha'],
    }

    call('POST', '/v1/task/complete', {'task_id': ta, 'agent_id': beta, 'completed': 'adversarial handoff completed'})
    call('POST', '/v1/task/complete', {'task_id': tb, 'agent_id': beta, 'completed': 'conflict path verified'})
    call('POST', '/v1/task/complete', {'task_id': tc, 'agent_id': cleaner, 'completed': 'probe cleanup integrated'})
    for agent, task in reversed(workspaces):
        remove_workspace(agent, task)
    _, locks = call('GET', '/v1/locks')
    active_selftest_locks = [x for x in locks['locks'] if tag in x.get('scope', '')]
    if active_selftest_locks:
        raise RuntimeError(f'selftest locks leaked: {active_selftest_locks}')
    results['cleanup_no_lock_leaks'] = 'pass'

    print(json.dumps({'ok': True, 'tag': tag, 'results': results}, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
