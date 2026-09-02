#!/usr/bin/env python3
import importlib.util
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path('/home/hesham/gova-agents/integration').resolve()
CANON = Path('/home/hesham/gova').resolve()
RUNTIME = Path('/home/hesham/.local/share/gova-agent-runtime').resolve()
AUTH = Path('/home/hesham/.config/gova-agent/auth').resolve()
STATE = Path('/home/hesham/.local/state/gova-agent-finalize').resolve()
STATE.mkdir(parents=True, exist_ok=True)
LOG = STATE / 'finalize.log'
REPORT_JSON = STATE / 'final-report.json'
MAIN_EXPECTED = '0526829af50eddecb2f4f9e5974cc3ba3e288c77'
OLD_WORKFLOWS = [
    'local-agent-main.yml', 'local-agent-inspect.yml', 'local-agent-workspace.yml',
    'local-agent-status.yml', 'local-agent-coordination.yml', 'local-agent-gateway.yml',
]
result = {
    'started_at': datetime.now(timezone.utc).isoformat(),
    'phases': [], 'tests': {}, 'latency_ms': {}, 'removed': [], 'notes': [],
}

def log(msg):
    line = f"[{datetime.now(timezone.utc).isoformat()}] {msg}"
    print(line, flush=True)
    with LOG.open('a', encoding='utf8') as f: f.write(line + '\n')

def phase(name, detail='ok'):
    result['phases'].append({'name': name, 'detail': detail, 'at': datetime.now(timezone.utc).isoformat()})
    log(f'PHASE {name}: {detail}')

def run(args, cwd=ROOT, check=True, env=None):
    cp = subprocess.run(args, cwd=str(cwd), text=True, capture_output=True, env=env)
    if check and cp.returncode:
        raise RuntimeError(f"command failed ({cp.returncode}): {' '.join(args)}\n{cp.stdout}\n{cp.stderr}")
    return cp

def write(path, text, mode=None):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf8')
    if mode is not None: p.chmod(mode)

def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing expected policy fragment: {label}')
    return text.replace(old, new, 1)

def http(method, path, data=None, timeout=30):
    raw = None if data is None else json.dumps(data).encode()
    headers = {'Accept': 'application/json'}
    if path != '/health': headers['X-Gova-Agent-Key'] = AUTH.read_text().strip()
    if raw is not None: headers['Content-Type'] = 'application/json'
    req = urllib.request.Request('http://127.0.0.1:8765' + path, data=raw, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors='replace')
        raise RuntimeError(f'gateway {method} {path} failed {e.code}: {body}')

def wait_cmd(cid, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        d = http('GET', '/v1/commands/' + cid).get('command')
        if d and d.get('status') != 'running': return d
        time.sleep(.08)
    raise RuntimeError('timed out waiting for command ' + cid)

def load_gateway():
    path = Path('/home/hesham/.local/lib/gova-agent/gateway.py')
    spec = importlib.util.spec_from_file_location('gova_gateway_runtime', path)
    if not spec or not spec.loader: raise RuntimeError('cannot load installed gateway module')
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    return mod

def workflow_paths(body):
    lines = body.splitlines()
    out=[]; in_paths=False; indent=0
    for line in lines:
        if re.match(r'^ {4}paths:\s*$', line):
            in_paths=True; indent=4; continue
        if in_paths:
            if line.strip() and len(line)-len(line.lstrip()) <= indent: break
            m=re.match(r'^ {6}-\s+["\']?(.+?)["\']?\s*$', line)
            if m: out.append(m.group(1).strip('"\''))
    return out

try:
    phase('start')
    run(['git','fetch','--quiet','origin','main','integration'], CANON)
    branch = run(['git','branch','--show-current']).stdout.strip()
    if branch != 'integration': raise RuntimeError(f'expected integration worktree, got {branch}')
    phase('integration-worktree-confirmed')

    # Remove the retired GitHub-dispatch implementation completely.
    pkg = ROOT / 'packages/local-agent-core'
    if pkg.exists():
        shutil.rmtree(pkg); result['removed'].append('packages/local-agent-core/**')
    for p in sorted((ROOT/'scripts').glob('local-agent-*.ts')):
        p.unlink(); result['removed'].append(str(p.relative_to(ROOT)))
    ctl = ROOT/'.agent-control'
    if ctl.exists(): shutil.rmtree(ctl); result['removed'].append('.agent-control/**')
    phase('legacy-control-plane-removed', f"removed={len(result['removed'])}")

    # The ruleset utility now has exactly two recognized refs and no package dependency.
    bb = (ROOT/'scripts/block-branch-creation.ts').read_text(encoding='utf8')
    bb = bb.replace("\nimport { CONTROL_PLANE_BRANCH_NAMESPACES } from '@asol/local-agent-core';\n", "\n")
    bb = replace_once(bb,
        "exclude: ['refs/heads/main', ...CONTROL_PLANE_BRANCH_NAMESPACES],",
        "exclude: ['refs/heads/main', 'refs/heads/integration'],",
        'ruleset exclude list')
    bb = bb.replace('Branch creation is blocked for every ref except main and agent-request/chatgpt.',
                    'Branch creation is blocked for every ref except main and integration.')
    write(Path('scripts/block-branch-creation.ts'), bb)

    # Docs CI tracks the one remaining bootstrap surface and the persistent gateway implementation.
    docs_path = ROOT/'.github/workflows/docs.yml'
    docs = docs_path.read_text(encoding='utf8')
    for old in OLD_WORKFLOWS:
        docs = re.sub(rf'^\s*-\s*["\']?\.github/workflows/{re.escape(old)}["\']?\s*\n', '', docs, flags=re.M)
    docs = re.sub(r'^\s*-\s*["\']?packages/local-agent-core/\*\*["\']?\s*\n', '', docs, flags=re.M)
    docs = re.sub(r'^\s*-\s*["\']?scripts/local-agent-\*\.ts["\']?\s*\n', '', docs, flags=re.M)
    insert_anchor = '        - ".github/workflows/deploy-main.yml"\n'
    additions = '        - ".github/workflows/local-agent-bootstrap.yml"\n        - "tools/local-agent/**"\n'
    if '.github/workflows/local-agent-bootstrap.yml' not in docs:
        if insert_anchor not in docs: raise RuntimeError('docs workflow insertion anchor missing')
        docs = docs.replace(insert_anchor, insert_anchor + additions, 1)
    elif 'tools/local-agent/**' not in docs:
        docs = docs.replace('        - ".github/workflows/local-agent-bootstrap.yml"\n',
                            '        - ".github/workflows/local-agent-bootstrap.yml"\n        - "tools/local-agent/**"\n', 1)
    docs_path.write_text(docs, encoding='utf8')
    doc_filters = workflow_paths(docs)
    if not doc_filters: raise RuntimeError('could not parse docs workflow path filters')

    # Modernize the GitHub CI policy without touching its docs/deploy policy logic.
    pp = ROOT/'scripts/github-ci-policy.ts'
    policy = pp.read_text(encoding='utf8')
    policy = policy.replace('import { CONTROL_PLANE_BRANCH_NAMESPACES } from "@asol/local-agent-core";\n','')
    old_consts = '''const LOCAL_AGENT_WORKFLOW = "local-agent-main.yml";\nconst LOCAL_AGENT_INSPECT_WORKFLOW = "local-agent-inspect.yml";\nconst LOCAL_AGENT_WORKSPACE_WORKFLOW = "local-agent-workspace.yml";\nconst LOCAL_AGENT_STATUS_WORKFLOW = "local-agent-status.yml";\nconst LOCAL_AGENT_COORDINATION_WORKFLOW = "local-agent-coordination.yml";\nconst LOCAL_AGENT_GATEWAY_WORKFLOW = "local-agent-gateway.yml";\nconst LOCAL_WORKSPACE_ENV = "GOVA_LOCAL_WORKSPACE: /home/hesham/gova";\nconst COORDINATION_ENV = "GOVA_AGENT_COORDINATION_DIR: /home/hesham/gova/.local/github-runners/gova-coordination";\nconst LOCAL_WORKING_DIRECTORY = "working-directory: /home/hesham/gova";\n'''
    policy = replace_once(policy, old_consts, 'const LOCAL_AGENT_BOOTSTRAP_WORKFLOW = "local-agent-bootstrap.yml";\n', 'legacy local-agent constants')
    policy = policy.replace('  ".agent-control/**",\n','')
    policy = policy.replace('  "packages/local-agent-core/**",\n','')
    policy = policy.replace('  "scripts/local-agent-*.ts",\n','  "tools/local-agent/**",\n')
    policy = re.sub(r'export const ALLOWED_WORKFLOW_FILES = \[[\s\S]*?\] as const;',
                    'export const ALLOWED_WORKFLOW_FILES = [\n  DEPLOY_WORKFLOW,\n  DOCS_WORKFLOW,\n  LOCAL_AGENT_BOOTSTRAP_WORKFLOW,\n] as const;', policy, count=1)
    policy = re.sub(r'/\*\*\n \* Local agent jobs execute[\s\S]*?const ALLOWED_LOCAL_AGENT_GATEWAY_RUN_COMMANDS = new Set\(\["npx tsx scripts/local-agent-gateway.ts"\]\);\n', '', policy, count=1)
    filters_ts = 'export const DOCS_WORKFLOW_PATH_FILTERS = [\n' + ''.join(f'  {json.dumps(v)},\n' for v in doc_filters) + '] as const;'
    policy = re.sub(r'export const DOCS_WORKFLOW_PATH_FILTERS = \[[\s\S]*?\] as const;', filters_ts, policy, count=1)
    bootstrap_validator = r'''export function localAgentBootstrapWorkflowViolations(source: string): string[] {
  const errors: string[] = [];
  const body = stripYamlComments(source);
  if (!/^name:\s*local-agent-bootstrap\s*$/m.test(body)) errors.push("Local agent bootstrap workflow name must be exactly `local-agent-bootstrap`.");
  if (!/^ {2}workflow_dispatch:\s*$/m.test(body)) errors.push("Local agent bootstrap workflow must be manually dispatched.");
  if (/(^|\n)\s*(push|pull_request)\s*:/m.test(body)) errors.push("Local agent bootstrap must not run on push or pull_request.");
  if (!body.includes("permissions:") || !body.includes("contents: read") || body.includes("contents: write")) errors.push("Local agent bootstrap must be repository read-only.");
  if (!body.includes(SELF_HOSTED_RUNNER) || body.includes(GITHUB_HOSTED_RUNNER)) errors.push("Local agent bootstrap must run only on the gova self-hosted runner.");
  if (body.includes("${{ secrets.")) errors.push("Local agent bootstrap must not consume GitHub secrets.");
  if (body.includes("actions/checkout@") || body.includes("actions/setup-node@") || /npm ci/.test(body)) errors.push("Local agent bootstrap must reuse the host checkout/toolchain and must not reinstall dependencies.");
  if (!body.includes("/home/hesham/gova-agents/integration") || !body.includes("tools/local-agent/install.sh")) errors.push("Local agent bootstrap must install from the integration worktree.");
  const jobIds = docsWorkflowJobIds(body);
  if (jobIds.length !== 1 || jobIds[0] !== "bootstrap") errors.push(`Local agent bootstrap must contain exactly one bootstrap job. Found: ${jobIds.join(", ") || "(none)"}.`);
  return errors;
}

export function collectGithubCiPolicyErrors'''
    policy, n = re.subn(r'function localWorkspaceViolations[\s\S]*?export function collectGithubCiPolicyErrors', bootstrap_validator, policy, count=1)
    if n != 1: raise RuntimeError('could not replace legacy local-agent policy functions')
    collect_new = r'''  const bootstrapPath = path.join(workflowsDir, LOCAL_AGENT_BOOTSTRAP_WORKFLOW);
  if (existsSync(bootstrapPath)) errors.push(...localAgentBootstrapWorkflowViolations(readFileSync(bootstrapPath, "utf8")));
  else errors.push(`Missing .github/workflows/${LOCAL_AGENT_BOOTSTRAP_WORKFLOW}.`);
  const blockBranchesPath = path.join(root, "scripts", "block-branch-creation.ts");
  if (existsSync(blockBranchesPath)) {
    const source = readFileSync(blockBranchesPath, "utf8");
    if (!source.includes("exclude: ['refs/heads/main', 'refs/heads/integration']")) errors.push("fixed-two-branches ruleset must exclude exactly main and integration.");
    if (source.includes("CONTROL_PLANE_BRANCH_NAMESPACES") || source.includes("agent-request/chatgpt")) errors.push("branch ruleset utility still references the retired control branch architecture.");
  }
  const hookPath = path.join(root, ".githooks", "pre-push.d", "10-main-only");
  if (existsSync(hookPath)) {
    const hook = readFileSync(hookPath, "utf8");
    if (!hook.includes("refs/heads/main|refs/heads/integration") || hook.includes("agent-request/chatgpt")) errors.push("pre-push hook must allow exactly main and integration.");
  }
  const protectPath'''
    policy, n = re.subn(r'  const localAgentInspectPath[\s\S]*?  const protectPath', collect_new, policy, count=1)
    if n != 1: raise RuntimeError('could not replace legacy collect policy block')
    pp.write_text(policy, encoding='utf8')
    phase('ci-policy-modernized')

    # Final repository workflow is manual bootstrap only. It fetches integration without checkout/setup/npm.
    final_bootstrap = '''name: local-agent-bootstrap\non:\n  workflow_dispatch:\npermissions:\n  contents: read\njobs:\n  bootstrap:\n    runs-on: [self-hosted, Linux, X64, gova]\n    timeout-minutes: 15\n    steps:\n      - name: Install persistent local-agent gateway\n        shell: bash\n        run: |\n          set -euo pipefail\n          git -C /home/hesham/gova fetch --quiet origin integration\n          mkdir -p /home/hesham/gova-agents\n          if [ ! -e /home/hesham/gova-agents/integration/.git ]; then\n            git -C /home/hesham/gova worktree add /home/hesham/gova-agents/integration integration\n          fi\n          git -C /home/hesham/gova-agents/integration checkout integration\n          git -C /home/hesham/gova-agents/integration reset --hard origin/integration\n          bash /home/hesham/gova-agents/integration/tools/local-agent/install.sh\n'''
    write(Path('.github/workflows/local-agent-bootstrap.yml'), final_bootstrap)

    # Remove temporary bootstrap transport before generation/commit.
    temp = ROOT/'.agent-bootstrap'
    if temp.exists(): shutil.rmtree(temp)

    # Refresh npm workspace metadata after deleting the retired package.
    run(['npm','install','--package-lock-only','--ignore-scripts'])
    phase('workspace-metadata-refreshed')

    # Update intentional final architecture documentation.
    report_doc = ROOT/'docs/09-agent-knowledge/local-agent-runtime.md'
    base = report_doc.read_text(encoding='utf8') if report_doc.exists() else '# Persistent Local Agent Runtime\n'
    marker = '## Final Migration State (2026-09-02)'
    if marker not in base:
        base += f'''\n\n{marker}\n\n- GitHub has exactly two remote branches: `main` and `integration`. Agent task branches are local-only Git worktrees.\n- Normal agent commands use the persistent `gova-agent-gateway` service and do not dispatch GitHub Actions jobs.\n- Runtime state is SQLite WAL under `/home/hesham/.local/share/gova-agent-runtime/`.\n- Agent worktrees live under `/home/hesham/gova-agents/`; the shared integration worktree is `/home/hesham/gova-agents/integration`.\n- The only Local Runner GitHub workflow is `local-agent-bootstrap.yml`, which is manual bootstrap/reinstall only.\n- The retired request branch, dispatch workflows, `.agent-control`, `@asol/local-agent-core`, and `scripts/local-agent-*.ts` control plane have been removed.\n- Normal completion integrates local commits through the gateway into `integration`; promotion from `integration` to `main` is separate and deliberate.\n'''
    report_doc.write_text(base, encoding='utf8')

    run(['npm','run','docs:generate'])
    checks = [
        ['npm','run','github:ci-policy'],
        ['npm','run','architecture:check'],
        ['npm','run','docs:ci'],
        ['python3','-m','py_compile','tools/local-agent/gateway.py','tools/local-agent/cli.py'],
    ]
    for cmd in checks:
        cp=run(cmd); result['tests'][' '.join(cmd)]='pass'
    phase('repository-verification-passed')

    # Active tracked legacy control-plane references are forbidden after cleanup.
    grep = run(['git','grep','-n','-E','@asol/local-agent-core|agent-request/chatgpt|local-agent-(main|inspect|workspace|status|coordination|gateway)\\.yml|scripts/local-agent-'], check=False)
    legacy_lines=[line for line in grep.stdout.splitlines() if 'docs/09-agent-knowledge/local-agent-runtime.md' not in line]
    if legacy_lines: raise RuntimeError('active legacy control-plane references remain:\n'+'\n'.join(legacy_lines[:30]))
    result['tests']['legacy-control-plane-active-references']='none'

    run(['git','config','user.name','gova-local-agent'])
    run(['git','config','user.email','gova-local-agent@users.noreply.github.com'])
    run(['git','add','-A'])
    status = run(['git','status','--porcelain']).stdout.strip()
    if not status: raise RuntimeError('expected final architecture cleanup changes')
    run(['git','commit','-m','infra(local-agent): finalize persistent runtime'])
    code_sha=run(['git','rev-parse','HEAD']).stdout.strip()
    gw=load_gateway()
    published=gw.publish_worktree_branch_api(ROOT,'integration')
    result['code_commit']=code_sha; result['published_code_sha']=published
    phase('final-code-published', published)

    # Reinstall from final integration and prove the persistent service is healthy/restartable.
    run(['bash','tools/local-agent/install.sh'])
    t0=time.perf_counter(); health=http('GET','/health'); result['latency_ms']['health']=round((time.perf_counter()-t0)*1000,3)
    if not health.get('ok'): raise RuntimeError('gateway health failed after reinstall')
    service_before=run(['systemctl','is-active','gova-agent-gateway.service'],check=False).stdout.strip()
    if service_before!='active':
        service_before=run(['systemctl','--user','is-active','gova-agent-gateway.service'],check=False).stdout.strip()
    if service_before!='active': raise RuntimeError('gova-agent-gateway.service is not active')
    phase('service-final-install-active')

    # Prove a direct command creates no GitHub Action run.
    gw=load_gateway()
    _, actions_before=gw._github_api('GET','/actions/runs?per_page=1')
    count_before=int(actions_before.get('total_count',0))
    http('POST','/v1/agent/register',{'agent_id':'final-audit'})
    t0=time.perf_counter(); ex=http('POST','/v1/exec/start',{'agent_id':'final-audit','command':'printf direct-channel-ok','cwd':str(ROOT)}); d=wait_cmd(ex['command_id']); result['latency_ms']['direct_command']=round((time.perf_counter()-t0)*1000,3)
    logs=http('GET','/v1/commands/'+ex['command_id']+'/logs')
    if d.get('exit_code')!=0 or 'direct-channel-ok' not in logs.get('stdout',''): raise RuntimeError('direct command proof failed')
    time.sleep(1)
    _, actions_after=gw._github_api('GET','/actions/runs?per_page=1')
    count_after=int(actions_after.get('total_count',0))
    if count_after != count_before: raise RuntimeError(f'direct gateway command created GitHub Actions run: {count_before}->{count_after}')
    result['tests']['direct-command-no-github-job']=f'pass actions={count_before}'
    phase('direct-no-github-job-proved')

    # Real local-agent task/worktree -> commit -> HTTP integration-submit -> remote integration.
    task_id='final-integration-submit'
    try:
        http('POST','/v1/task/create',{'agent_id':'final-audit','task_id':task_id,'goal':'Final integration submit proof'})
    except Exception:
        pass
    ws=http('POST','/v1/workspace/create',{'agent_id':'final-audit','task_id':task_id})
    worktree=Path(ws['worktree'])
    cmd="git config user.name gova-local-agent && git config user.email gova-local-agent@users.noreply.github.com && git commit --allow-empty -m 'test(local-agent): integration submit proof' && git rev-parse HEAD"
    ex=http('POST','/v1/exec/start',{'agent_id':'final-audit','task_id':task_id,'command':cmd})
    d=wait_cmd(ex['command_id']); logs=http('GET','/v1/commands/'+ex['command_id']+'/logs')
    if d.get('exit_code')!=0: raise RuntimeError('could not create local integration proof commit: '+logs.get('stderr',''))
    commit_sha=logs['stdout'].strip().splitlines()[-1]
    t0=time.perf_counter(); submitted=http('POST','/v1/integration/submit',{'agent_id':'final-audit','task_id':task_id,'commit_sha':commit_sha,'verification':['python3 -m py_compile tools/local-agent/gateway.py']},timeout=60); result['latency_ms']['integration_submit']=round((time.perf_counter()-t0)*1000,3)
    integ_sha=submitted['integration_sha']
    _, remote_integ=gw._github_api('GET','/branches/integration')
    if remote_integ['commit']['sha'] != integ_sha: raise RuntimeError('integration-submit SHA does not match remote integration')
    result['tests']['http-integration-submit']='pass'; result['integration_submit_sha']=integ_sha
    http('POST','/v1/task/complete',{'agent_id':'final-audit','task_id':task_id,'completed':'integration-submit proof passed'})
    http('POST','/v1/workspace/remove',{'agent_id':'final-audit','task_id':task_id,'force':True})
    phase('http-integration-submit-proved', integ_sha)

    # Branch/ruleset/main invariants and explicit third-branch rejection.
    _, branches=gw._github_api('GET','/branches?per_page=100')
    names=sorted(b['name'] for b in branches)
    if names != ['integration','main']: raise RuntimeError(f'unexpected remote branches: {names}')
    _, mainbr=gw._github_api('GET','/branches/main')
    if mainbr['commit']['sha'] != MAIN_EXPECTED: raise RuntimeError(f'main changed: {mainbr["commit"]["sha"]}')
    _, ruleset=gw._github_api('GET','/rulesets/21193774')
    excludes=sorted(ruleset.get('conditions',{}).get('ref_name',{}).get('exclude',[]))
    if excludes != ['refs/heads/integration','refs/heads/main']: raise RuntimeError(f'ruleset excludes wrong: {excludes}')
    probe='refs/heads/forbidden-final-probe'
    status,obj=gw._github_api('POST','/git/refs',{'ref':probe,'sha':MAIN_EXPECTED},allow=(403,422))
    if status not in (403,422):
        try: gw._github_api('DELETE','/git/refs/heads/forbidden-final-probe')
        finally: raise RuntimeError(f'third branch creation unexpectedly succeeded: {status}')
    result['tests']['exact-two-remote-branches']='pass'
    result['tests']['third-branch-blocked']=f'pass status={status}'
    result['tests']['main-unchanged']=MAIN_EXPECTED
    result['tests']['ruleset-main-integration-only']='pass'
    phase('github-branch-invariants-proved')

    # Cheap latency samples over the final persistent channel.
    samples={}
    for label,method,path,data in [
        ('task_read','GET','/v1/tasks',None),
        ('message_send','POST','/v1/message/send',{'sender':'final-audit','recipient':'all','kind':'note','body':'final latency probe'}),
        ('lock_acquire','POST','/v1/lock/acquire',{'agent_id':'final-audit','task_id':'final-integration-submit','kind':'path','scope':'final-latency-probe','lease':5}),
    ]:
        t0=time.perf_counter(); http(method,path,data); samples[label]=round((time.perf_counter()-t0)*1000,3)
    http('POST','/v1/lock/release-all',{'agent_id':'final-audit'})
    result['latency_ms'].update(samples)

    # Final migration checkpoint/handoff persisted in SQLite.
    con=sqlite3.connect(RUNTIME/'runtime.sqlite3')
    ts=datetime.now(timezone.utc).isoformat(); tid='local-runner-migration-20260902'
    goal='Persistent local agent runtime migration: direct gateway, local worktrees, integration-only remote delivery.'
    completed='Persistent gateway active; peer agent worktrees/tasks/messages/locks/handoff verified; HTTP integration-submit verified; GitHub main+integration only; old dispatch architecture removed.'
    con.execute("INSERT INTO tasks(id,goal,originating_agent,current_agent,status,completed,remaining,next_action,handoff,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET current_agent=excluded.current_agent,status=excluded.status,completed=excluded.completed,remaining=excluded.remaining,next_action=excluded.next_action,handoff=excluded.handoff,updated_at=excluded.updated_at",(tid,goal,'chatgpt','any-agent','completed',completed,'','','Another agent can audit this completed migration from this SQLite task and the tracked runtime document.',ts,ts)); con.commit(); con.close()
    phase('persistent-migration-checkpoint-written')

    # Final report is tracked, then docs are regenerated one last time and published.
    result['finished_at']=datetime.now(timezone.utc).isoformat()
    result['remote_branches']=['main','integration']; result['main_sha']=MAIN_EXPECTED
    result['runtime_db']=str(RUNTIME/'runtime.sqlite3'); result['worktree_root']='/home/hesham/gova-agents'
    result['service']='gova-agent-gateway.service'; result['gateway']='http://127.0.0.1:8765 (also bound on private host interfaces)'
    REPORT_JSON.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    final_md = report_doc.read_text(encoding='utf8')
    final_md += '\n\n## Final Verification Evidence\n\n```json\n' + json.dumps({k:result[k] for k in ['tests','latency_ms','remote_branches','main_sha','integration_submit_sha']},ensure_ascii=False,indent=2) + '\n```\n'
    report_doc.write_text(final_md,encoding='utf8')
    run(['npm','run','docs:generate'])
    run(['npm','run','github:ci-policy']); run(['npm','run','architecture:check']); run(['npm','run','docs:ci'])
    run(['git','add','-A'])
    run(['git','commit','-m','docs(local-agent): record final runtime verification'])
    final_local=run(['git','rev-parse','HEAD']).stdout.strip()
    final_remote=gw.publish_worktree_branch_api(ROOT,'integration')
    result['final_local_commit']=final_local; result['final_integration_sha']=final_remote
    REPORT_JSON.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    phase('complete', final_remote)
    print(json.dumps(result,ensure_ascii=False,indent=2))
except Exception as e:
    result['failed_at']=datetime.now(timezone.utc).isoformat(); result['error']=str(e)
    REPORT_JSON.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    log('FINALIZE FAILED: '+str(e))
    raise
