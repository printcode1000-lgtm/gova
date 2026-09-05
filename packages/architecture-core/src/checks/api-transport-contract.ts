import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

import { ROOT, addViolation } from './architecture-types';

export type ApiTransportViolationType =
  | 'direct-json-response'
  | 'direct-json-request'
  | 'snake-case-route-key'
  | 'raw-route-spread'
  | 'row-cast-at-route-boundary'
  | 'legacy-transport-alias'
  | 'snake-case-owned-key'
  | 'sql-outside-data-core'
  | 'raw-data-core-row-import';

export interface ApiTransportViolation {
  readonly type: ApiTransportViolationType;
  readonly file: string;
  readonly line: number;
  readonly detail: string;
}

const API_ROUTE_ROOTS = [
  join(ROOT, 'src', 'app', 'api'),
  ...['control', 'notifications', 'orders', 'products', 'profiles', 'submain', 'sub2main'].map(
    (service) => join(ROOT, 'services', service, 'src', 'app', 'api'),
  ),
];

const OWNED_SOURCE_ROOTS = [join(ROOT, 'src'), join(ROOT, 'packages'), join(ROOT, 'services')];

/** Exact protocol adapters that intentionally speak provider-owned snake_case. */
const EXTERNAL_SNAKE_CASE_FILES = new Map<string, string>([
  ['src/core/config/server-env/server-env.values.turso-env.ts', 'Firebase service-account JSON'],
  ['packages/account-bridge/src/mobile-push/fcm-auth.ts', 'Google OAuth token protocol'],
  ['packages/account-bridge/src/mobile-push/fcm-message.ts', 'Firebase Cloud Messaging protocol'],
  ['packages/notifications-core/src/services/providers/fcm-http-v1.server.ts', 'Firebase Cloud Messaging protocol'],
  ['packages/notifications-core/src/services/providers/fcm-notification-provider.server.ts', 'Firebase Cloud Messaging protocol'],
  ['packages/ota-core/src/publishing/adapters/google-play.adapter.ts', 'Google Play service-account protocol'],
  ['packages/native-core/scripts/sync-android-push-assets.ts', 'google-services.json protocol'],
  ['packages/map-core/src/AsolMap.tsx', 'MapLibre feature properties protocol'],
]);

const DIRECT_JSON_IMPLEMENTATION_FILES = new Set([
  'packages/api-contract-core/src/server.ts',
  'src/core/api/api-response.ts',
]);

const EXTERNAL_JSON_PROTOCOL_FILES = new Set([
  'src/app/.well-known/assetlinks.json/route.ts',
  'src/app/.well-known/apple-app-site-association/route.ts',
]);
const LEGACY_TRANSPORT_ALIASES = new Set([
  'store_name',
  'primary_phone',
  'store_description',
  'rating_average',
]);

function sourceFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(root)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'generated') continue;
    const full = join(root, entry);
    if (statSync(full).isDirectory()) found.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry)) found.push(full);
  }
  return found;
}

function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function propertyName(node: ts.PropertyName | undefined): string | undefined {
  if (!node) return undefined;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return undefined;
}

function isDirectJsonCall(node: ts.CallExpression, expression: string): boolean {
  return node.expression.getText() === expression;
}

function isTestOrFixtureFile(rel: string): boolean {
  return (
    /(^|\/)(tests?|__tests__|fixtures)(\/|$)/.test(rel) ||
    /\.(test|spec)\.[^.]+$/.test(rel) ||
    rel === 'packages/architecture-core/src/checks/api-transport-contract.ts'
  );
}

function isProcessEnvironmentAccess(node: ts.PropertyAccessExpression): boolean {
  const receiver = node.expression.getText();
  return receiver === 'process.env' || receiver.startsWith('process.env.');
}

function isSnakeCaseKey(value: string): boolean {
  return /^[a-z][a-z0-9]*_[a-z0-9_]+$/.test(value);
}

function scanOwnedSource(file: string): ApiTransportViolation[] {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (rel.startsWith('packages/data-core/') || isTestOrFixtureFile(rel)) return [];
  const text = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations: ApiTransportViolation[] = [];
  const report = (type: ApiTransportViolationType, node: ts.Node, detail: string) => {
    violations.push({ type, file: rel, line: lineOf(source, node), detail });
  };
  const externalSnakeCase = EXTERNAL_SNAKE_CASE_FILES.has(rel);
  const directJsonAllowed =
    DIRECT_JSON_IMPLEMENTATION_FILES.has(rel) || EXTERNAL_JSON_PROTOCOL_FILES.has(rel);

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && !rel.endsWith('/route.ts')) {
      if (
        !directJsonAllowed &&
        (isDirectJsonCall(node, 'Response.json') || isDirectJsonCall(node, 'NextResponse.json'))
      ) {
        report(
          'direct-json-response',
          node,
          'Owned JSON serialization must pass through the transport contract boundary.',
        );
      }
      if (!directJsonAllowed && node.expression.getText(source) === 'request.json') {
        report(
          'direct-json-request',
          node,
          'Owned request JSON must pass through readJsonBody/readJsonContractBody.',
        );
      }
    }

    if (!externalSnakeCase) {
      if (
        ts.isPropertyAccessExpression(node) &&
        isSnakeCaseKey(node.name.text) &&
        !isProcessEnvironmentAccess(node)
      ) {
        report(
          'snake-case-owned-key',
          node.name,
          `Application-owned code reads snake_case property ${JSON.stringify(node.name.text)}.`,
        );
      }
      if (
        ts.isElementAccessExpression(node) &&
        ts.isStringLiteral(node.argumentExpression) &&
        isSnakeCaseKey(node.argumentExpression.text)
      ) {
        report(
          'snake-case-owned-key',
          node.argumentExpression,
          `Application-owned code reads snake_case property ${JSON.stringify(node.argumentExpression.text)}.`,
        );
      }
      if (ts.isPropertySignature(node)) {
        const name = propertyName(node.name);
        if (name && isSnakeCaseKey(name)) {
          report(
            'snake-case-owned-key',
            node.name,
            `Application-owned type declares snake_case property ${JSON.stringify(name)}.`,
          );
        }
      }
      if (ts.isBindingElement(node)) {
        const name = propertyName(node.propertyName);
        if (name && isSnakeCaseKey(name)) {
          report(
            'snake-case-owned-key',
            node,
            `Application-owned destructuring reads snake_case property ${JSON.stringify(name)}.`,
          );
        }
      }
    }

    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      if (specifier.startsWith('@asol/data-core') && node.importClause?.namedBindings) {
        const bindings = node.importClause.namedBindings;
        if (ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) {
            const imported = element.propertyName?.text ?? element.name.text;
            if (/(?:Persistence)?Row(?:s)?$/.test(imported)) {
              report(
                'raw-data-core-row-import',
                element,
                `Raw persistence row ${imported} must not leave @asol/data-core.`,
              );
            }
          }
        }
      }
    }

    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      /\b(?:SELECT\s+[\s\S]+\s+FROM|INSERT\s+INTO|UPDATE\s+[a-zA-Z0-9_]+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/i.test(node.text)
    ) {
      report(
        'sql-outside-data-core',
        node,
        'SQL persistence statements are owned by @asol/data-core only.',
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return violations;
}

function scanRoute(file: string): ApiTransportViolation[] {
  const text = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const violations: ApiTransportViolation[] = [];

  const report = (type: ApiTransportViolationType, node: ts.Node, detail: string) => {
    violations.push({ type, file: rel, line: lineOf(source, node), detail });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      if (isDirectJsonCall(node, 'Response.json') || isDirectJsonCall(node, 'NextResponse.json')) {
        report('direct-json-response', node, 'Owned API JSON must pass through apiSuccess/jsonContract, not a direct JSON serializer.');
      }
      if (node.expression.getText() === 'request.json') {
        report('direct-json-request', node, 'Owned request JSON must pass through readJsonBody/request contract validation.');
      }
    }

    if (ts.isPropertyAssignment(node) || ts.isMethodDeclaration(node) || ts.isPropertySignature(node)) {
      const name = propertyName(node.name);
      if (name && /^[a-z][a-z0-9]*_[a-z0-9_]+$/.test(name)) {
        report('snake-case-route-key', node.name, `Owned route declares snake_case key ${JSON.stringify(name)}.`);
      }
    }
    if (ts.isPropertyAccessExpression(node) && /^[a-z][a-z0-9]*_[a-z0-9_]+$/.test(node.name.text)) {
      report('snake-case-route-key', node.name, `Owned route reads snake_case property ${JSON.stringify(node.name.text)}.`);
    }
    if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression) && /^[a-z][a-z0-9]*_[a-z0-9_]+$/.test(node.argumentExpression.text)) {
      report('snake-case-route-key', node.argumentExpression, `Owned route reads snake_case property ${JSON.stringify(node.argumentExpression.text)}.`);
    }
    if (ts.isSpreadAssignment(node) && (ts.isIdentifier(node.expression) || ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) {
      report('raw-route-spread', node, `Route object spread (${node.expression.getText()}) can leak an unowned persistence/provider shape; map explicit DTO fields instead.`);
    }
    if (ts.isAsExpression(node)) {
      const typeText = node.type.getText(source);
      if (/(?:Row|Record)(?:<|\b)/.test(typeText)) {
        report('row-cast-at-route-boundary', node, `Route casts transport data to ${typeText}; use a domain contract/mapper instead.`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return violations;
}

function scanLegacyAliases(): ApiTransportViolation[] {
  const violations: ApiTransportViolation[] = [];
  for (const root of OWNED_SOURCE_ROOTS) {
    for (const file of sourceFiles(root)) {
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      if (rel.startsWith('packages/data-core/')) continue;
      if (rel.startsWith('packages/api-contract-core/src/tests/')) continue;
      if (rel === 'packages/architecture-core/src/checks/api-transport-contract.ts') continue;
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const visit = (node: ts.Node): void => {
        let value: string | undefined;
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) value = node.text;
        else if (ts.isPropertyAccessExpression(node)) value = node.name.text;
        else if (ts.isPropertyAssignment(node) || ts.isPropertySignature(node)) value = propertyName(node.name);
        if (value && LEGACY_TRANSPORT_ALIASES.has(value)) {
          violations.push({
            type: 'legacy-transport-alias',
            file: rel,
            line: lineOf(source, node),
            detail: `Legacy transport alias ${JSON.stringify(value)} is forbidden outside @asol/data-core persistence internals.`,
          });
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
  return violations;
}

export function scanApiTransportContract(): ApiTransportViolation[] {
  const routeViolations = API_ROUTE_ROOTS.flatMap((root) => sourceFiles(root))
    .filter((file) => file.endsWith('/route.ts'))
    .flatMap(scanRoute);
  const projectWideViolations = OWNED_SOURCE_ROOTS.flatMap((root) => sourceFiles(root))
    .flatMap(scanOwnedSource);
  const combined = [...routeViolations, ...projectWideViolations, ...scanLegacyAliases()];
  const unique = new Map<string, ApiTransportViolation>();
  for (const violation of combined) {
    unique.set(
      `${violation.type}:${violation.file}:${violation.line}:${violation.detail}`,
      violation,
    );
  }
  return [...unique.values()].sort(
    (left, right) => left.file.localeCompare(right.file) || left.line - right.line || left.type.localeCompare(right.type),
  );
}

export function checkApiTransportContract(): void {
  for (const violation of scanApiTransportContract()) {
    addViolation(
      'API Transport Contract',
      join(ROOT, violation.file),
      `${violation.type} at line ${violation.line}: ${violation.detail}`,
      'Owned JSON uses camelCase only. Keep snake_case inside @asol/data-core persistence or an explicit provider/protocol adapter, and map DTOs at the owner boundary.',
    );
  }
}
