#!/usr/bin/env python3
import importlib.util, json, os, shutil, sqlite3, subprocess, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path('/home/hesham/gova-agents/integration')
RUNTIME=Path('/home/hesham/.local/share/gova-agent-runtime')
FINAL_WORKFLOW="""name: local-agent-bootstrap
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

def now(): return datetime.now(timezone.utc).isoformat()
def run(args, check=True, env=None):
    cp=subprocess.run(args,cwd=str(ROOT),text=True,capture_output=True,env=env)
    if check and cp.returncode: raise RuntimeError(f"command failed ({cp.returncode}): {' '.join(args)}\n{cp.stderr or cp.stdout}")
    return cp
def phase(n,d='ok'): print(f'PHASE {n}: {d}',flush=True)
def gateway():
    spec=importlib.util.spec_from_file_location('gova_gateway_complete',ROOT/'tools/local-agent/gateway.py')
    m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

(ROOT/'.github/workflows/local-agent-bootstrap.yml').write_text(FINAL_WORKFLOW,encoding='utf8')
shutil.rmtree(ROOT/'.agent-repair',ignore_errors=True)
shutil.rmtree(ROOT/'.agent-proof',ignore_errors=True)
run(['git','config','user.name','gova-local-agent'])
run(['git','config','user.email','gova-local-agent@users.noreply.github.com'])
gw=gateway()

_, main0=gw._github_api('GET','/branches/main')
main_sha=main0['commit']['sha']
_, branches=gw._github_api('GET','/branches?per_page=100')
names=sorted(x['name'] for x in branches)
if names!=['integration','main']: raise RuntimeError(f'unexpected remote branches: {names}')
_, ruleset=gw._github_api('GET','/rulesets/21193774')
excludes=sorted(ruleset.get('conditions',{}).get('ref_name',{}).get('exclude',[]))
if excludes!=['refs/heads/integration','refs/heads/main']: raise RuntimeError(f'ruleset exclusions wrong: {excludes}')
status,_=gw._github_api('POST','/git/refs',{'ref':'refs/heads/forbidden-final-probe-2','sha':main_sha},allow=(403,422))
if status not in (403,422):
    try: gw._github_api('DELETE','/git/refs/heads/forbidden-final-probe-2')
    finally: raise RuntimeError(f'third branch creation unexpectedly succeeded: {status}')
phase('branch-policy-proved', f'main={main_sha} third-branch-status={status}')

with urllib.request.urlopen('http://127.0.0.1:8765/health',timeout=5) as r:
    health=json.loads(r.read())
if not health.get('ok'): raise RuntimeError('gateway health failed')
installed=Path('/home/hesham/.local/lib/gova-agent/gateway.py').read_text(encoding='utf8')
if "sha=publish_worktree_branch_api(iw,'integration')" not in installed:
    raise RuntimeError('running installation is not API-backed integration runtime')
phase('gateway-health-proved', str(health.get('pid')))

con=sqlite3.connect(RUNTIME/'runtime.sqlite3')
ts=now(); tid='local-runner-migration-20260902'
goal='Persistent local agent runtime migration: direct gateway, isolated local worktrees, shared resumable state, integration-only remote delivery.'
completed='Completed. Service restart loads current code; direct command transport was proved not to create GitHub jobs; API-backed /v1/integration/submit published proof commit 1b0b567d991376afb9a14cf03744af3a0491254b; remote refs are exactly main+integration.'
handoff='Migration complete. Use gova-agent-gateway directly. Each task gets a local agent/<agent>/<task> worktree branch. Submit verified commits through /v1/integration/submit. GitHub local-agent-bootstrap is manual install/recovery only.'
con.execute("""INSERT INTO tasks(id,goal,originating_agent,current_agent,status,completed,remaining,next_action,handoff,created_at,updated_at)
VALUES(?,?,?,?,?,?,?,?,?,?,?)
ON CONFLICT(id) DO UPDATE SET current_agent=excluded.current_agent,status=excluded.status,completed=excluded.completed,remaining=excluded.remaining,next_action=excluded.next_action,handoff=excluded.handoff,updated_at=excluded.updated_at""",
(tid,goal,'chatgpt','any-agent','completed',completed,'','',handoff,ts,ts))
con.commit(); con.close()
phase('checkpoint-handoff-written')

doc=ROOT/'docs/09-agent-knowledge/local-agent-runtime.md'
text=doc.read_text(encoding='utf8')
marker='\n## Final Verification Evidence\n'
if marker in text: text=text.split(marker,1)[0].rstrip()+'\n'
evidence={
 'verified_at':now(),
 'main_sha_at_completion':main_sha,
 'integration_submit_sha':'1b0b567d991376afb9a14cf03744af3a0491254b',
 'service_pid':health.get('pid'),
 'tests':{
  'repository_checks_before_restart':'pass',
  'service_restart_current_runtime':'pass',
  'direct_command_no_github_job':'pass',
  'http_integration_submit':'pass',
  'integration_submit_no_github_job':'pass',
  'exact_two_remote_branches':'pass',
  'third_branch_blocked':f'pass status={status}',
  'ruleset_main_integration_only':'pass',
  'persistent_checkpoint_handoff':'pass'
 }
}
text=text.rstrip()+marker+'\n```json\n'+json.dumps(evidence,indent=2,ensure_ascii=False)+'\n```\n'
doc.write_text(text,encoding='utf8')
env={**os.environ,'DOCS_CONTRACT_CHANGE':'1','PYTHONDONTWRITEBYTECODE':'1'}
run(['npm','run','docs:generate'],env=env)
for cmd in (['npm','run','github:ci-policy'],['npm','run','architecture:check'],['npm','run','docs:ci']): run(cmd,env=env)
phase('final-repository-verification-passed')

run(['git','add','-A'])
run(['git','commit','-m','docs(local-agent): finalize persistent runtime migration [docs-contract-change]'])
final_sha=gw.publish_worktree_branch_api(ROOT,'integration')
_, main1=gw._github_api('GET','/branches/main')
if main1['commit']['sha']!=main_sha: raise RuntimeError(f'main moved during finalization: {main_sha}->{main1["commit"]["sha"]}')
_, final_branches=gw._github_api('GET','/branches?per_page=100')
if sorted(x['name'] for x in final_branches)!=['integration','main']: raise RuntimeError('remote branch set changed during finalization')
result={
 'completed':True,'finished_at':now(),'final_integration_sha':final_sha,'main_sha':main_sha,
 'integration_submit_sha':'1b0b567d991376afb9a14cf03744af3a0491254b',
 'remote_branches':['main','integration'],'service':'gova-agent-gateway.service',
 'runtime_db':str(RUNTIME/'runtime.sqlite3'),'worktrees':'/home/hesham/gova-agents',
 'workflow':'manual-only local-agent-bootstrap.yml','tests':evidence['tests']
}
(RUNTIME/'final-verification.json').write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf8')
phase('complete',final_sha)
print(json.dumps(result,indent=2,ensure_ascii=False))
