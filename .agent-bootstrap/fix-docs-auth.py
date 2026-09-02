#!/usr/bin/env python3
from pathlib import Path
p=Path('/home/hesham/gova-agents/integration/.agent-bootstrap/finalize-runtime.py')
s=p.read_text(encoding='utf8')
anchor="STATE.mkdir(parents=True, exist_ok=True)\n"
if anchor not in s:
    raise SystemExit('docs auth environment anchor not found')
s=s.replace(anchor, anchor+"os.environ['DOCS_CONTRACT_CHANGE']='1'\n",1)
s=s.replace("run(['git','commit','-m','infra(local-agent): finalize persistent runtime'])","run(['git','commit','-m','infra(local-agent): finalize persistent runtime [docs-contract-change]'])",1)
s=s.replace("run(['git','commit','-m','docs(local-agent): record final runtime verification'])","run(['git','commit','-m','docs(local-agent): record final runtime verification [docs-contract-change]'])",1)
p.write_text(s,encoding='utf8')
print('explicit docs contract authorization wired into finalizer and commit messages')
