/**
 * The complete, deterministic catalog of every canonical source `ui.uid` in
 * the repository — every literal descriptor (`uiAttributes()`, `ui={{}}`,
 * a `Record<string, UiDescriptor>` member) that declares both `uid` and
 * `id`, plus every `UI_PAGE_REGISTRY` entry. This is a *derived inventory*:
 * `npm run ui-registry:generated-catalog:generate` renders it, and
 * `npm run ui-registry:generated-catalog:check` fails the build on drift —
 * it is never hand-edited, and it stores no runtime or instance value.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { findDescriptorLiterals } from './descriptor-literals';
import { parseTsx } from './tsx-ast';

export interface UidCatalogEntry {
  readonly uid: string;
  readonly id: string;
  readonly kind: 'page' | 'element';
  readonly sourceFile: string;
  readonly sourceLine: number;
}

function sourceFilesUnder(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      if (entry !== 'tests' && entry !== '__tests__' && entry !== 'node_modules' && entry !== 'generated' && entry !== 'dist') {
        files.push(...sourceFilesUnder(fullPath));
      }
      continue;
    }
    if (/\.tsx?$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.test.tsx')) files.push(fullPath);
  }
  return files;
}

function pageRegistryEntries(root: string): UidCatalogEntry[] {
  const registryPath = join(root, 'packages', 'ui-registry-core', 'src', 'registry', 'ui-page-registry.ts');
  let source: string;
  try {
    source = readFileSync(registryPath, 'utf8');
  } catch {
    return [];
  }
  const registrySource = source.match(/export const UI_PAGE_REGISTRY = \[([\s\S]*?)\] as const/)?.[1] ?? '';
  const entries: UidCatalogEntry[] = [];
  for (const match of registrySource.matchAll(/\{([^{}]*)\}/g)) {
    const body = match[1]!;
    const uid = body.match(/\buid:\s*"([^"]*)"/)?.[1];
    const id = body.match(/\bid:\s*"([^"]*)"/)?.[1];
    if (!uid || !id) continue;
    const line = source.slice(0, source.indexOf(match[0])).split('\n').length;
    entries.push({ uid, id, kind: 'page', sourceFile: relative(root, registryPath).replace(/\\/g, '/'), sourceLine: line });
  }
  return entries;
}

/** Every literal `{ uid, id, ... }` descriptor in `src/` and `packages/`. */
export function collectUidCatalog(root: string): UidCatalogEntry[] {
  const entries: UidCatalogEntry[] = [...pageRegistryEntries(root)];
  const seenUids = new Set(entries.map((entry) => entry.uid));

  for (const directory of [join(root, 'src'), join(root, 'packages')]) {
    for (const file of sourceFilesUnder(directory)) {
      const relativePath = relative(root, file).replace(/\\/g, '/');
      const source = readFileSync(file, 'utf8');
      const sourceFile = parseTsx(file, source);
      for (const literal of findDescriptorLiterals(relativePath, source, sourceFile)) {
        if (!literal.fields.has('id')) continue;
        const uidField = literal.fields.get('uid');
        const idField = literal.fields.get('id')!;
        if (!uidField || uidField.isComputed || idField.isComputed) continue;
        const uid = uidField.literalValue!;
        if (seenUids.has(uid)) continue; // duplicates are ui-attribute-contract's job to report
        seenUids.add(uid);
        entries.push({ uid, id: idField.literalValue!, kind: 'element', sourceFile: relativePath, sourceLine: literal.line });
      }
    }
  }

  return entries.sort((left, right) => left.uid.localeCompare(right.uid));
}
