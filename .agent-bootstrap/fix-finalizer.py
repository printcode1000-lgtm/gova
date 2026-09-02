#!/usr/bin/env python3
from pathlib import Path
p=Path('/home/hesham/gova-agents/integration/.agent-bootstrap/finalize-runtime.py')
s=p.read_text(encoding='utf8')
old='''    insert_anchor = '        - ".github/workflows/deploy-main.yml"\\n'\n    additions = '        - ".github/workflows/local-agent-bootstrap.yml"\\n        - "tools/local-agent/**"\\n'\n    if '.github/workflows/local-agent-bootstrap.yml' not in docs:\n        if insert_anchor not in docs: raise RuntimeError('docs workflow insertion anchor missing')\n        docs = docs.replace(insert_anchor, insert_anchor + additions, 1)\n    elif 'tools/local-agent/**' not in docs:\n        docs = docs.replace('        - ".github/workflows/local-agent-bootstrap.yml"\\n',\n                            '        - ".github/workflows/local-agent-bootstrap.yml"\\n        - "tools/local-agent/**"\\n', 1)\n'''
new='''    insert_anchor = '      - ".github/workflows/docs.yml"\\n'\n    additions = '      - ".github/workflows/local-agent-bootstrap.yml"\\n      - "tools/local-agent/**"\\n'\n    if '.github/workflows/local-agent-bootstrap.yml' not in docs:\n        if insert_anchor not in docs: raise RuntimeError('docs workflow insertion anchor missing')\n        docs = docs.replace(insert_anchor, insert_anchor + additions)\n    elif 'tools/local-agent/**' not in docs:\n        docs = docs.replace('      - ".github/workflows/local-agent-bootstrap.yml"\\n',\n                            '      - ".github/workflows/local-agent-bootstrap.yml"\\n      - "tools/local-agent/**"\\n')\n'''
if old not in s: raise SystemExit('expected finalizer docs fragment not found')
s=s.replace(old,new,1)
old1="policy, n = re.subn(r'function localWorkspaceViolations[\\s\\S]*?export function collectGithubCiPolicyErrors', bootstrap_validator, policy, count=1)"
new1="policy, n = re.subn(r'function localWorkspaceViolations[\\s\\S]*?export function collectGithubCiPolicyErrors', lambda _m: bootstrap_validator, policy, count=1)"
old2="policy, n = re.subn(r'  const localAgentInspectPath[\\s\\S]*?  const protectPath', collect_new, policy, count=1)"
new2="policy, n = re.subn(r'  const localAgentInspectPath[\\s\\S]*?  const protectPath', lambda _m: collect_new, policy, count=1)"
if old1 not in s or old2 not in s: raise SystemExit('expected finalizer regex replacement fragment not found')
s=s.replace(old1,new1,1).replace(old2,new2,1)
legacy_anchor="    phase('legacy-control-plane-removed', f'removed={removed}')\n"
legacy_block="""    # Remove the retired package from the canonical capability ownership registry.\n    capability_path = ROOT/'packages/architecture-core/src/registry/capability-registry.ts'\n    capability = capability_path.read_text(encoding='utf8')\n    capability, removed_capability = re.subn(r\"\\n  \\{\\n    folder: 'local-agent-core',[\\s\\S]*?\\n  \\},\", '', capability, count=1)\n    if removed_capability != 1: raise RuntimeError('could not remove local-agent-core capability registry entry')\n    capability_path.write_text(capability, encoding='utf8')\n    phase('legacy-capability-registry-removed')\n"""
if legacy_anchor not in s: raise SystemExit('expected legacy cleanup anchor not found')
s=s.replace(legacy_anchor,legacy_anchor+legacy_block,1)
anchor='    # Modernize the GitHub CI policy without touching its docs/deploy policy logic.\n'
block='''    # Keep production deployment blind to persistent local-agent control-plane changes.\n    deploy_path = ROOT/'.github/workflows/deploy-main.yml'\n    deploy = deploy_path.read_text(encoding='utf8')\n    for retired in ['      - ".agent-control/**"\\n', '      - "packages/local-agent-core/**"\\n', '      - "scripts/local-agent-*.ts"\\n']:\n        deploy = deploy.replace(retired, '')\n    if '      - "tools/local-agent/**"\\n' not in deploy:\n        paths_anchor = '    paths-ignore:\\n'\n        if paths_anchor not in deploy: raise RuntimeError('deploy-main paths-ignore anchor missing')\n        deploy = deploy.replace(paths_anchor, paths_anchor + '      - "tools/local-agent/**"\\n', 1)\n    deploy_path.write_text(deploy, encoding='utf8')\n\n'''
if anchor not in s: raise SystemExit('expected finalizer deploy-policy anchor not found')
s=s.replace(anchor,block+anchor,1)
lock_anchor="    run(['npm','install','--package-lock-only','--ignore-scripts'])\n    phase('workspace-metadata-refreshed')\n"
lock_new="    run(['npm','install','--package-lock-only','--ignore-scripts'])\n    phase('workspace-metadata-refreshed')\n    run(['npx','tsx','scripts/runtime-compatibility-reference.ts','--write','--confirm-reviewed-compatible-tree'])\n    phase('runtime-compatibility-reference-refreshed')\n"
if lock_anchor not in s: raise SystemExit('expected runtime compatibility insertion anchor not found')
s=s.replace(lock_anchor,lock_new,1)
docs_anchor="    run(['npm','run','docs:generate'])\n    checks = [\n"
docs_new="    run(['npm','run','architecture:docs'])\n    phase('architecture-docs-regenerated')\n    run(['npm','run','docs:generate'])\n    checks = [\n"
if docs_anchor not in s: raise SystemExit('expected architecture docs insertion anchor not found')
s=s.replace(docs_anchor,docs_new,1)
p.write_text(s,encoding='utf8')
print('finalizer fully repaired for registry, docs, policy, and runtime reference')
