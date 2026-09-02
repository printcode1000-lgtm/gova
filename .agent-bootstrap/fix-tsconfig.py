#!/usr/bin/env python3
from pathlib import Path
p=Path('/home/hesham/gova-agents/integration/tsconfig.json')
s=p.read_text(encoding='utf8')
for line in [
    '      "@asol/local-agent-core": ["./packages/local-agent-core/src/index.ts"],\n',
    '      "@asol/local-agent-core/monitor": ["./packages/local-agent-core/src/monitor.ts"],\n',
    '      "@asol/local-agent-core/host": ["./packages/local-agent-core/src/host.ts"],\n',
]:
    if line not in s:
        raise SystemExit('expected retired tsconfig alias not found: '+line.strip())
    s=s.replace(line,'',1)
p.write_text(s,encoding='utf8')
print('retired local-agent-core TypeScript aliases removed')
