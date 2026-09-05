#!/usr/bin/env python3
"""Non-mutating readiness check for Remote Desktop Commander execution Mode C."""
import json
import re
import subprocess
from pathlib import Path

CANONICAL_REPO = Path('/home/hesham/gova').resolve()
MCP_ENDPOINT = 'https://mcp.desktopcommander.app/mcp'
EXPECTED_REPOSITORY = 'printcode1000-lgtm/gova'


def run(*args):
    return subprocess.run(args, cwd=CANONICAL_REPO, text=True, capture_output=True, check=False)


def main():
    checks = {}
    checks['canonicalRepoExists'] = (CANONICAL_REPO / '.git').exists()

    top = run('git', 'rev-parse', '--show-toplevel') if checks['canonicalRepoExists'] else None
    repo_root = top.stdout.strip() if top and top.returncode == 0 else ''
    checks['canonicalRepoRoot'] = repo_root == str(CANONICAL_REPO)

    origin = run('git', 'remote', 'get-url', 'origin') if checks['canonicalRepoRoot'] else None
    origin_text = origin.stdout.strip() if origin and origin.returncode == 0 else ''
    checks['repositoryIdentity'] = EXPECTED_REPOSITORY in origin_text

    try:
        mcp = json.loads((CANONICAL_REPO / '.mcp.json').read_text())
        remote = mcp.get('mcpServers', {}).get('remote-desktop-commander', {})
        checks['mcpConfig'] = remote.get('type') == 'http' and remote.get('url') == MCP_ENDPOINT
    except Exception:
        checks['mcpConfig'] = False

    node = subprocess.run(['node', '--version'], text=True, capture_output=True, check=False)
    node_version = node.stdout.strip() if node.returncode == 0 else ''
    match = re.match(r'^v(\d+)', node_version)
    checks['nodeSupported'] = bool(match and int(match.group(1)) >= 18)

    ps = subprocess.run(['ps', '-eo', 'args='], text=True, capture_output=True, check=False)
    checks['deviceAgentRunning'] = any(
        'desktop-commander' in line.lower() and re.search(r'(^|\s)remote(\s|$)', line.lower())
        for line in ps.stdout.splitlines()
    )

    branch = run('git', 'branch', '--show-current').stdout.strip() if checks['canonicalRepoRoot'] else ''
    head = run('git', 'rev-parse', 'HEAD').stdout.strip() if checks['canonicalRepoRoot'] else ''
    status_lines = run('git', 'status', '--porcelain=v1').stdout.splitlines() if checks['canonicalRepoRoot'] else []
    ready = all(checks.values())
    print(json.dumps({
        'mode': 'C',
        'transport': 'remote-desktop-commander',
        'ready': ready,
        'checks': checks,
        'repo': str(CANONICAL_REPO),
        'branch': branch,
        'head': head,
        'dirtyPathCount': len(status_lines),
        'nodeVersion': node_version,
    }, indent=2))
    raise SystemExit(0 if ready else 2)


if __name__ == '__main__':
    main()
