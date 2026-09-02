import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';

import { ROOT, addViolation } from './architecture-types';

export const STATIC_DOM_RUNTIME_ID_REGISTRY = 'src/shared/dom/identity/static-ids.json';
export const STATIC_DOM_RUNTIME_ID_SOURCE_ALLOWLIST = ['src/app', 'src/features', 'src/shared', 'packages'] as const;

const SHELL_CONSUMER = 'src/shared/layouts/AppShell.tsx';
const EXCLUDED_PATH_PARTS = [
  '/node_modules/',
  '/dist/',
  '/.next/',
  '/out/',
  '/generated/',
  '/src/tests/',
  '/tests/',
  '.test.',
  '.spec.',
];
const SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/;
const REGISTRY_IMPORT_PATTERN = /(?:^|\/)dom\/identity\/static-ids\.json$/;

export type StaticDomRuntimeRegistryViolationType =
  | 'registry-missing'
  | 'registry-invalid'
  | 'registry-duplicate-id'
  | 'registered-id-literal-duplication'
  | 'registered-static-id-duplicate'
  | 'stale-registry-id'
  | 'unregistered-runtime-id'
  | 'shell-registry-not-consumed';

export interface StaticDomRuntimeRegistryViolation {
  readonly file: string;
  readonly line: number;
  readonly type: StaticDomRuntimeRegistryViolationType;
  readonly message: string;
}

export interface StaticDomRuntimeRegistryResult {
  readonly registryIds: ReadonlyMap<string, string>;
  readonly staticIds: ReadonlyMap<string, readonly string[]>;
  readonly runtimeIds: ReadonlyMap<string, readonly string[]>;
  readonly violations: readonly StaticDomRuntimeRegistryViolation[];
}

interface ScanOptions {
  readonly root?: string;
  readonly requireShellConsumer?: boolean;
}

interface RegistryFile {
  readonly version: number;
  readonly ids: unknown;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function lineOf(source: ts.SourceFile, position: number): number {
  return source.getLineAndCharacterOfPosition(position).line + 1;
}

function collectSourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    if (!existsSync(current)) return;
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const normalized = normalizePath(full);
      if (EXCLUDED_PATH_PARTS.some((part) => normalized.includes(part))) continue;
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (SOURCE_EXTENSION.test(entry)) out.push(full);
    }
  };
  for (const sourceRoot of STATIC_DOM_RUNTIME_ID_SOURCE_ALLOWLIST) walk(join(root, sourceRoot));
  return out.sort((a, b) => normalizePath(a).localeCompare(normalizePath(b)));
}

function flattenRegistryIds(value: unknown, prefix = '', out = new Map<string, string>()): Map<string, string> {
  if (typeof value === 'string') {
    if (!prefix) throw new Error('Registry id must have a named key.');
    out.set(prefix, value);
    return out;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Registry node "${prefix || '<root>'}" must be an object or string.`);
  }
  for (const [key, child] of Object.entries(value)) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key)) throw new Error(`Invalid registry key "${key}".`);
    flattenRegistryIds(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function readRegistry(root: string): Map<string, string> {
  const path = join(root, STATIC_DOM_RUNTIME_ID_REGISTRY);
  if (!existsSync(path)) throw new Error(`Missing ${STATIC_DOM_RUNTIME_ID_REGISTRY}.`);
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as RegistryFile;
  if (parsed.version !== 1) throw new Error(`${STATIC_DOM_RUNTIME_ID_REGISTRY} must have version 1.`);
  return flattenRegistryIds(parsed.ids);
}

function registryImportNames(source: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!REGISTRY_IMPORT_PATTERN.test(statement.moduleSpecifier.text)) continue;
    const clause = statement.importClause;
    if (clause?.name) names.add(clause.name.text);
  }
  return names;
}

function accessPath(expression: ts.Expression): { root: string; parts: string[] } | undefined {
  if (ts.isIdentifier(expression)) return { root: expression.text, parts: [] };
  if (ts.isPropertyAccessExpression(expression)) {
    const base = accessPath(expression.expression);
    return base ? { root: base.root, parts: [...base.parts, expression.name.text] } : undefined;
  }
  if (ts.isElementAccessExpression(expression) && expression.argumentExpression && ts.isStringLiteralLike(expression.argumentExpression)) {
    const base = accessPath(expression.expression);
    return base ? { root: base.root, parts: [...base.parts, expression.argumentExpression.text] } : undefined;
  }
  return undefined;
}

function resolveRegistryExpression(
  expression: ts.Expression,
  importNames: ReadonlySet<string>,
  registryIds: ReadonlyMap<string, string>,
): { key: string; id: string } | undefined {
  const access = accessPath(expression);
  if (!access || !importNames.has(access.root) || access.parts.length === 0) return undefined;
  const parts = access.parts[0] === 'ids' ? access.parts.slice(1) : access.parts;
  if (parts.length === 0) return undefined;
  const key = parts.join('.');
  const id = registryIds.get(key);
  return id ? { key, id } : undefined;
}

function isIntrinsicTagName(tagName: ts.JsxTagNameExpression): boolean {
  return ts.isIdentifier(tagName) && tagName.text[0] === tagName.text[0]?.toLowerCase();
}

function idAttribute(node: ts.JsxOpeningLikeElement): ts.JsxAttribute | undefined {
  return node.attributes.properties.filter(ts.isJsxAttribute).find((attribute) => attribute.name.getText() === 'id');
}

function addLocation(map: Map<string, string[]>, id: string, location: string): void {
  const list = map.get(id) ?? [];
  list.push(location);
  map.set(id, list);
}

function staticIdFromAttribute(
  attribute: ts.JsxAttribute,
  importNames: ReadonlySet<string>,
  registryIds: ReadonlyMap<string, string>,
): { id: string; registryBacked: boolean } | undefined {
  const initializer = attribute.initializer;
  if (!initializer) return undefined;
  if (ts.isStringLiteral(initializer)) return { id: initializer.text, registryBacked: false };
  if (!ts.isJsxExpression(initializer) || !initializer.expression) return undefined;
  const resolved = resolveRegistryExpression(initializer.expression, importNames, registryIds);
  return resolved ? { id: resolved.id, registryBacked: true } : undefined;
}

function literalRuntimeId(expression: ts.Expression): { id: string; literal: boolean } | undefined {
  if (ts.isStringLiteralLike(expression)) return { id: expression.text, literal: true };
  return undefined;
}

function selectorRuntimeId(
  expression: ts.Expression,
  importNames: ReadonlySet<string>,
  registryIds: ReadonlyMap<string, string>,
): { id: string; literal: boolean } | undefined {
  if (ts.isStringLiteralLike(expression)) {
    const match = expression.text.match(/^#([A-Za-z][A-Za-z0-9_:.-]*)\b/);
    return match ? { id: match[1], literal: true } : undefined;
  }
  if (ts.isTemplateExpression(expression) && expression.head.text === '#' && expression.templateSpans.length === 1) {
    const [span] = expression.templateSpans;
    if (span.literal.text !== '') return undefined;
    const resolved = resolveRegistryExpression(span.expression, importNames, registryIds);
    return resolved ? { id: resolved.id, literal: false } : undefined;
  }
  return undefined;
}

function registryRuntimeId(
  expression: ts.Expression,
  importNames: ReadonlySet<string>,
  registryIds: ReadonlyMap<string, string>,
): { id: string; literal: boolean } | undefined {
  const resolved = resolveRegistryExpression(expression, importNames, registryIds);
  return resolved ? { id: resolved.id, literal: false } : undefined;
}

export function scanStaticDomRuntimeRegistry(options: ScanOptions = {}): StaticDomRuntimeRegistryResult {
  const root = options.root ?? ROOT;
  const violations: StaticDomRuntimeRegistryViolation[] = [];
  let registryIds = new Map<string, string>();
  try {
    registryIds = readRegistry(root);
  } catch (error) {
    violations.push({
      file: STATIC_DOM_RUNTIME_ID_REGISTRY,
      line: 1,
      type: existsSync(join(root, STATIC_DOM_RUNTIME_ID_REGISTRY)) ? 'registry-invalid' : 'registry-missing',
      message: error instanceof Error ? error.message : String(error),
    });
    return { registryIds, staticIds: new Map(), runtimeIds: new Map(), violations };
  }

  const valueToKey = new Map<string, string>();
  for (const [key, id] of registryIds) {
    const existing = valueToKey.get(id);
    if (existing) {
      violations.push({
        file: STATIC_DOM_RUNTIME_ID_REGISTRY,
        line: 1,
        type: 'registry-duplicate-id',
        message: `Registry keys "${existing}" and "${key}" both map to "${id}".`,
      });
    } else valueToKey.set(id, key);
  }

  const registeredValues = new Set(registryIds.values());
  const staticIds = new Map<string, string[]>();
  const runtimeIds = new Map<string, string[]>();
  const shellRegistryUses: string[] = [];

  for (const file of collectSourceFiles(root)) {
    const rel = normalizePath(relative(root, file));
    const content = readFileSync(file, 'utf8');
    const kind = file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, kind);
    const importNames = registryImportNames(source);

    const visit = (node: ts.Node): void => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && isIntrinsicTagName(node.tagName)) {
        const attribute = idAttribute(node);
        if (attribute) {
          const info = staticIdFromAttribute(attribute, importNames, registryIds);
          if (info) {
            const location = `${rel}:${lineOf(source, node.getStart(source))}`;
            addLocation(staticIds, info.id, location);
            if (info.registryBacked && rel === SHELL_CONSUMER) shellRegistryUses.push(location);
          }
        }
      }

      if (ts.isStringLiteralLike(node) && registeredValues.has(node.text)) {
        violations.push({
          file: rel,
          line: lineOf(source, node.getStart(source)),
          type: 'registered-id-literal-duplication',
          message: `Registered id "${node.text}" must be consumed from ${STATIC_DOM_RUNTIME_ID_REGISTRY}, not duplicated as a source literal.`,
        });
      }

      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.arguments.length > 0) {
        const method = node.expression.name.text;
        let runtime: { id: string; literal: boolean } | undefined;
        if (method === 'getElementById') {
          runtime = registryRuntimeId(node.arguments[0], importNames, registryIds) ?? literalRuntimeId(node.arguments[0]);
        } else if (method === 'querySelector' || method === 'querySelectorAll') {
          runtime = selectorRuntimeId(node.arguments[0], importNames, registryIds);
        }
        if (runtime) {
          const location = `${rel}:${lineOf(source, node.getStart(source))}`;
          addLocation(runtimeIds, runtime.id, location);
          if (!registeredValues.has(runtime.id)) {
            violations.push({
              file: rel,
              line: lineOf(source, node.getStart(source)),
              type: 'unregistered-runtime-id',
              message: `Runtime DOM lookup references static id "${runtime.id}" but it is not registered in ${STATIC_DOM_RUNTIME_ID_REGISTRY}.`,
            });
          } else if (runtime.literal) {
            violations.push({
              file: rel,
              line: lineOf(source, node.getStart(source)),
              type: 'registered-id-literal-duplication',
              message: `Runtime DOM lookup duplicates registered id "${runtime.id}" as a literal; consume the registry value instead.`,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  for (const [id, locations] of staticIds) {
    if (!registeredValues.has(id)) continue;
    if (locations.length > 1) {
      violations.push({
        file: locations[1].split(':')[0],
        line: Number(locations[1].split(':').at(-1) ?? 1),
        type: 'registered-static-id-duplicate',
        message: `Registered static id "${id}" is rendered by multiple static source elements: ${locations.join(', ')}.`,
      });
    }
  }

  for (const [key, id] of registryIds) {
    if (staticIds.has(id)) continue;
    violations.push({
      file: STATIC_DOM_RUNTIME_ID_REGISTRY,
      line: 1,
      type: 'stale-registry-id',
      message: `Registry key "${key}" points to "${id}", but no allow-listed static DOM element consumes it.`,
    });
  }

  if (options.requireShellConsumer !== false && shellRegistryUses.length === 0) {
    violations.push({
      file: SHELL_CONSUMER,
      line: 1,
      type: 'shell-registry-not-consumed',
      message: `The app shell must consume at least one stable DOM id directly from ${STATIC_DOM_RUNTIME_ID_REGISTRY}.`,
    });
  }

  return { registryIds, staticIds, runtimeIds, violations };
}

export function formatStaticDomRuntimeRegistryReport(violations: readonly StaticDomRuntimeRegistryViolation[]): string {
  return ['Static DOM Runtime Registry Guard FAILED', '', ...violations.flatMap((v) => [
    `${v.file}:${v.line}`,
    `${v.type}: ${v.message}`,
    '',
  ])].join('\n');
}

export function checkStaticDomRuntimeRegistryContract(): void {
  const result = scanStaticDomRuntimeRegistry();
  for (const violation of result.violations) {
    addViolation('shared', `${violation.file}:${violation.line}`, `Static DOM Runtime Registry Guard: ${violation.message}`);
  }
}
