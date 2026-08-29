import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { findDescriptorLiterals } from './descriptor-literals';
import { readUiPageRegistryAst } from './page-registry-reader';
import { parseTsx } from './tsx-ast';

export interface UidCatalogEntry {
  readonly uid: string;
  readonly id: string;
  readonly kind: 'page' | 'element';
  readonly sourceFile: string;
  readonly sourceLine: number;
}

function sourceFilesUnder(directory: string): string[] {
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) return [];
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
  const source = readFileSync(registryPath, 'utf8');
  const label = relative(root, registryPath).replace(/\\/g, '/');
  return readUiPageRegistryAst(label, source).map((entry) => ({
    uid: entry.uid,
    id: entry.id,
    kind: 'page' as const,
    sourceFile: label,
    sourceLine: entry.line,
  }));
}

function addUnique(
  entries: UidCatalogEntry[],
  owners: Map<string, UidCatalogEntry>,
  entry: UidCatalogEntry,
): void {
  const existing = owners.get(entry.uid);
  if (existing) {
    throw new Error(
      `Duplicate canonical UID "${entry.uid}": ${existing.sourceFile}:${existing.sourceLine} and ${entry.sourceFile}:${entry.sourceLine}`,
    );
  }
  owners.set(entry.uid, entry);
  entries.push(entry);
}

/**
 * Complete deterministic tooling catalog of every source-owned canonical UID.
 * The same AST descriptor reader handles inline descriptors, typed
 * `UiDescriptor` constants and descriptor maps; duplicates are an immediate
 * generation failure, never silently de-duplicated.
 */
export function collectUidCatalog(root: string): UidCatalogEntry[] {
  const entries: UidCatalogEntry[] = [];
  const owners = new Map<string, UidCatalogEntry>();

  for (const entry of pageRegistryEntries(root)) addUnique(entries, owners, entry);

  for (const directory of [join(root, 'src'), join(root, 'packages')]) {
    for (const file of sourceFilesUnder(directory)) {
      const relativePath = relative(root, file).replace(/\\/g, '/');
      const source = readFileSync(file, 'utf8');
      const sourceFile = parseTsx(relativePath, source);
      for (const literal of findDescriptorLiterals(relativePath, source, sourceFile)) {
        if (!literal.fields.has('id')) continue;
        const uidField = literal.fields.get('uid');
        const idField = literal.fields.get('id')!;
        if (!uidField || uidField.isComputed || idField.isComputed || uidField.literalValue === null || idField.literalValue === null) continue;
        addUnique(entries, owners, {
          uid: uidField.literalValue,
          id: idField.literalValue,
          kind: 'element',
          sourceFile: relativePath,
          sourceLine: literal.line,
        });
      }
    }
  }

  return entries.sort((left, right) => left.uid.localeCompare(right.uid));
}
