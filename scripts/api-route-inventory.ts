#!/usr/bin/env tsx
/** AST-derived API route+method inventory and ownership completeness gate. */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { isBusinessApiPath, resolveRouteOwner } from '@asol/account-bridge/routes';

const ROOT = process.cwd();
const API_ROOT = path.join(ROOT, 'src/app/api');
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export interface ApiRouteMethod { path: string; method: string; file: string; owner: string | null; }

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? files(full) : entry.name === 'route.ts' ? [full] : [];
  });
}

function exportedMethods(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const found = new Set<string>();
  for (const statement of source.statements) {
    const exported = ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if (ts.isFunctionDeclaration(statement) || ts.isVariableStatement(statement)) {
      const name = ts.isFunctionDeclaration(statement) ? statement.name?.text : undefined;
      if (name && METHODS.has(name)) found.add(name);
      if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && METHODS.has(declaration.name.text)) found.add(declaration.name.text);
      }
    }
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) if (METHODS.has(element.name.text)) found.add(element.name.text);
    }
  }
  return [...found].sort();
}

function routePath(file: string): string {
  const relative = path.relative(API_ROOT, path.dirname(file)).split(path.sep).join('/');
  return `/api${relative ? `/${relative}` : ''}`;
}

export function inventoryApiRoutes(): ApiRouteMethod[] {
  return files(API_ROOT).flatMap((file) => exportedMethods(file).map((method) => ({
    path: routePath(file), method, file: path.relative(ROOT, file), owner: resolveRouteOwner(method, routePath(file)),
  }))).sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

export function assertCompleteBusinessOwnership(records = inventoryApiRoutes()): void {
  const failures = records.filter((record) => record.method !== 'OPTIONS' && isBusinessApiPath(record.path) && !record.owner);
  if (failures.length) throw new Error(`Unowned business API route methods:\n${failures.map((item) => `${item.method} ${item.path} (${item.file})`).join('\n')}`);
}

if (process.argv[1]?.endsWith('api-route-inventory.ts')) {
  const records = inventoryApiRoutes();
  assertCompleteBusinessOwnership(records);
  for (const record of records) console.log(`${record.method}\t${record.path}\t${record.owner ?? 'gova/dev'}\t${record.file}`);
}
