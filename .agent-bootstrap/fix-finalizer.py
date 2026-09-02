#!/usr/bin/env python3
from pathlib import Path
p=Path('/home/hesham/gova-agents/integration/.agent-bootstrap/finalize-runtime.py')
s=p.read_text(encoding='utf8')
old='''    insert_anchor = '        - ".github/workflows/deploy-main.yml"\\n'\n    additions = '        - ".github/workflows/local-agent-bootstrap.yml"\\n        - "tools/local-agent/**"\\n'\n    if '.github/workflows/local-agent-bootstrap.yml' not in docs:\n        if insert_anchor not in docs: raise RuntimeError('docs workflow insertion anchor missing')\n        docs = docs.replace(insert_anchor, insert_anchor + additions, 1)\n    elif 'tools/local-agent/**' not in docs:\n        docs = docs.replace('        - ".github/workflows/local-agent-bootstrap.yml"\\n',\n                            '        - ".github/workflows/local-agent-bootstrap.yml"\\n        - "tools/local-agent/**"\\n', 1)\n'''
new='''    insert_anchor = '      - ".github/workflows/docs.yml"\\n'\n    additions = '      - ".github/workflows/local-agent-bootstrap.yml"\\n      - "tools/local-agent/**"\\n'\n    if '.github/workflows/local-agent-bootstrap.yml' not in docs:\n        if insert_anchor not in docs: raise RuntimeError('docs workflow insertion anchor missing')\n        docs = docs.replace(insert_anchor, insert_anchor + additions)\n    elif 'tools/local-agent/**' not in docs:\n        docs = docs.replace('      - ".github/workflows/local-agent-bootstrap.yml"\\n',\n                            '      - ".github/workflows/local-agent-bootstrap.yml"\\n      - "tools/local-agent/**"\\n')\n'''
if old not in s: raise SystemExit('expected finalizer fragment not found')
p.write_text(s.replace(old,new,1),encoding='utf8')
print('finalizer docs anchor repaired')
