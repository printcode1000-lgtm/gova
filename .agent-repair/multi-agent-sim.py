#!/usr/bin/env python3
import json
import os
import shutil
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

BASE='http://127.0.0.1:8765'
REPO=Path('/home/hesham/gova')
WT_ROOT=Path('/home/hesham/gova-agents')
INTEGRATION_WT=WT_ROOT/'integration'
AUTH=Path('/home/hesham/.config/gova-agent/auth')
TAG=uuid.uuid4().hex[:8]


def call(method,path,data=None,expect=(200,)):
    raw=None if data is None else json.dumps(data).encode()
    headers={'Accept':'application/json'}
    if path!='/health': headers['X-Gova-Agent-Key']=AUTH.read_text().strip()
    if raw is not None: headers['Content-Type']='application/json'
    req=urllib.request.Request(BASE+path,data=raw,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=30) as r:
            status=r.status; body=json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        status=e.code
        try: body=json.loads(e.read() or b'{}')
        except Exception: body={'error':str(e)}
    if status not in expect: raise RuntimeError(f'{method} {path}: {status} {body}')
    return status,body


def git(args,cwd=REPO,check=True):
    cp=subprocess.run(['git',*args],cwd=str(cwd),text=True,capture_output=True)
    if check and cp.returncode: raise RuntimeError(f"git {' '.join(args)}: {cp.stderr or cp.stdout}")
    return cp


def heads():
    out=git(['ls-remote','--heads','origin']).stdout.splitlines()
    return {line.split('\t')[1].removeprefix('refs/heads/'):line.split('\t')[0] for line in out if '\trefs/heads/' in line}


def wait_health():
    deadline=time.time()+12
    while time.time()<deadline:
        try:
            call('GET','/health'); return
        except Exception:
            time.sleep(.1)
    raise RuntimeError('gateway health timeout')


before=heads()
if set(before)!={'main','integration'}: raise RuntimeError(f'unexpected remote branches before simulation: {before}')
main_before=before['main']
print('PHASE baseline',json.dumps(before),flush=True)

# Create a local-only repair worktree from the actual aggregation branch.
git(['fetch','--quiet','origin','integration'])
repair=WT_ROOT/f'_repair-{TAG}'
branch=f'local-repair/{TAG}'
if repair.exists(): shutil.rmtree(repair,ignore_errors=True)
git(['worktree','add','-b',branch,str(repair),'origin/integration'])
try:
    gateway=repair/'tools/local-agent/gateway.py'
    text=gateway.read_text()
    replacements=[
        ("run(['git','fetch','--prune','origin','main'], REPO)", "run(['git','fetch','--prune','origin','main','integration'], REPO)"),
        ("else: run(['git','worktree','add','-b',branch,str(path),'origin/main'],REPO)", "else: run(['git','worktree','add','-b',branch,str(path),'origin/integration'],REPO)"),
        ("""        if cp.returncode:\n            checkpoint(task_id,status='conflict',next_action='resolve integration cherry-pick conflict')\n            event('integration-conflict',agent_id,task_id,{'stderr':cp.stderr[-2000:]})\n            raise RuntimeError(cp.stderr or cp.stdout)\n""", """        if cp.returncode:\n            run(['git','cherry-pick','--abort'],iw,check=False)\n            run(['git','reset','--hard','origin/integration'],iw,check=False)\n            checkpoint(task_id,status='conflict',next_action='rebase or recreate task commit from latest integration')\n            event('integration-conflict',agent_id,task_id,{'stderr':cp.stderr[-2000:]})\n            raise RuntimeError(cp.stderr or cp.stdout)\n"""),
        ("""            if cp2.returncode:\n                run(['git','cherry-pick','--abort'],iw,check=False)\n                raise RuntimeError(f'verification failed: {cmd}\\n{cp2.stderr or cp2.stdout}')\n""", """            if cp2.returncode:\n                run(['git','reset','--hard','origin/integration'],iw,check=False)\n                checkpoint(task_id,status='verification-failed',next_action='fix verification failure and resubmit from latest integration')\n                raise RuntimeError(f'verification failed: {cmd}\\n{cp2.stderr or cp2.stdout}')\n"""),
    ]
    for old,new in replacements:
        count=text.count(old)
        if count!=1: raise RuntimeError(f'hardening patch anchor count={count}: {old[:100]!r}')
        text=text.replace(old,new)
    gateway.write_text(text)

    doc=repair/'docs/09-agent-knowledge/local-agent-runtime.md'
    d=doc.read_text()
    addition="""

## Multi-agent hardening

- New agent task worktrees start from the latest `origin/integration`, not `main`, so every new agent sees previously integrated work.
- A failed integration cherry-pick is aborted and the shared integration worktree is hard-reset to `origin/integration` before the lock is released.
- A failed post-cherry-pick verification also resets the integration worktree to `origin/integration` and records a resumable task checkpoint.
- `tools/local-agent/selftest.py` performs an adversarial two-agent simulation covering isolated worktrees, parallel execution, concurrent messaging, lock conflicts and stale recovery, handoff persistence across service restart, command cancellation, deterministic integration conflict recovery, integration publishing, cleanup, and lock-leak checks.
"""
    if '## Multi-agent hardening' not in d:
        doc.write_text(d.rstrip()+addition+'\n')

    git(['config','user.name','gova-runtime-hardening'],cwd=repair)
    git(['config','user.email','gova-runtime-hardening@users.noreply.github.com'],cwd=repair)
    git(['add','tools/local-agent/gateway.py','docs/09-agent-knowledge/local-agent-runtime.md'],cwd=repair)
    git(['diff','--cached','--check'],cwd=repair)
    git(['commit','-m','fix(local-agent): harden multi-agent integration recovery [docs-contract-change]'],cwd=repair)
    repair_sha=git(['rev-parse','HEAD'],cwd=repair).stdout.strip()

    agent=f'repair-agent-{TAG}'; task=f'repair-task-{TAG}'
    call('POST','/v1/agent/register',{'agent_id':agent})
    call('POST','/v1/task/create',{'agent_id':agent,'task_id':task,'goal':'Harden persistent multi-agent runtime before adversarial simulation'})
    _,published=call('POST','/v1/integration/submit',{'agent_id':agent,'task_id':task,'commit_sha':repair_sha,'verification':['python3 -m py_compile tools/local-agent/gateway.py','git diff --check']})
    print('PHASE hardening-published',published['integration_sha'],flush=True)
finally:
    git(['worktree','remove','--force',str(repair)],check=False)
    git(['branch','-D',branch],check=False)

# Load the newly published runtime and prove the service survives replacement.
git(['fetch','--quiet','origin','integration'])
git(['checkout','integration'],cwd=INTEGRATION_WT)
git(['reset','--hard','origin/integration'],cwd=INTEGRATION_WT)
subprocess.run(['bash',str(INTEGRATION_WT/'tools/local-agent/install.sh')],check=True)
wait_health()
print('PHASE hardened-runtime-active',flush=True)

# Run the reusable adversarial multi-agent test with a real service restart in the middle.
cp=subprocess.run(['python3',str(INTEGRATION_WT/'tools/local-agent/selftest.py'),'--restart-service'],text=True,capture_output=True)
print(cp.stdout,flush=True)
if cp.stderr: print(cp.stderr,flush=True)
if cp.returncode: raise RuntimeError(f'selftest failed with {cp.returncode}')
print('PHASE adversarial-selftest-pass',flush=True)

after=heads()
if set(after)!={'main','integration'}: raise RuntimeError(f'unexpected remote branches after simulation: {after}')
if after['main']!=main_before: raise RuntimeError(f'main moved during simulation: {main_before} -> {after["main"]}')
if (INTEGRATION_WT/'.git').exists() is False: raise RuntimeError('integration worktree missing')
git(['fetch','--quiet','origin','integration'])
if git(['status','--porcelain'],cwd=INTEGRATION_WT).stdout.strip(): raise RuntimeError('integration worktree dirty after simulation')
if git(['rev-parse','HEAD'],cwd=INTEGRATION_WT).stdout.strip()!=git(['rev-parse','origin/integration'],cwd=INTEGRATION_WT).stdout.strip(): raise RuntimeError('integration worktree not aligned with origin/integration')
print('PHASE invariants-pass',json.dumps({'main':after['main'],'integration':after['integration'],'branches':sorted(after)}),flush=True)
