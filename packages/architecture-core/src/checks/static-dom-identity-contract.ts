import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import ts from 'typescript';

import { ROOT, addViolation } from './architecture-types';
import { scanStaticDomComponentRepeatability } from './static-dom-component-repeatability-contract';

export const STATIC_DOM_ID_MANIFEST = 'docs/04-ui-components/static-dom-identity-manifest.json';

const SOURCE_ROOTS = ['src/app', 'src/features', 'src/shared', 'packages'] as const;
const SOURCE_EXTENSION = /\.tsx$/;
const STABLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+-[a-z0-9]{6}$/;
const STABLE_SUFFIX_PATTERN = /^[a-z0-9]{6}$/;
const CHECK_NAME = 'Static DOM ID Guard';
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

const DYNAMIC_CALL_NAMES = new Set(['map', 'flatMap']);
const FORBIDDEN_ID_CALLS = new Set(['useId', 'randomUUID', 'now']);

export interface StaticDomIdentityEntry {
  readonly id: string;
  readonly source: string;
  readonly line: number;
  readonly element: string;
  readonly semanticName: string;
  readonly kind: 'literal' | 'scoped-template' | 'explicit-prop' | 'constant-reference';
}

export interface StaticDomIdentityManifest {
  readonly version: 1;
  readonly format: '<scope>-<semantic-name>-<stable6>';
  readonly entries: readonly StaticDomIdentityEntry[];
}

export interface StaticDomIdentityViolation {
  readonly file: string;
  readonly line: number;
  readonly element: string;
  readonly type:
    | 'missing-id'
    | 'empty-id'
    | 'invalid-format'
  | 'dynamic-literal-id'
    | 'runtime-generated-id'
    | 'forbidden-use-id'
    | 'duplicate-id'
    | 'manifest-missing-id'
    | 'manifest-extra-id';
  readonly message: string;
}

export interface StaticDomIdentityResult {
  readonly entries: readonly StaticDomIdentityEntry[];
  readonly violations: readonly StaticDomIdentityViolation[];
}

interface ScanOptions {
  readonly root?: string;
  readonly files?: readonly string[];
  readonly validateManifest?: boolean;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function collectFiles(root: string): string[] {
  const files: string[] = [];

  function walk(current: string): void {
    if (!existsSync(current)) return;
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const normalized = normalizePath(full);
      if (EXCLUDED_PATH_PARTS.some((part) => normalized.includes(part))) continue;
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (SOURCE_EXTENSION.test(entry)) files.push(full);
    }
  }

  for (const sourceRoot of SOURCE_ROOTS) walk(join(root, sourceRoot));
  return files.sort((a, b) => normalizePath(a).localeCompare(normalizePath(b)));
}

function lineOf(source: ts.SourceFile, position: number): number {
  return source.getLineAndCharacterOfPosition(position).line + 1;
}

function isIntrinsicTagName(tagName: ts.JsxTagNameExpression): tagName is ts.Identifier {
  return ts.isIdentifier(tagName) && tagName.text[0] === tagName.text[0]?.toLowerCase();
}

function tagText(tagName: ts.JsxTagNameExpression): string {
  return tagName.getText();
}

function attributesOf(node: ts.JsxOpeningLikeElement): readonly ts.JsxAttribute[] {
  return node.attributes.properties.filter(ts.isJsxAttribute);
}

function attributeName(attribute: ts.JsxAttribute): string {
  return attribute.name.getText();
}

function idAttribute(node: ts.JsxOpeningLikeElement): ts.JsxAttribute | undefined {
  return attributesOf(node).find((attribute) => attributeName(attribute) === 'id');
}

function semanticNameFromId(id: string): string {
  const parts = id.split('-');
  return parts.slice(1, -1).join('-') || parts.slice(0, -1).join('-');
}

function isInsideDynamicCollection(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current?.parent) {
    const parent: ts.Node = current.parent;
    if (
      (ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) &&
      ts.isCallExpression(parent.parent)
    ) {
      const call = parent.parent;
      const expression = call.expression;
      if (
        ts.isPropertyAccessExpression(expression) &&
        DYNAMIC_CALL_NAMES.has(expression.name.text) &&
        call.arguments.includes(parent)
      ) {
        return true;
      }
      if (
        ts.isPropertyAccessExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === 'Array' &&
        expression.name.text === 'from' &&
        call.arguments[1] === parent
      ) {
        return true;
      }
    }
    current = parent;
  }
  return false;
}

function expressionContainsUseId(expression: ts.Expression): boolean {
  let found = false;
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'useId') {
        found = true;
        return;
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'useId'
      ) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(expression);
  return found;
}

function expressionContainsRuntimeGenerator(expression: ts.Expression): boolean {
  let found = false;
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee) && FORBIDDEN_ID_CALLS.has(callee.text)) found = true;
      if (
        ts.isPropertyAccessExpression(callee) &&
        ((ts.isIdentifier(callee.expression) &&
          ((callee.expression.text === 'crypto' && callee.name.text === 'randomUUID') ||
            (callee.expression.text === 'Math' && callee.name.text === 'random') ||
            (callee.expression.text === 'Date' && callee.name.text === 'now') ||
            (callee.expression.text === 'performance' && callee.name.text === 'now'))) ||
          callee.name.text === 'useId')
      ) {
        found = true;
      }
    }
    if (
      ts.isTemplateExpression(node) &&
      node.templateSpans.some((span) => {
        const text = span.expression.getText();
        return /\b(index|idx|i)\b/.test(text);
      })
    ) {
      found = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(expression);
  return found;
}

function scopedTemplateSource(expression: ts.Expression): string | undefined {
  if (ts.isIdentifier(expression) && /(scope|Scope|id|Id)$/.test(expression.text)) return expression.text;
  if (
    ts.isPropertyAccessExpression(expression) &&
    /(scope|Scope|id|Id)$/.test(expression.name.text)
  ) return expression.getText();
  return undefined;
}

function scopedTemplateInfo(expression: ts.Expression): { id: string; semanticName: string } | undefined {
  if (!ts.isTemplateExpression(expression)) return undefined;
  if (expression.head.text !== '') return undefined;
  if (expression.templateSpans.length !== 1) return undefined;
  const [span] = expression.templateSpans;
  const source = scopedTemplateSource(span.expression);
  if (!source) return undefined;
  const suffix = span.literal.text;
  if (!/^-[a-z][a-z0-9-]*-[a-z0-9]{6}$/.test(suffix)) return undefined;
  return { id: '${' + source + '}' + suffix, semanticName: semanticNameFromId('scope' + suffix) };
}

function enclosingFunctionLike(node: ts.Node): ts.FunctionLikeDeclaration | undefined {
  let current: ts.Node | undefined = node;
  while (current?.parent) {
    current = current.parent;
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current) ||
      ts.isMethodDeclaration(current)
    ) {
      return current;
    }
  }
  return undefined;
}

function objectBindingContainsName(name: ts.BindingName, target: string): boolean {
  if (!ts.isObjectBindingPattern(name)) return false;
  return name.elements.some((element) => {
    if (ts.isIdentifier(element.name) && element.name.text === target) return true;
    return false;
  });
}

function isComponentIdPropExpression(expression: ts.Expression, node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current?.parent) {
    current = current.parent;
    if (!(
      ts.isFunctionDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current) ||
      ts.isMethodDeclaration(current)
    )) continue;
    if (
      ts.isIdentifier(expression) &&
      expression.text === 'id' &&
      current.parameters.some((parameter) => objectBindingContainsName(parameter.name, 'id'))
    ) return true;
    if (
      ts.isPropertyAccessExpression(expression) &&
      expression.name.text === 'id' &&
      ts.isIdentifier(expression.expression)
    ) {
      const objectName = expression.expression.text;
      if (current.parameters.some(
        (parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === objectName,
      )) return true;
    }
  }
  return false;
}

function nearestLocalInitializer(
  source: ts.SourceFile,
  name: string,
  before: number,
): ts.Expression | undefined {
  let bestPosition = -1;
  let best: ts.Expression | undefined;
  const visit = (node: ts.Node): void => {
    if (node.getStart(source) >= before) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer &&
      node.getStart(source) > bestPosition
    ) {
      bestPosition = node.getStart(source);
      best = node.initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return best;
}

function resolveLocalIdExpression(
  expression: ts.Expression,
  source: ts.SourceFile,
  node: ts.Node,
  seen = new Set<string>(),
): ts.Expression {
  if (!ts.isIdentifier(expression) || isComponentIdPropExpression(expression, node)) return expression;
  if (seen.has(expression.text)) return expression;
  seen.add(expression.text);
  const initializer = nearestLocalInitializer(source, expression.text, node.getStart(source));
  if (!initializer) return expression;
  if (ts.isIdentifier(initializer)) return resolveLocalIdExpression(initializer, source, node, seen);
  return initializer;
}

function explicitPropInfo(
  expression: ts.Expression,
  node: ts.Node,
): { id: string; semanticName: string } | undefined {
  if (!isComponentIdPropExpression(expression, node)) return undefined;
  return {
    id: ts.isIdentifier(expression) ? '${id}' : '${props.id}',
    semanticName: 'explicit-prop-root',
  };
}

function expressionLooksLikeDynamicRecordIdentity(expression: ts.Expression): boolean {
  const text = expression.getText();
  return /\b(?:item|items|itemId|product|products|productId|order|orders|orderId|notification|notifications|group|row|record|entry|user|users|userId|seller|sellers|sellerId|sellerOrder|sellerOrderId|job|jobs|jobId|command|schema|phase|section|planId|shipment|shipmentId|shipmentItem|shipmentItemId|quote|quoteId|latest)\b/.test(
    text,
  );
}

function dynamicRecordInfo(expression: ts.Expression): { id: string; semanticName: string } | undefined {
  if (!expressionLooksLikeDynamicRecordIdentity(expression)) return undefined;
  return { id: '${id}', semanticName: 'explicit-prop-root' };
}

function constantReferenceInfo(expression: ts.Expression): { id: string; semanticName: string } | undefined {
  const text = expression.getText();
  if (!/^[A-Z][A-Z0-9_]*(?:\.[A-Za-z0-9_$]+|\[[^\]]+\])*$/.test(text)) return undefined;
  return { id: '${' + text + '}', semanticName: 'constant-reference' };
}

function conditionalStaticInfo(expression: ts.Expression): { id: string; semanticName: string } | undefined {
  if (!ts.isConditionalExpression(expression)) return undefined;
  const whenTrue = scopedTemplateInfo(expression.whenTrue);
  const falseIsStableLiteral = ts.isStringLiteral(expression.whenFalse) && STABLE_ID_PATTERN.test(expression.whenFalse.text);
  const falseIsAbsent =
    (ts.isIdentifier(expression.whenFalse) && expression.whenFalse.text === 'undefined') ||
    expression.whenFalse.kind === ts.SyntaxKind.NullKeyword;
  if (!whenTrue || (!falseIsStableLiteral && !falseIsAbsent)) return undefined;
  return { id: expression.getText(), semanticName: whenTrue.semanticName };
}

function classifyId(
  rel: string,
  source: ts.SourceFile,
  node: ts.JsxOpeningLikeElement,
  tag: string,
): { entry?: StaticDomIdentityEntry; violations: StaticDomIdentityViolation[] } {
  const violations: StaticDomIdentityViolation[] = [];
  const attribute = idAttribute(node);
  const line = lineOf(source, node.getStart(source));

  const violation = (
    type: StaticDomIdentityViolation['type'],
    message: string,
  ): StaticDomIdentityViolation => ({ file: rel, line, element: tag, type, message });

  if (!attribute || !attribute.initializer) {
    violations.push(violation('missing-id', `<${tag}> has no stable id.`));
    return { violations };
  }

  const initializer = attribute.initializer;
  if (ts.isStringLiteral(initializer)) {
    const id = initializer.text.trim();
    if (!id) {
      violations.push(violation('empty-id', `<${tag}> has an empty id.`));
      return { violations };
    }
    if (!STABLE_ID_PATTERN.test(id)) {
      violations.push(
        violation('invalid-format', `<${tag}> id "${id}" must match <scope>-<semantic-name>-<stable6>.`),
      );
      return { violations };
    }
    const suffix = id.split('-').at(-1) ?? '';
    if (!STABLE_SUFFIX_PATTERN.test(suffix)) {
      violations.push(violation('invalid-format', `<${tag}> id "${id}" has an invalid stable suffix.`));
      return { violations };
    }
    return {
      entry: {
        id,
        source: rel,
        line,
        element: tag,
        semanticName: semanticNameFromId(id),
        kind: 'literal',
      },
      violations,
    };
  }

  if (!ts.isJsxExpression(initializer) || !initializer.expression) {
    violations.push(violation('invalid-format', `<${tag}> id must be a stable string or scoped template.`));
    return { violations };
  }

  const expression = initializer.expression;
  const resolvedExpression = resolveLocalIdExpression(expression, source, node);
  if (expressionContainsUseId(resolvedExpression)) {
    violations.push(violation('forbidden-use-id', `<${tag}> uses useId() as a static DOM identity.`));
    return { violations };
  }
  if (expressionContainsRuntimeGenerator(resolvedExpression)) {
    violations.push(violation('runtime-generated-id', `<${tag}> uses a runtime-generated id.`));
    return { violations };
  }

  if (resolvedExpression !== expression && ts.isStringLiteralLike(resolvedExpression)) {
    const id = resolvedExpression.text.trim();
    if (!STABLE_ID_PATTERN.test(id)) {
      violations.push(violation('invalid-format', `<${tag}> local id "${id}" must match <scope>-<semantic-name>-<stable6>.`));
      return { violations };
    }
    return {
      entry: {
        id,
        source: rel,
        line,
        element: tag,
        semanticName: semanticNameFromId(id),
        kind: 'constant-reference',
      },
      violations,
    };
  }

  const scoped = scopedTemplateInfo(resolvedExpression);
  if (scoped) {
    return {
      entry: {
        id: scoped.id,
        source: rel,
        line,
        element: tag,
        semanticName: scoped.semanticName,
        kind: 'scoped-template',
      },
      violations,
    };
  }

  const explicitProp = explicitPropInfo(expression, node);
  if (explicitProp) {
    return {
      entry: {
        id: explicitProp.id,
        source: rel,
        line,
        element: tag,
        semanticName: explicitProp.semanticName,
        kind: 'explicit-prop',
      },
      violations,
    };
  }

  const constantReference = constantReferenceInfo(resolvedExpression);
  if (constantReference) {
    return {
      entry: {
        id: constantReference.id,
        source: rel,
        line,
        element: tag,
        semanticName: constantReference.semanticName,
        kind: 'constant-reference',
      },
      violations,
    };
  }

  const conditionalStatic = conditionalStaticInfo(resolvedExpression);
  if (conditionalStatic) {
    return {
      entry: {
        id: conditionalStatic.id,
        source: rel,
        line,
        element: tag,
        semanticName: conditionalStatic.semanticName,
        kind: 'scoped-template',
      },
      violations,
    };
  }

  if (dynamicRecordInfo(resolvedExpression)) return { violations };

  violations.push(
    violation('invalid-format', `<${tag}> id expression must be an explicit id prop or static scope template.`),
  );
  return { violations };
}

function readManifest(root: string): StaticDomIdentityManifest | undefined {
  const path = join(root, STATIC_DOM_ID_MANIFEST);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, 'utf8')) as StaticDomIdentityManifest;
}

function compareManifest(
  root: string,
  entries: readonly StaticDomIdentityEntry[],
): StaticDomIdentityViolation[] {
  const manifest = readManifest(root);
  if (!manifest) {
    return [
      {
        file: STATIC_DOM_ID_MANIFEST,
        line: 1,
        element: 'manifest',
        type: 'manifest-missing-id',
        message: `Static DOM identity manifest is missing. Run npm run dom:id:write after reviewing source IDs.`,
      },
    ];
  }

  const currentIds = new Set(entries.map((entry) => entry.id));
  const manifestIds = new Set(manifest.entries.map((entry) => entry.id));
  const violations: StaticDomIdentityViolation[] = [];

  for (const entry of manifest.entries) {
    if (currentIds.has(entry.id)) continue;
    violations.push({
      file: entry.source,
      line: entry.line,
      element: entry.element,
      type: 'manifest-missing-id',
      message: `Manifest identity "${entry.id}" is no longer present in source.`,
    });
  }

  for (const entry of entries) {
    if (manifestIds.has(entry.id)) continue;
    violations.push({
      file: entry.source,
      line: entry.line,
      element: entry.element,
      type: 'manifest-extra-id',
      message: `Source identity "${entry.id}" is not recorded in ${STATIC_DOM_ID_MANIFEST}.`,
    });
  }

  return violations;
}

function duplicateViolations(entries: readonly StaticDomIdentityEntry[]): StaticDomIdentityViolation[] {
  const seen = new Map<string, StaticDomIdentityEntry>();
  const violations: StaticDomIdentityViolation[] = [];
  for (const entry of entries) {
    if (entry.kind === 'scoped-template' || entry.kind === 'explicit-prop' || entry.kind === 'constant-reference') continue;
    const existing = seen.get(entry.id);
    if (!existing) {
      seen.set(entry.id, entry);
      continue;
    }
    violations.push({
      file: entry.source,
      line: entry.line,
      element: entry.element,
      type: 'duplicate-id',
      message: `Duplicate static DOM id "${entry.id}" also appears at ${existing.source}:${existing.line}.`,
    });
  }
  return violations;
}


function capitalizedName(name: string | undefined): name is string {
  return !!name && /^[A-Z]/.test(name);
}

function componentNameForFunctionLike(node: ts.FunctionLikeDeclaration): string | undefined {
  if (ts.isFunctionDeclaration(node) && capitalizedName(node.name?.text)) return node.name!.text;
  let current: ts.Node = node;
  while (current.parent && (ts.isCallExpression(current.parent) || ts.isParenthesizedExpression(current.parent))) {
    current = current.parent;
  }
  const parent = current.parent;
  if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name) && capitalizedName(parent.name.text)) {
    return parent.name.text;
  }
  return undefined;
}

function enclosingComponentKey(node: ts.Node, rel: string): string | undefined {
  let current: ts.Node | undefined = node;
  while (current?.parent) {
    current = current.parent;
    if (ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current) || ts.isArrowFunction(current)) {
      const name = componentNameForFunctionLike(current);
      if (name) return `${rel}#${name}`;
    }
  }
  return undefined;
}

export function scanStaticDomIdentities(options: ScanOptions = {}): StaticDomIdentityResult {
  const root = options.root ?? ROOT;
  const files = options.files?.map((file) => join(root, file)) ?? collectFiles(root);
  const entries: StaticDomIdentityEntry[] = [];
  const violations: StaticDomIdentityViolation[] = [];
  const dynamicOnlyComponents = new Set(
    scanStaticDomComponentRepeatability({ root }).dynamicOnlyComponents,
  );

  for (const file of files) {
    const rel = normalizePath(relative(root, file));
    const content = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    function visit(node: ts.Node): void {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const intrinsic = isIntrinsicTagName(node.tagName);
        const componentKey = enclosingComponentKey(node, rel);
        if (componentKey && dynamicOnlyComponents.has(componentKey)) {
          // DOM inside a component rendered only from dynamic collections is excluded.
        } else if (isInsideDynamicCollection(node)) {
          const attribute = idAttribute(node);
          if (intrinsic && attribute?.initializer && ts.isStringLiteral(attribute.initializer)) {
            violations.push({
              file: rel,
              line: lineOf(source, node.getStart(source)),
              element: intrinsic ? node.tagName.text : tagText(node.tagName),
              type: 'dynamic-literal-id',
              message: `Dynamic repeated <${intrinsic ? node.tagName.text : tagText(node.tagName)}> must not use literal id "${attribute.initializer.text}".`,
            });
          }
        } else if (intrinsic) {
          const tag = intrinsic ? node.tagName.text : tagText(node.tagName);
          const result = classifyId(rel, source, node, tag);
          if (result.entry) entries.push(result.entry);
          violations.push(...result.violations);
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(source);
  }

  violations.push(...duplicateViolations(entries));
  if (options.validateManifest !== false) violations.push(...compareManifest(root, entries));

  return { entries, violations };
}

export function writeStaticDomIdentityManifest(root = ROOT): StaticDomIdentityManifest {
  const result = scanStaticDomIdentities({ root, validateManifest: false });
  if (result.violations.length > 0) {
    throw new Error(formatStaticDomIdentityReport(result.violations));
  }
  const manifest: StaticDomIdentityManifest = {
    version: 1,
    format: '<scope>-<semantic-name>-<stable6>',
    entries: [...result.entries].sort((a, b) => a.id.localeCompare(b.id)),
  };
  const manifestPath = join(root, STATIC_DOM_ID_MANIFEST);
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export function formatStaticDomIdentityReport(violations: readonly StaticDomIdentityViolation[]): string {
  const lines = [`${CHECK_NAME} FAILED`, ''];
  for (const violation of violations) {
    lines.push(`${violation.file}:${violation.line}`);
    lines.push(`<${violation.element}> ${violation.type}: ${violation.message}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function checkStaticDomIdentityContract(): void {
  const result = scanStaticDomIdentities();
  for (const violation of result.violations) {
    addViolation('shared', `${violation.file}:${violation.line}`, `${CHECK_NAME}: ${violation.message}`);
  }
}

export function stableStaticDomSuffix(seed: string): string {
  return createHash('sha256').update(seed).digest('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
}
