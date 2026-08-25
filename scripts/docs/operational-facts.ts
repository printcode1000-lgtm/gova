import { pathExists, readRepoJson, readRepoText } from './fs-scan';

interface RootManifest {
  scripts?: Record<string, string>;
  workspaces?: string[];
  engines?: Record<string, string>;
  packageManager?: string;
}

export interface OperationalFacts {
  scripts: Array<{ name: string; command: string }>;
  environmentKeys: string[];
  workspaces: string[];
  engines: Array<{ name: string; range: string }>;
  packageManager?: string;
}

export function redactEnvironmentAssignments(command: string): string {
  return command.replace(
    /(^|\s)([A-Z][A-Z0-9_]*)=(?:"[^"]*"|'[^']*'|[^\s]+)/g,
    (_match, prefix: string, key: string) => `${prefix}${key}=<redacted>`,
  );
}

export function collectOperationalFacts(): OperationalFacts {
  const manifest = readRepoJson<RootManifest>('package.json');
  const environmentKeys = new Set<string>();
  if (pathExists('.env.example')) {
    for (const line of readRepoText('.env.example').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/);
      if (match) environmentKeys.add(match[1]);
    }
  }

  return {
    scripts: Object.entries(manifest.scripts || {})
      .map(([name, command]) => ({ name, command: redactEnvironmentAssignments(command) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    environmentKeys: [...environmentKeys].sort(),
    workspaces: [...(manifest.workspaces || [])].sort(),
    engines: Object.entries(manifest.engines || {})
      .map(([name, range]) => ({ name, range }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    packageManager: manifest.packageManager,
  };
}

function cell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function renderOperationalCatalog(): string {
  const facts = collectOperationalFacts();
  const lines = [
    '<!-- GENERATED FILE. DO NOT EDIT BY HAND.',
    '     Source: package.json + .env.example key names.',
    '     Regenerate: npm run docs:generate',
    '     Validate: npm run docs:ci -->',
    '',
    '# Operational Catalog',
    '',
    'This catalog exposes command and environment **names only**. Environment assignment values embedded in npm scripts are replaced with `<redacted>` and runtime environment values are never emitted.',
    '',
    '## Runtime',
    '',
    '| Item | Value |',
    '|---|---|',
  ];
  if (facts.packageManager) lines.push(`| Package manager | \`${cell(facts.packageManager)}\` |`);
  for (const engine of facts.engines) lines.push(`| Engine \`${cell(engine.name)}\` | \`${cell(engine.range)}\` |`);
  lines.push('', '## Workspaces', '');
  for (const workspace of facts.workspaces) lines.push(`- \`${cell(workspace)}\``);
  lines.push('', '## npm Scripts', '', '| Command | Implementation |', '|---|---|');
  for (const script of facts.scripts) lines.push(`| \`npm run ${cell(script.name)}\` | \`${cell(script.command)}\` |`);
  lines.push('', '## Environment Key Names', '');
  for (const key of facts.environmentKeys) lines.push(`- \`${key}\``);
  lines.push('');
  return lines.join('\n');
}
