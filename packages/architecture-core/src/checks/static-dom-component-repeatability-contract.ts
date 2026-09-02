import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';

import ts from 'typescript';

import { ROOT, addViolation } from './architecture-types';

const SOURCE_ROOTS = ['src/app', 'src/features', 'src/shared', 'packages'] as const;
const SOURCE_EXTENSION = /\.tsx$/;
const EXCLUDED_PATH_PARTS = ['/node_modules/', '/dist/', '/.next/', '/out/', '/generated/', '/src/tests/', '/tests/', '.test.', '.spec.'];
const STABLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+-[a-z0-9]{6}$/;

export type StaticDomComponentRepeatabilityViolationType =
  | 'repeatable-component-literal-id'
  | 'static-component-missing-id'
  | 'static-component-invalid-id'
  | 'repeatable-parent-unscoped-id';

export interface StaticDomComponentRepeatabilityViolation {
  readonly file: string;
  readonly line: number;
  readonly component: string;
  readonly type: StaticDomComponentRepeatabilityViolationType;
  readonly message: string;
}

export interface StaticDomComponentRepeatabilityResult {
  readonly repeatableComponents: readonly string[];
  readonly dynamicOnlyComponents: readonly string[];
  readonly violations: readonly StaticDomComponentRepeatabilityViolation[];
}

interface ScanOptions {
  readonly root?: string;
}

interface ComponentDefinition {
  readonly key: string;
  readonly file: string;
  readonly name: string;
  readonly node: ts.FunctionLikeDeclaration;
  readonly source: ts.SourceFile;
  readonly literalIds: readonly { id: string; line: number; element: string }[];
  readonly idPropNames: ReadonlySet<string>;
}

interface ComponentUse {
  readonly target: string;
  readonly file: string;
  readonly line: number;
  readonly dynamic: boolean;
  readonly parentComponent?: string;
  readonly idAttribute?: ts.JsxAttribute;
  readonly source: ts.SourceFile;
  readonly node: ts.JsxOpeningLikeElement;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function lineOf(source: ts.SourceFile, position: number): number {
  return source.getLineAndCharacterOfPosition(position).line + 1;
}

function collectIdentityPropNames(expression: ts.Expression, names: Set<string>): void {
  if (ts.isIdentifier(expression) && /(scope|Scope|id|Id)$/.test(expression.text)) names.add(expression.text);
  if (ts.isPropertyAccessExpression(expression) && /(scope|Scope|id|Id)$/.test(expression.name.text)) names.add(expression.name.text);
  ts.forEachChild(expression, (child) => {
    if (ts.isExpression(child)) collectIdentityPropNames(child, names);
    else ts.forEachChild(child, (nested) => {
      if (ts.isExpression(nested)) collectIdentityPropNames(nested, names);
    });
  });
}

function attributeByName(node: ts.JsxOpeningLikeElement, source: ts.SourceFile, name: string): ts.JsxAttribute | undefined {
  return node.attributes.properties
    .filter(ts.isJsxAttribute)
    .find((attribute) => attribute.name.getText(source) === name);
}

function identityPropName(names: ReadonlySet<string>): string | undefined {
  if (names.has('elementScope')) return 'elementScope';
  if (names.has('id')) return 'id';
  return [...names].sort()[0];
}

function collectFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (current: string): void => {
    if (!existsSync(current)) return;
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const normalized = normalizePath(full);
      if (EXCLUDED_PATH_PARTS.some((part) => normalized.includes(part))) continue;
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (SOURCE_EXTENSION.test(entry)) files.push(full);
    }
  };
  for (const sourceRoot of SOURCE_ROOTS) walk(join(root, sourceRoot));
  return files.sort((a, b) => normalizePath(a).localeCompare(normalizePath(b)));
}

function isCapitalizedIdentifier(node: ts.Node | undefined): node is ts.Identifier {
  return !!node && ts.isIdentifier(node) && /^[A-Z]/.test(node.text);
}

function isIntrinsicTagName(tagName: ts.JsxTagNameExpression): tagName is ts.Identifier {
  return ts.isIdentifier(tagName) && tagName.text[0] === tagName.text[0]?.toLowerCase();
}

function unwrapComponentFunction(initializer: ts.Expression): ts.FunctionLikeDeclaration | undefined {
  let current: ts.Expression = initializer;
  while (ts.isCallExpression(current)) {
    const callee = current.expression;
    const name = ts.isIdentifier(callee)
      ? callee.text
      : ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : '';
    if (!['forwardRef', 'memo'].includes(name) || current.arguments.length === 0) return undefined;
    const candidate = current.arguments[0];
    if (ts.isArrowFunction(candidate) || ts.isFunctionExpression(candidate)) return candidate;
    if (!ts.isExpression(candidate)) return undefined;
    current = candidate;
  }
  return ts.isArrowFunction(current) || ts.isFunctionExpression(current) ? current : undefined;
}

function componentDefinitions(file: string, root: string, source: ts.SourceFile): ComponentDefinition[] {
  const rel = normalizePath(relative(root, file));
  const raw: { name: string; node: ts.FunctionLikeDeclaration }[] = [];
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && isCapitalizedIdentifier(statement.name)) {
      raw.push({ name: statement.name.text, node: statement });
      continue;
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!isCapitalizedIdentifier(declaration.name) || !declaration.initializer) continue;
      const fn = unwrapComponentFunction(declaration.initializer);
      if (fn) raw.push({ name: declaration.name.text, node: fn });
    }
  }

  return raw.map(({ name, node }) => {
    const literalIds: { id: string; line: number; element: string }[] = [];
    const idPropNames = new Set<string>();
    const visit = (child: ts.Node): void => {
      if (
        (ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child)) &&
        isIntrinsicTagName(child.tagName)
      ) {
        const idAttr = child.attributes.properties
          .filter(ts.isJsxAttribute)
          .find((attribute) => attribute.name.getText(source) === 'id');
        if (idAttr?.initializer && ts.isStringLiteral(idAttr.initializer) && STABLE_ID_PATTERN.test(idAttr.initializer.text)) {
          literalIds.push({
            id: idAttr.initializer.text,
            line: lineOf(source, child.getStart(source)),
            element: child.tagName.getText(source),
          });
        }
        if (idAttr?.initializer && ts.isJsxExpression(idAttr.initializer) && idAttr.initializer.expression) {
          collectIdentityPropNames(idAttr.initializer.expression, idPropNames);
        }
      }
      ts.forEachChild(child, visit);
    };
    if (node.body) visit(node.body);
    return {
      key: `${rel}#${name}`,
      file: rel,
      name,
      node,
      source,
      literalIds,
      idPropNames,
    };
  });
}

function isInsideDynamicCollection(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current?.parent) {
    const parent: ts.Node = current.parent;
    if ((ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) && ts.isCallExpression(parent.parent)) {
      const call = parent.parent;
      const expression = call.expression;
      if (
        ts.isPropertyAccessExpression(expression) &&
        ['map', 'flatMap'].includes(expression.name.text) &&
        call.arguments.includes(parent)
      ) return true;
      if (
        ts.isPropertyAccessExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === 'Array' &&
        expression.name.text === 'from' &&
        call.arguments[1] === parent
      ) return true;
    }
    current = parent;
  }
  return false;
}

function resolveImportFile(root: string, fromFile: string, specifier: string): string | undefined {
  let base: string;
  if (specifier.startsWith('@/')) base = join(root, 'src', specifier.slice(2));
  else if (specifier.startsWith('.')) base = resolve(dirname(fromFile), specifier);
  else return undefined;
  const candidates = extname(base)
    ? [base]
    : [`${base}.tsx`, `${base}.ts`, join(base, 'index.tsx'), join(base, 'index.ts')];
  return candidates.find((candidate) => existsSync(candidate));
}

function enclosingComponentKey(node: ts.Node, defsByNode: ReadonlyMap<ts.Node, string>): string | undefined {
  let current: ts.Node | undefined = node;
  while (current?.parent) {
    current = current.parent;
    const key = defsByNode.get(current);
    if (key) return key;
  }
  return undefined;
}

function idAttribute(node: ts.JsxOpeningLikeElement, source: ts.SourceFile): ts.JsxAttribute | undefined {
  return node.attributes.properties
    .filter(ts.isJsxAttribute)
    .find((attribute) => attribute.name.getText(source) === 'id');
}

function validStaticIdAttribute(attribute: ts.JsxAttribute | undefined): boolean {
  if (!attribute?.initializer) return false;
  if (ts.isStringLiteral(attribute.initializer)) return STABLE_ID_PATTERN.test(attribute.initializer.text.trim());
  if (!ts.isJsxExpression(attribute.initializer) || !attribute.initializer.expression) return false;
  const expression = attribute.initializer.expression;
  if (ts.isTemplateExpression(expression)) {
    const text = expression.getText();
    return /scope|Scope|Id|id/.test(text) && /-[a-z0-9]{6}`?$/.test(text);
  }
  if (ts.isIdentifier(expression) && expression.text === 'id') return true;
  if (ts.isPropertyAccessExpression(expression) && expression.name.text === 'id') return true;
  return false;
}

function expressionUsesParentScope(expression: ts.Expression): boolean {
  if (ts.isIdentifier(expression)) return /(scope|Scope|id|Id)$/.test(expression.text);
  if (ts.isPropertyAccessExpression(expression)) return /(scope|Scope|id|Id)$/.test(expression.name.text);
  let found = false;
  ts.forEachChild(expression, (child) => {
    if (found) return;
    if (ts.isExpression(child) && expressionUsesParentScope(child)) found = true;
  });
  return found;
}

function scopedTemplateAttributeExpression(expression: ts.Expression): boolean {
  if (!ts.isTemplateExpression(expression)) return false;
  if (!expression.templateSpans.some((span) => expressionUsesParentScope(span.expression))) return false;
  return /-[a-z0-9]{6}`?$/.test(expression.getText());
}

function validRepeatableParentScopedAttribute(attribute: ts.JsxAttribute | undefined): boolean {
  if (!attribute?.initializer || !ts.isJsxExpression(attribute.initializer) || !attribute.initializer.expression) return false;
  const expression = attribute.initializer.expression;
  if (scopedTemplateAttributeExpression(expression)) return true;
  if (!ts.isConditionalExpression(expression)) return false;
  const whenTrueIsScoped = scopedTemplateAttributeExpression(expression.whenTrue);
  const whenFalseIsAbsent =
    (ts.isIdentifier(expression.whenFalse) && expression.whenFalse.text === 'undefined') ||
    expression.whenFalse.kind === ts.SyntaxKind.NullKeyword;
  return whenTrueIsScoped && whenFalseIsAbsent;
}

export function scanStaticDomComponentRepeatability(options: ScanOptions = {}): StaticDomComponentRepeatabilityResult {
  const root = options.root ?? ROOT;
  const files = collectFiles(root);
  const sources = new Map<string, ts.SourceFile>();
  const defs = new Map<string, ComponentDefinition>();
  const defsByFileAndName = new Map<string, string>();
  const defsByNode = new Map<ts.Node, string>();

  for (const file of files) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    sources.set(file, source);
    for (const def of componentDefinitions(file, root, source)) {
      defs.set(def.key, def);
      defsByFileAndName.set(`${file}#${def.name}`, def.key);
      defsByNode.set(def.node, def.key);
    }
  }

  const uses: ComponentUse[] = [];
  for (const file of files) {
    const source = sources.get(file)!;
    const importTargets = new Map<string, string>();
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const targetFile = resolveImportFile(root, file, statement.moduleSpecifier.text);
      if (!targetFile) continue;
      const clause = statement.importClause;
      if (!clause) continue;
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          const imported = element.propertyName?.text ?? element.name.text;
          const key = defsByFileAndName.get(`${targetFile}#${imported}`);
          if (key) importTargets.set(element.name.text, key);
        }
      }
    }

    const visit = (node: ts.Node): void => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && isCapitalizedIdentifier(node.tagName)) {
        const localKey = defsByFileAndName.get(`${file}#${node.tagName.text}`);
        const target = localKey ?? importTargets.get(node.tagName.text);
        if (target) {
          uses.push({
            target,
            file: normalizePath(relative(root, file)),
            line: lineOf(source, node.getStart(source)),
            dynamic: isInsideDynamicCollection(node),
            parentComponent: enclosingComponentKey(node, defsByNode),
            idAttribute: idAttribute(node, source),
            source,
            node,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  const usesByTarget = new Map<string, ComponentUse[]>();
  for (const use of uses) {
    const list = usesByTarget.get(use.target) ?? [];
    list.push(use);
    usesByTarget.set(use.target, list);
  }

  const repeatable = new Set<string>();
  for (const [key, list] of usesByTarget) {
    const def = defs.get(key)!;
    if (list.some((use) => use.dynamic)) repeatable.add(key);
    const perParent = new Map<string, number>();
    for (const use of list) {
      if (!use.parentComponent) continue;
      perParent.set(use.parentComponent, (perParent.get(use.parentComponent) ?? 0) + 1);
    }
    if ([...perParent.values()].some((count) => count > 1)) repeatable.add(key);
    if (def.file.startsWith('src/shared/ui/') && list.length > 1) repeatable.add(key);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const use of uses) {
      if (!use.parentComponent || !repeatable.has(use.parentComponent) || repeatable.has(use.target)) continue;
      repeatable.add(use.target);
      changed = true;
    }
  }

  const dynamicOnly = new Set<string>();
  let dynamicOnlyChanged = true;
  while (dynamicOnlyChanged) {
    dynamicOnlyChanged = false;
    for (const [key, list] of usesByTarget) {
      if (list.length === 0 || dynamicOnly.has(key)) continue;
      const everyUseIsDynamic = list.every(
        (use) => use.dynamic || (!!use.parentComponent && dynamicOnly.has(use.parentComponent)),
      );
      if (!everyUseIsDynamic) continue;
      dynamicOnly.add(key);
      dynamicOnlyChanged = true;
    }
  }

  const violations: StaticDomComponentRepeatabilityViolation[] = [];
  for (const key of repeatable) {
    const def = defs.get(key);
    if (!def) continue;
    for (const literal of def.literalIds) {
      violations.push({
        file: def.file,
        line: literal.line,
        component: def.name,
        type: 'repeatable-component-literal-id',
        message: `Repeatable component ${def.name} contains literal static DOM id "${literal.id}" on <${literal.element}>. Use a caller-provided static id/scope or exclude dynamic instances instead.`,
      });
    }
    if (def.idPropNames.size === 0) continue;
    const requiredProp = identityPropName(def.idPropNames);
    if (!requiredProp) continue;
    for (const use of usesByTarget.get(key) ?? []) {
      if (use.dynamic || (!!use.parentComponent && dynamicOnly.has(use.parentComponent))) continue;
      const attribute = attributeByName(use.node, use.source, requiredProp);
      if (!attribute) {
        violations.push({
          file: use.file,
          line: use.line,
          component: def.name,
          type: 'static-component-missing-id',
          message: `Static use of repeatable component ${def.name} must provide stable ${requiredProp}.`,
        });
      } else if (use.parentComponent && repeatable.has(use.parentComponent) && !validRepeatableParentScopedAttribute(attribute)) {
        violations.push({
          file: use.file,
          line: use.line,
          component: def.name,
          type: 'repeatable-parent-unscoped-id',
          message: `Repeatable parent must derive ${requiredProp} for ${def.name} from its own static scope with a stable child suffix.`,
        });
      } else if (!validStaticIdAttribute(attribute)) {
        violations.push({
          file: use.file,
          line: use.line,
          component: def.name,
          type: 'static-component-invalid-id',
          message: `Static use of repeatable component ${def.name} has ${requiredProp} that is not a stable literal/scoped identity.`,
        });
      }
    }
  }

  return {
    repeatableComponents: [...repeatable].sort(),
    dynamicOnlyComponents: [...dynamicOnly].sort(),
    violations,
  };
}

export function formatStaticDomComponentRepeatabilityReport(
  violations: readonly StaticDomComponentRepeatabilityViolation[],
): string {
  return ['Static DOM Component Repeatability Guard FAILED', '', ...violations.flatMap((v) => [
    `${v.file}:${v.line}`,
    `${v.type}: ${v.message}`,
    '',
  ])].join('\n');
}

export function checkStaticDomComponentRepeatabilityContract(): void {
  const result = scanStaticDomComponentRepeatability();
  for (const violation of result.violations) {
    addViolation('shared', `${violation.file}:${violation.line}`, `Static DOM Component Repeatability Guard: ${violation.message}`);
  }
}
