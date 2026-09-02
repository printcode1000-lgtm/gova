#!/usr/bin/env python3
from pathlib import Path
p=Path('/home/hesham/gova-agents/integration/.agent-bootstrap/finalize-runtime.py')
s=p.read_text(encoding='utf8')
old="""            text = md.read_text(encoding='utf8')
            text = text.replace('agent-request/chatgpt', 'integration')
"""
new="""            try:
                text = md.read_text(encoding='utf8')
            except UnicodeDecodeError:
                continue
            text = text.replace('agent-request/chatgpt', 'integration')
"""
if old not in s:
    raise SystemExit('encoding cleanup anchor not found')
p.write_text(s.replace(old,new,1),encoding='utf8')
print('legacy documentation scan now skips non-UTF8 markdown files')
