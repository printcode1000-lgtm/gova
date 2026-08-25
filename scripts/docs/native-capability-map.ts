import { pathExists, readRepoText, walkFiles } from './fs-scan';
import type { KnowledgeGraph } from './model';

export interface NativeCapabilityRow {
  platform: 'android' | 'ios' | 'shared';
  capability: string;
  source: string;
  relatedFeatures: string[];
  relatedPackages: string[];
  relatedRoutes: string[];
  relatedScripts: string[];
  notes: string;
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function findRelated(graph: KnowledgeGraph, needle: string): { features: string[]; packages: string[]; routes: string[]; scripts: string[] } {
  const lower = needle.toLowerCase();
  const features: string[] = [];
  const packages: string[] = [];
  const routes: string[] = [];
  const scripts: string[] = [];
  for (const node of graph.nodes) {
    const hay = `${node.name} ${node.path || ''} ${node.summary || ''}`.toLowerCase();
    if (!hay.includes(lower) && !lower.split(/[^a-z0-9]+/).filter((part) => part.length > 3).some((part) => hay.includes(part))) {
      continue;
    }
    if (node.kind === 'feature') features.push(node.path || node.name);
    if (node.kind === 'package') packages.push(node.name);
    if (node.kind === 'route') routes.push(node.name);
    if (node.kind === 'script' || node.kind === 'command') scripts.push(node.path || node.name);
  }
  return {
    features: unique(features).slice(0, 8),
    packages: unique(packages).slice(0, 8),
    routes: unique(routes).slice(0, 8),
    scripts: unique(scripts).slice(0, 8),
  };
}

export function buildNativeCapabilityMap(graph: KnowledgeGraph): NativeCapabilityRow[] {
  const rows: NativeCapabilityRow[] = [];

  const androidManifest = 'android/app/src/main/AndroidManifest.xml';
  if (pathExists(androidManifest)) {
    const content = readRepoText(androidManifest);
    for (const match of content.matchAll(/android:name="([^"]+)"/g)) {
      const name = match[1]!;
      if (!name.includes('permission') && !name.startsWith('android.permission') && !name.includes('Permission')) {
        if (!name.startsWith('android.permission.')) continue;
      }
      const related = findRelated(graph, name.replace(/^android\.permission\./, ''));
      rows.push({
        platform: 'android',
        capability: name,
        source: androidManifest,
        relatedFeatures: related.features,
        relatedPackages: related.packages,
        relatedRoutes: related.routes,
        relatedScripts: related.scripts,
        notes: 'AndroidManifest permission/component',
      });
    }
    for (const match of content.matchAll(/<uses-permission[^>]+android:name="([^"]+)"/g)) {
      const related = findRelated(graph, match[1]!.replace(/^android\.permission\./, ''));
      rows.push({
        platform: 'android',
        capability: match[1]!,
        source: androidManifest,
        relatedFeatures: related.features,
        relatedPackages: related.packages,
        relatedRoutes: related.routes,
        relatedScripts: related.scripts,
        notes: 'uses-permission',
      });
    }
  }

  for (const path of walkFiles('android', (file) => file.endsWith('.xml') || file.endsWith('.gradle') || file.endsWith('.kt') || file.endsWith('.java'))) {
    const content = readRepoText(path);
    if (/notification.?channel|NotificationChannel/i.test(content)) {
      const related = findRelated(graph, 'notification');
      rows.push({
        platform: 'android',
        capability: 'notification-channel',
        source: path,
        relatedFeatures: related.features,
        relatedPackages: related.packages,
        relatedRoutes: related.routes,
        relatedScripts: related.scripts,
        notes: 'notification channel configuration evidence',
      });
    }
    if (/@capacitor\/|CapacitorPlugin|registerPlugin/i.test(content)) {
      const related = findRelated(graph, 'capacitor');
      rows.push({
        platform: 'android',
        capability: 'capacitor-plugin-wiring',
        source: path,
        relatedFeatures: related.features,
        relatedPackages: related.packages,
        relatedRoutes: related.routes,
        relatedScripts: related.scripts,
        notes: 'Capacitor plugin/native wiring evidence',
      });
    }
  }

  const entitlements = 'ios/App/App/App.entitlements';
  if (pathExists(entitlements)) {
    const content = readRepoText(entitlements);
    for (const match of content.matchAll(/<key>([^<]+)<\/key>/g)) {
      const key = match[1]!;
      if (!key || key.startsWith('com.apple.') || key.includes('aps') || key.includes('associated') || key.includes('application-identifier') || key.includes('keychain') || key.includes('push')) {
        const related = findRelated(graph, key);
        rows.push({
          platform: 'ios',
          capability: key,
          source: entitlements,
          relatedFeatures: related.features,
          relatedPackages: related.packages,
          relatedRoutes: related.routes,
          relatedScripts: related.scripts,
          notes: 'entitlement key',
        });
      }
    }
  }

  const infoPlist = 'ios/App/App/Info.plist';
  if (pathExists(infoPlist)) {
    const content = readRepoText(infoPlist);
    for (const match of content.matchAll(/<key>([^<]*UsageDescription|UIBackgroundModes|CFBundleURLTypes|NS[A-Za-z]+)<\/key>/g)) {
      const related = findRelated(graph, match[1]!);
      rows.push({
        platform: 'ios',
        capability: match[1]!,
        source: infoPlist,
        relatedFeatures: related.features,
        relatedPackages: related.packages,
        relatedRoutes: related.routes,
        relatedScripts: related.scripts,
        notes: 'Info.plist capability/usage key',
      });
    }
  }

  if (pathExists('capacitor.config.ts')) {
    const content = readRepoText('capacitor.config.ts');
    const related = findRelated(graph, 'capacitor');
    rows.push({
      platform: 'shared',
      capability: 'capacitor-config',
      source: 'capacitor.config.ts',
      relatedFeatures: related.features,
      relatedPackages: related.packages,
      relatedRoutes: related.routes,
      relatedScripts: related.scripts,
      notes: /webDir:\s*['"]out['"]/.test(content)
        ? 'Capacitor webDir consumes static out/'
        : 'Capacitor config present; verify webDir contract',
    });
  }

  // Deduplicate exact rows
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.platform}|${row.capability}|${row.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.platform.localeCompare(b.platform) || a.capability.localeCompare(b.capability) || a.source.localeCompare(b.source));
}

export function renderNativeCapabilityMap(graph: KnowledgeGraph): string {
  const rows = buildNativeCapabilityMap(graph);
  const banner = `<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->
`;
  const lines = [
    banner,
    '# Native Capability Map',
    '',
    `Entries: **${rows.length}**`,
    '',
    '| Platform | Capability | Source | Features | Packages | Notes |',
    '|---|---|---|---|---|---|',
  ];
  for (const row of rows) {
    lines.push(
      `| ${row.platform} | \`${row.capability.replace(/\|/g, '\\|')}\` | \`${row.source}\` | ${row.relatedFeatures.map((item) => `\`${item}\``).join(', ') || 'unknown'} | ${row.relatedPackages.map((item) => `\`${item}\``).join(', ') || 'unknown'} | ${row.notes.replace(/\|/g, '\\|')} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}
