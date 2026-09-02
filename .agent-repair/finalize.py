#!/usr/bin/env python3
import importlib.util
import json
import os
import shutil
import sqlite3
import subprocess
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path('/home/hesham/gova-agents/integration')
RUNTIME = Path('/home/hesham/.local/share/gova-agent-runtime')
AUTH = Path('/home/hesham/.config/gova-agent/auth')
MAIN_EXPECTED = 'ab397604565639446504130501aece8ddbd67aec'
FINAL_WORKFLOW = """name: local-agent-bootstrap
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  bootstrap:
    runs-on: [self-hosted, Linux, X64, gova]
    timeout-minutes: 15
    steps:
      - name: Install persistent local-agent gateway
        shell: bash
        run: |
          set -euo pipefail
          git -C /home/hesham/gova fetch --quiet origin integration
          mkdir -p /home/hesham/gova-agents
          if [ ! -e /home/hesham/gova-agents/integration/.git ]; then
            git -C /home/hesham/gova worktree add /home/hesham/gova-agents/integration integration
          fi
          git -C /home/hesham/gova-agents/integration checkout integration
          git -C /home/hesham/gova-agents/integration reset --hard origin/integration
          bash /home/hesham/gova-agents/integration/tools/local-agent/install.sh
"""

def now():
    return datetime.now(timezone.utc).isoformat()

def run(args, cwd=ROOT, check=True, env=None):
    cp = subprocess.run(args, cwd=str(cwd), text=True, capture_output=True, env=env)
    if check and cp.returncode:
        raise RuntimeError(f"command failed ({cp.returncode}): {' '.join(args)}\n{cp.stderr or cp.stdout}")
    return cp

def phase(name, detail='ok'):
    print(f'PHASE {name}: {detail}', flush=True)

def load_gateway():
    spec = importlib.util.spec_from_file_location('gova_gateway_repair', ROOT/'tools/local-agent/gateway.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def http(method, path, data=None, timeout=30):
    raw = None if data is None else json.dumps(data).encode()
    headers = {'X-Gova-Agent-Key': AUTH.read_text().strip(), 'Content-Type': 'application/json'}
    req = urllib.request.Request('http://127.0.0.1:8765'+path, data=raw, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read()
            obj = json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors='replace')
        raise RuntimeError(f'gateway {method} {path} failed: {e.code} {body}')
    if not obj.get('ok', True):
        raise RuntimeError(f'gateway {method} {path} failed: {obj}')
    return obj

def wait_health():
    last = None
    for _ in range(30):
        try:
            with urllib.request.urlopen('http://127.0.0.1:8765/health', timeout=2) as r:
                obj = json.loads(r.read())
                if obj.get('ok'):
                    return obj
        except Exception as e:
            last = e
        time.sleep(.25)
    raise RuntimeError(f'gateway health did not recover after restart: {last}')

def wait_command(cid, timeout=30):
    end = time.time() + timeout
    while time.time() < end:
        d = http('GET', '/v1/commands/'+cid).get('command')
        if d and d.get('status') != 'running':
            return d
        time.sleep(.1)
    raise RuntimeError(f'command timeout: {cid}')

result = {'started_at': now(), 'main_expected': MAIN_EXPECTED, 'tests': {}, 'latency_ms': {}}

# Restore the permanent manual-only bootstrap and erase this one-shot recovery payload.
(ROOT/'.github/workflows/local-agent-bootstrap.yml').write_text(FINAL_WORKFLOW, encoding='utf8')
shutil.rmtree(ROOT/'.agent-repair', ignore_errors=True)
run(['git','config','user.name','gova-local-agent'])
run(['git','config','user.email','gova-local-agent@users.noreply.github.com'])

doc = ROOT/'docs/09-agent-knowledge/local-agent-runtime.md'
text = doc.read_text(encoding='utf8')
line = '- Reinstalling the gateway always restarts the systemd service so the running process loads the newly installed runtime code.'
if line not in text:
    doc.write_text(text.rstrip() + '\n' + line + '\n', encoding='utf8')

env = {**os.environ, 'DOCS_CONTRACT_CHANGE':'1', 'PYTHONDONTWRITEBYTECODE':'1'}
for cmd in (['npm','run','github:ci-policy'], ['npm','run','architecture:check'], ['npm','run','docs:ci']):
    run(cmd, env=env)
    result['tests'][' '.join(cmd)] = 'pass'
phase('repository-checks-before-restart')

run(['git','add','-A'])
if run(['git','status','--porcelain']).stdout.strip():
    run(['git','commit','-m','fix(local-agent): restart installed gateway runtime [docs-contract-change]'])
gw = load_gateway()
source_fix_sha = gw.publish_worktree_branch_api(ROOT, 'integration')
result['source_fix_sha'] = source_fix_sha
phase('source-fix-published', source_fix_sha)

# The fixed installer must restart an already-active service and load current code.
run(['bash','tools/local-agent/install.sh'])
health = wait_health()
result['service_pid_after_restart'] = health.get('pid')
service = run(['systemctl','is-active','gova-agent-gateway.service'], check=False).stdout.strip()
if service != 'active':
    service = run(['systemctl','--user','is-active','gova-agent-gateway.service'], check=False).stdout.strip()
if service != 'active':
    raise RuntimeError('gova-agent-gateway.service is not active after reinstall')
installed = Path('/home/hesham/.local/lib/gova-agent/gateway.py').read_text(encoding='utf8')
if "sha=publish_worktree_branch_api(iw,'integration')" not in installed:
    raise RuntimeError('installed gateway does not contain API integration publisher')
if 'git_remote' in installed and "git','push" in installed:
    raise RuntimeError('installed gateway still contains legacy integration git-push path')
result['tests']['service-restarted-with-current-runtime'] = 'pass'
phase('service-restarted-with-current-runtime', str(health.get('pid')))

# A direct command must not create a GitHub Actions run.
gw = load_gateway()
_, before = gw._github_api('GET','/actions/runs?per_page=1')
count_before = int(before.get('total_count',0))
aid = 'final-audit'
http('POST','/v1/agent/register',{'agent_id':aid})
t0 = time.perf_counter()
ex = http('POST','/v1/exec/start',{'agent_id':aid,'command':'printf direct-channel-ok','cwd':str(ROOT)})
done = wait_command(ex['command_id'])
logs = http('GET','/v1/commands/'+ex['command_id']+'/logs')
result['latency_ms']['direct_command'] = round((time.perf_counter()-t0)*1000,3)
if done.get('exit_code') != 0 or 'direct-channel-ok' not in logs.get('stdout',''):
    raise RuntimeError('direct gateway command proof failed')
time.sleep(1)
_, after = gw._github_api('GET','/actions/runs?per_page=1')
count_after = int(after.get('total_count',0))
if count_after != count_before:
    raise RuntimeError(f'direct gateway command created GitHub Actions run: {count_before}->{count_after}')
result['tests']['direct-command-no-github-job'] = f'pass actions={count_before}'
phase('direct-command-no-github-job')

# Real local task -> worktree commit -> HTTP integration-submit -> GitHub API publication.
task_id = 'final-integration-submit-v2'
try:
    http('POST','/v1/task/create',{'agent_id':aid,'task_id':task_id,'goal':'Final API-backed integration-submit proof'})
except Exception:
    pass
ws = http('POST','/v1/workspace/create',{'agent_id':aid,'task_id':task_id})
worktree = Path(ws['worktree'])
proof = worktree/'.agent-proof/integration-submit.txt'
proof.parent.mkdir(parents=True, exist_ok=True)
proof.write_text('persistent integration-submit proof\n', encoding='utf8')
cmd = "git config user.name gova-local-agent && git config user.email gova-local-agent@users.noreply.github.com && git add .agent-proof/integration-submit.txt && git commit -m 'test(local-agent): prove API integration submit' && git rev-parse HEAD"
ex = http('POST','/v1/exec/start',{'agent_id':aid,'task_id':task_id,'command':cmd})
done = wait_command(ex['command_id'])
logs = http('GET','/v1/commands/'+ex['command_id']+'/logs')
if done.get('exit_code') != 0:
    raise RuntimeError('could not create integration proof commit: '+logs.get('stderr',''))
commit_sha = logs['stdout'].strip().splitlines()[-1]
_, actions_before_submit = gw._github_api('GET','/actions/runs?per_page=1')
action_count_before_submit = int(actions_before_submit.get('total_count',0))
t0 = time.perf_counter()
submitted = http('POST','/v1/integration/submit',{
    'agent_id':aid,
    'task_id':task_id,
    'commit_sha':commit_sha,
    'verification':["python3 -c \"compile(open('tools/local-agent/gateway.py').read(), 'gateway.py', 'exec')\""],
}, timeout=60)
result['latency_ms']['integration_submit'] = round((time.perf_counter()-t0)*1000,3)
proof_sha = submitted['integration_sha']
_, remote = gw._github_api('GET','/branches/integration')
if remote['commit']['sha'] != proof_sha:
    raise RuntimeError('integration-submit result does not match remote integration')
time.sleep(1)
_, actions_after_submit = gw._github_api('GET','/actions/runs?per_page=1')
if int(actions_after_submit.get('total_count',0)) != action_count_before_submit:
    raise RuntimeError('integration-submit unexpectedly created a GitHub Actions run')
result['integration_submit_sha'] = proof_sha
result['tests']['http-integration-submit'] = 'pass'
result['tests']['integration-submit-no-github-job'] = f'pass actions={action_count_before_submit}'
http('POST','/v1/task/complete',{'agent_id':aid,'task_id':task_id,'completed':'API-backed integration-submit proof passed'})
http('POST','/v1/workspace/remove',{'agent_id':aid,'task_id':task_id,'force':True})
phase('http-integration-submit-proved', proof_sha)

# Exact branch/ruleset/main invariants and server-side third-branch rejection.
_, branches = gw._github_api('GET','/branches?per_page=100')
names = sorted(b['name'] for b in branches)
if names != ['integration','main']:
    raise RuntimeError(f'unexpected remote branches: {names}')
_, main = gw._github_api('GET','/branches/main')
if main['commit']['sha'] != MAIN_EXPECTED:
    raise RuntimeError(f'main changed: {main["commit"]["sha"]}')
_, ruleset = gw._github_api('GET','/rulesets/21193774')
excludes = sorted(ruleset.get('conditions',{}).get('ref_name',{}).get('exclude',[]))
if excludes != ['refs/heads/integration','refs/heads/main']:
    raise RuntimeError(f'ruleset exclusions wrong: {excludes}')
probe = 'refs/heads/forbidden-final-probe'
status, _ = gw._github_api('POST','/git/refs',{'ref':probe,'sha':MAIN_EXPECTED},allow=(403,422))
if status not in (403,422):
    try:
        gw._github_api('DELETE','/git/refs/heads/forbidden-final-probe')
    finally:
        raise RuntimeError(f'third branch creation unexpectedly succeeded: {status}')
result['tests']['exact-two-remote-branches'] = 'pass'
result['tests']['third-branch-blocked'] = f'pass status={status}'
result['tests']['main-unchanged'] = MAIN_EXPECTED
result['tests']['ruleset-main-integration-only'] = 'pass'
phase('github-invariants-proved')

# Durable migration checkpoint/handoff for any equal-capability future agent.
con = sqlite3.connect(RUNTIME/'runtime.sqlite3')
ts = now()
tid = 'local-runner-migration-20260902'
goal = 'Persistent local agent runtime migration: direct gateway, isolated local worktrees, shared resumable state, integration-only remote delivery.'
completed = f'Completed and verified. Direct commands create no GitHub jobs; service restart loads current runtime; API integration-submit passed at {proof_sha}; remote branches are exactly main+integration; main stayed {MAIN_EXPECTED}.'
handoff = 'Migration is complete. Future agents should use gova-agent-gateway directly; use local task worktrees and /v1/integration/submit; GitHub local-agent-bootstrap is recovery/install only.'
con.execute("""INSERT INTO tasks(id,goal,originating_agent,current_agent,status,completed,remaining,next_action,handoff,created_at,updated_at)
VALUES(?,?,?,?,?,?,?,?,?,?,?)
ON CONFLICT(id) DO UPDATE SET current_agent=excluded.current_agent,status=excluded.status,completed=excluded.completed,remaining=excluded.remaining,next_action=excluded.next_action,handoff=excluded.handoff,updated_at=excluded.updated_at""",
            (tid,goal,'chatgpt','any-agent','completed',completed,'','',handoff,ts,ts))
con.commit()
con.close()
result['tests']['persistent-checkpoint-handoff'] = 'pass'
phase('persistent-checkpoint-handoff-written')

# Remove the proof artifact, record evidence, revalidate, and publish the durable final integration state.
run(['git','fetch','--quiet','origin','integration'])
run(['git','reset','--hard','origin/integration'])
shutil.rmtree(ROOT/'.agent-proof', ignore_errors=True)
doc = ROOT/'docs/09-agent-knowledge/local-agent-runtime.md'
text = doc.read_text(encoding='utf8')
marker = '\n## Final Verification Evidence\n'
if marker in text:
    text = text.split(marker,1)[0].rstrip() + '\n'
evidence = {
    'verified_at': now(),
    'main_sha': MAIN_EXPECTED,
    'integration_submit_sha': proof_sha,
    'tests': result['tests'],
    'latency_ms': result['latency_ms'],
}
text = text.rstrip() + marker + '\n```json\n' + json.dumps(evidence, indent=2, ensure_ascii=False) + '\n```\n'
doc.write_text(text, encoding='utf8')
run(['npm','run','docs:generate'], env=env)
for cmd in (['npm','run','github:ci-policy'], ['npm','run','architecture:check'], ['npm','run','docs:ci']):
    run(cmd, env=env)
run(['git','add','-A'])
run(['git','commit','-m','docs(local-agent): record completed persistent runtime verification [docs-contract-change]'])
final_sha = gw.publish_worktree_branch_api(ROOT,'integration')
result['final_integration_sha'] = final_sha
result['finished_at'] = now()
result['remote_branches'] = ['main','integration']
result['main_sha'] = MAIN_EXPECTED
RUNTIME.mkdir(parents=True, exist_ok=True)
(RUNTIME/'final-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
phase('complete', final_sha)
print(json.dumps(result,ensure_ascii=False,indent=2))
