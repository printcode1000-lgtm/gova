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
anchor='    # Modernize the GitHub CI policy without touching its docs/deploy policy logic.\n'
block='''    # Keep production deployment blind to persistent local-agent control-plane changes.\n    deploy_path = ROOT/'.github/workflows/deploy-main.yml'\n    deploy = deploy_path.read_text(encoding='utf8')\n    for retired in ['      - ".agent-control/**"\\n', '      - "packages/local-agent-core/**"\\n', '      - "scripts/local-agent-*.ts"\\n']:\n        deploy = deploy.replace(retired, '')\n    if '      - "tools/local-agent/**"\\n' not in deploy:\n        paths_anchor = '    paths-ignore:\\n'\n        if paths_anchor not in deploy: raise RuntimeError('deploy-main paths-ignore anchor missing')\n        deploy = deploy.replace(paths_anchor, paths_anchor + '      - "tools/local-agent/**"\\n', 1)\n    deploy_path.write_text(deploy, encoding='utf8')\n\n'''
if anchor not in s: raise SystemExit('expected finalizer deploy-policy anchor not found')
s=s.replace(anchor,block+anchor,1)
p.write_text(s,encoding='utf8')
print('finalizer docs, regex, and deploy-ignore repairs applied')
