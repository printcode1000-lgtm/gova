import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const instructionSurfaces = [
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.agents/rules/agent-instructions.md',
];

const mcp = JSON.parse(read('.mcp.json'));
assert.deepEqual(mcp.mcpServers?.['remote-desktop-commander'], {
  type: 'http',
  url: 'https://mcp.desktopcommander.app/mcp',
});

for (const path of instructionSurfaces) {
  const body = read(path);
  assert.match(body, /\*\*C — Remote Desktop Commander:\*\*/);
  assert.ok(body.includes('exclusive execution channel for the entire task'));
  assert.ok(body.includes('tools/local-agent/mode_c_preflight.py'));
  assert.ok(body.includes('GitHub connector'));
}

const cli = read('tools/local-agent/cli.py');
assert.ok(cli.includes("choices=('A','B','C')"));

const gateway = read('tools/local-agent/gateway.py');
assert.ok(gateway.includes("EXECUTION_MODES = {'A', 'B', 'C'}"));
assert.ok(gateway.includes("'remote-desktop-commander'"));
assert.ok(gateway.includes('Gateway managed execution is unavailable for Mode C'));

const preflight = read('tools/local-agent/mode_c_preflight.py');
assert.ok(preflight.includes("CANONICAL_REPO = Path('/home/hesham/gova').resolve()"));
assert.ok(preflight.includes("MCP_ENDPOINT = 'https://mcp.desktopcommander.app/mcp'"));

const docs = read('docs/06-super-admin-and-operations/remote-desktop-commander-mode.md');
assert.ok(docs.includes('exclusive execution transport'));
assert.ok(docs.includes('must never silently fall back'));

console.log('Local-agent Mode C contract tests passed.');
