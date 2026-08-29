/**
 * Turns the analyzer's inventory into source edits: one literal uid per
 * still-unregistered project-owned DOM usage site, written as
 * `{...uiAttributes({...})}` on a raw intrinsic host or `ui={{...}}` on a
 * generic-primitive usage. Never touches a site that already has one.
 */
import { readFileSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { buildDomIdentityInventory, isActionableDomUsage, type DomUsageSite } from './analyzer';
import { fileSemanticPrefix, mintSemanticId, mintUid } from './mint';
import { parseTsx } from './tsx-ast';

export interface UidMigrationEdit {
  readonly file: string;
  readonly insertAt: number;
  readonly kind: 'intrinsic' | 'primitive';
  readonly tag: string;
  readonly uid: string;
  readonly id: string;
}

export interface UidMigrationSkip {
  readonly file: string;
  readonly line: number;
  readonly tag: string;
}

function insertionPoint(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): number {
  const keyAttribute = node.attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.getText() === 'key',
  );
  return keyAttribute ? keyAttribute.getEnd() : node.tagName.getEnd();
}

function collectTakenUids(root: string, sources: ReadonlyMap<string, string>): Set<string> {
  const uids = new Set<string>();
  for (const source of sources.values()) {
    for (const match of source.matchAll(/\buid:\s*["']([^"']+)["']/g)) uids.add(match[1]!);
  }
  try {
    const registrySource = readFileSync(
      join(root, 'packages', 'ui-registry-core', 'src', 'registry', 'ui-page-registry.ts'),
      'utf8',
    );
    for (const match of registrySource.matchAll(/\buid:\s*["']([^"']+)["']/g)) uids.add(match[1]!);
  } catch {
    // Registry file always exists in this repo.
  }
  return uids;
}

function collectTakenIds(sources: ReadonlyMap<string, string>): Set<string> {
  const ids = new Set<string>();
  for (const source of sources.values()) {
    for (const match of source.matchAll(/\bid:\s*["']([^"']+)["']/g)) ids.add(match[1]!);
    for (const match of source.matchAll(/\bid="([^"]+)"/g)) ids.add(match[1]!);
  }
  return ids;
}

export interface UidMigrationPlan {
  readonly edits: readonly UidMigrationEdit[];
  readonly skipped: readonly UidMigrationSkip[];
  readonly importsNeeded: ReadonlySet<string>;
}

export function planUidMigration(root: string): UidMigrationPlan {
  const inventory = buildDomIdentityInventory(root);
  const takenUids = collectTakenUids(root, inventory.sources);
  const takenIds = collectTakenIds(inventory.sources);
  const edits: UidMigrationEdit[] = [];
  const skipped: UidMigrationSkip[] = [];
  const importsNeeded = new Set<string>();

  const byFile = new Map<string, DomUsageSite[]>();
  for (const site of inventory.sites) {
    if (!isActionableDomUsage(site)) continue;
    const list = byFile.get(site.file) ?? [];
    list.push(site);
    byFile.set(site.file, list);
  }

  for (const [file, sites] of byFile) {
    const prefix = fileSemanticPrefix(file);
    const source = inventory.sources.get(file)!;
    let needsImport = false;
    for (const site of sites) {
      if (site.hasUiRegistration) continue;
      if (site.hasForeignSpread) {
        skipped.push({ file, line: site.line, tag: site.tagOrComponent });
        continue;
      }
      const id = mintSemanticId(prefix, site.tagOrComponent, takenIds);
      const uid = mintUid(id, takenUids);
      edits.push({
        file,
        insertAt: insertionPoint(site.node),
        kind: site.ownership.kind === 'intrinsic' ? 'intrinsic' : 'primitive',
        tag: site.tagOrComponent,
        uid,
        id,
      });
      if (site.ownership.kind === 'intrinsic') needsImport = true;
    }
    if (needsImport && !/import\s*\{[^}]*\buiAttributes\b[^}]*\}\s*from\s*["']@asol\/ui-registry-core["']/.test(source)) {
      importsNeeded.add(file);
    }
  }

  return { edits, skipped, importsNeeded };
}

function attributeText(edit: UidMigrationEdit): string {
  if (edit.kind === 'intrinsic') {
    return ` {...uiAttributes({ uid: "${edit.uid}", id: "${edit.id}" })}`;
  }
  return ` ui={{ uid: "${edit.uid}", id: "${edit.id}" }}`;
}

function insertImport(file: string, source: string): string {
  const sourceFile = parseTsx(file, source);
  let insertAt = 0;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
      insertAt = statement.getEnd();
    } else if (
      insertAt === 0 &&
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression) &&
      statement.expression.text === 'use client'
    ) {
      insertAt = statement.getEnd();
    } else if (insertAt > 0) {
      break;
    }
  }
  return `${source.slice(0, insertAt)}\nimport { uiAttributes } from "@asol/ui-registry-core";${source.slice(insertAt)}`;
}

export function applyUidMigration(root: string): {
  editedFiles: number;
  intrinsicAssigned: number;
  primitiveAssigned: number;
  skipped: number;
} {
  const plan = planUidMigration(root);
  const inventory = buildDomIdentityInventory(root); // fresh source snapshot to edit
  const byFile = new Map<string, UidMigrationEdit[]>();
  for (const edit of plan.edits) {
    const list = byFile.get(edit.file) ?? [];
    list.push(edit);
    byFile.set(edit.file, list);
  }

  let intrinsicAssigned = 0;
  let primitiveAssigned = 0;
  for (const [file, edits] of byFile) {
    const ordered = [...edits].sort((left, right) => right.insertAt - left.insertAt);
    let source = inventory.sources.get(file)!;
    for (const edit of ordered) {
      source = `${source.slice(0, edit.insertAt)}${attributeText(edit)}${source.slice(edit.insertAt)}`;
      if (edit.kind === 'intrinsic') intrinsicAssigned += 1;
      else primitiveAssigned += 1;
    }
    if (plan.importsNeeded.has(file)) source = insertImport(file, source);
    writeFileSync(join(root, file), source, 'utf8');
  }

  return { editedFiles: byFile.size, intrinsicAssigned, primitiveAssigned, skipped: plan.skipped.length };
}
