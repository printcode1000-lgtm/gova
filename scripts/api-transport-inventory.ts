#!/usr/bin/env tsx
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { resolveRouteOwner } from '@asol/account-bridge/routes';

const ROOT = process.cwd();
const APP_ROOT = path.join(ROOT, 'src/app');
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const SERVICE_OWNERS = new Set(['control', 'notifications', 'orders', 'products', 'profiles', 'sub2main', 'submain']);

export interface ApiTransportInventoryRecord {
  route: string;
  method: string;
  file: string;
  owner: string;
  sourceKind: 'owned' | 'development' | 'external-protocol';
  jsonEgress: 'contract' | 'direct-json' | 'non-json-or-delegated';
  requestJson: 'contract' | 'direct-json' | 'none';
  serviceMirror: string | null;
}

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return files(full);
    return entry.name === 'route.ts' ? [full] : [];
  });
}

function methods(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const found = new Set<string>();
  for (const statement of source.statements) {
    const exported = ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if (ts.isFunctionDeclaration(statement) && statement.name && METHODS.has(statement.name.text)) found.add(statement.name.text);
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && METHODS.has(declaration.name.text)) found.add(declaration.name.text);
    }
  }
  return [...found].sort();
}

function routeOf(file: string): string {
  const relative = path.relative(APP_ROOT, path.dirname(file)).split(path.sep).join('/');
  return `/${relative}`.replace(/\/route$/, '');
}

export function inventoryApiTransport(): ApiTransportInventoryRecord[] {
  return files(APP_ROOT).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    const route = routeOf(file);
    const externalProtocol = route.startsWith('/.well-known/');
    const routeOwner = route.startsWith('/api/') ? resolveRouteOwner('GET', route) : null;
    const hasContractEgress = /\bapiSuccess\s*\(|\bjsonContract(?:Response)?\s*\(/.test(source);
    const hasDirectJson = /\b(?:Response|NextResponse)\.json\s*\(/.test(source);
    const hasContractRequest = /\breadJsonBody\s*(?:<[^>]+>)?\s*\(|\brunSuperAdminJsonRoute\s*\(/.test(source);
    const hasDirectRequest = /\brequest\.json\s*\(/.test(source);

    return methods(file).map((method) => {
      const owner = route.startsWith('/api/')
        ? (resolveRouteOwner(method, route) ?? 'gova/dev')
        : 'external-protocol';
      const serviceMirror = SERVICE_OWNERS.has(owner)
        ? path.join('services', owner, 'src/app', route, 'route.ts').replace(/\\/g, '/')
        : null;
      return {
        route,
        method,
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        owner,
        sourceKind: externalProtocol ? 'external-protocol' : owner === 'gova/dev' ? 'development' : 'owned',
        jsonEgress: hasContractEgress ? 'contract' : hasDirectJson ? 'direct-json' : 'non-json-or-delegated',
        requestJson: hasContractRequest ? 'contract' : hasDirectRequest ? 'direct-json' : 'none',
        serviceMirror: serviceMirror && existsSync(path.join(ROOT, serviceMirror)) ? serviceMirror : serviceMirror,
      } satisfies ApiTransportInventoryRecord;
    });
  }).sort((a, b) => a.route.localeCompare(b.route) || a.method.localeCompare(b.method));
}

if (process.argv[1]?.endsWith('api-transport-inventory.ts')) {
  process.stdout.write(`${JSON.stringify(inventoryApiTransport(), null, 2)}\n`);
}
