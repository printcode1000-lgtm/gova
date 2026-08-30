import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { cwd } from "node:process";

import { findDescriptorLiterals, loadProjectTsx } from "@asol/architecture-core";
import ts from "typescript";

const ITERATORS = new Set(["map", "flatMap", "forEach"]);

interface IteratorContext {
  readonly call: ts.CallExpression;
  readonly callback: ts.ArrowFunction | ts.FunctionExpression;
  readonly itemParam: string | null;
  readonly indexParam: string | null;
  readonly identityExpression: string | null;
  readonly positionalExpression: string | null;
}

interface TextEdit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

function parse(file: string, source: string): ts.SourceFile {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function isIteratorCall(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false;
  if (!ts.isPropertyAccessExpression(node.expression) && !ts.isPropertyAccessChain(node.expression)) return false;
  return ITERATORS.has(node.expression.name.text);
}

function callbackFor(call: ts.CallExpression): ts.ArrowFunction | ts.FunctionExpression | null {
  for (const arg of call.arguments) {
    if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) return arg;
  }
  return null;
}

function identifierParam(callback: ts.ArrowFunction | ts.FunctionExpression, index: number): string | null {
  const param = callback.parameters[index];
  return param && ts.isIdentifier(param.name) ? param.name.text : null;
}

function expressionReferencesIdentifier(node: ts.Node, name: string): boolean {
  let found = false;
  function visit(current: ts.Node): void {
    if (found) return;
    if (ts.isIdentifier(current) && current.text === name) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return found;
}

function keyExpressionFromOpening(
  opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
): ts.Expression | null {
  for (const prop of opening.attributes.properties) {
    if (!ts.isJsxAttribute(prop) || prop.name.getText() !== "key" || !prop.initializer) continue;
    if (ts.isJsxExpression(prop.initializer) && prop.initializer.expression) return prop.initializer.expression;
    if (ts.isStringLiteral(prop.initializer)) return prop.initializer;
  }
  return null;
}

function nearestStableKeyExpression(
  node: ts.Node,
  callback: ts.ArrowFunction | ts.FunctionExpression,
  indexParam: string | null,
): ts.Expression | null {
  let current: ts.Node | undefined = node;
  while (current && current !== callback) {
    let opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement | null = null;
    if (ts.isJsxOpeningElement(current) || ts.isJsxSelfClosingElement(current)) opening = current;
    else if (ts.isJsxElement(current)) opening = current.openingElement;
    if (opening) {
      const key = keyExpressionFromOpening(opening);
      if (key && (!indexParam || !expressionReferencesIdentifier(key, indexParam))) return key;
    }
    current = current.parent;
  }
  return null;
}

function arrayFromPosition(call: ts.CallExpression, callback: ts.ArrowFunction | ts.FunctionExpression): string | null {
  const expression = call.expression;
  if (!ts.isPropertyAccessExpression(expression) && !ts.isPropertyAccessChain(expression)) return null;
  const receiver = expression.expression;
  if (!ts.isCallExpression(receiver)) return null;
  if (!ts.isPropertyAccessExpression(receiver.expression)) return null;
  if (!ts.isIdentifier(receiver.expression.expression) || receiver.expression.expression.text !== "Array") return null;
  if (receiver.expression.name.text !== "from") return null;
  const index = identifierParam(callback, 1) ?? identifierParam(callback, 0);
  return index;
}

function iteratorContexts(node: ts.Node, sourceFile: ts.SourceFile): IteratorContext[] {
  const contexts: IteratorContext[] = [];
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (isIteratorCall(current)) {
      const callback = callbackFor(current);
      if (callback && node.getStart(sourceFile) >= callback.getStart(sourceFile) && node.getEnd() <= callback.getEnd()) {
        const itemParam = identifierParam(callback, 0);
        const indexParam = identifierParam(callback, 1);
        const key = nearestStableKeyExpression(node, callback, indexParam);
        const positional = arrayFromPosition(current, callback);
        contexts.push({
          call: current,
          callback,
          itemParam,
          indexParam,
          identityExpression: key?.getText(sourceFile) ?? null,
          positionalExpression: key ? null : positional,
        });
      }
    }
    current = current.parent;
  }
  return contexts.reverse();
}

function namespaceFor(file: string, line: number, depth: number): string {
  const digest = createHash("sha256").update(`${file}:${line}:${depth}`).digest("hex").slice(0, 10);
  return `iter-${digest}`;
}

function instanceExpression(
  contexts: readonly IteratorContext[],
  file: string,
  line: number,
): { expression: string; usesOpaque: boolean; usesPosition: boolean } | null {
  const parts: string[] = [];
  let usesOpaque = false;
  let usesPosition = false;
  for (let index = 0; index < contexts.length; index += 1) {
    const context = contexts[index]!;
    const ns = namespaceFor(file, line, index);
    if (context.identityExpression) {
      parts.push(`createOpaqueUiInstanceId("${ns}", String(${context.identityExpression}))`);
      usesOpaque = true;
      continue;
    }
    if (context.positionalExpression) {
      parts.push(`createUiPositionInstanceId("${ns}", ${context.positionalExpression})`);
      usesPosition = true;
      continue;
    }
    // Without a stable key or an explicitly positional Array.from iterator we
    // fail closed. A later manual migration must choose the domain identity.
    return null;
  }
  if (parts.length === 0) return null;
  if (parts.length === 1) return { expression: parts[0]!, usesOpaque, usesPosition };
  return {
    expression: parts.reduce((parent, local) => `composeUiInstanceId(${parent}, ${local})`),
    usesOpaque: true,
    usesPosition,
  };
}

/**
 * Adds runtime helper imports without text-scanning across import declarations.
 * Type-only imports never receive runtime helpers, and an existing local value
 * binding is never duplicated.
 */
function ensureImports(source: string, names: readonly string[]): string {
  const needed = [...new Set(names)].filter(Boolean);
  if (needed.length === 0) return source;

  const from = "@asol/ui-registry-core";
  const sourceFile = ts.createSourceFile(
    "iterator-migration.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const registryImports = sourceFile.statements.filter(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === from,
  );

  const localValueBindings = new Set<string>();
  let valueNamedImports: ts.NamedImports | null = null;
  for (const declaration of registryImports) {
    const clause = declaration.importClause;
    if (!clause || clause.isTypeOnly) continue;
    if (clause.name) localValueBindings.add(clause.name.text);
    const bindings = clause.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    valueNamedImports ??= bindings;
    for (const element of bindings.elements) {
      if (!element.isTypeOnly) localValueBindings.add(element.name.text);
    }
  }

  const missing = needed.filter((name) => !localValueBindings.has(name));
  if (missing.length === 0) return source;

  if (valueNamedImports) {
    const insertAt = valueNamedImports.getEnd() - 1;
    const prefix = valueNamedImports.elements.length > 0 ? ", " : "";
    return source.slice(0, insertAt) + `${prefix}${missing.join(", ")}` + source.slice(insertAt);
  }

  const firstStatement = sourceFile.statements[0];
  let insertAt = 0;
  if (
    firstStatement &&
    ts.isExpressionStatement(firstStatement) &&
    ts.isStringLiteral(firstStatement.expression)
  ) {
    insertAt = firstStatement.getEnd();
  }
  const before = source.slice(0, insertAt);
  const after = source.slice(insertAt);
  const leadingNewline = insertAt > 0 ? "\n" : "";
  return `${before}${leadingNewline}import { ${missing.join(", ")} } from "${from}";\n${after}`;
}

const root = cwd();
const sources = loadProjectTsx(root);
let changedFiles = 0;
let migratedDescriptors = 0;
let unresolvedDescriptors = 0;

for (const [file, original] of sources) {
  if (!file.endsWith(".tsx")) continue;
  if (file.includes("/generated/")) continue;
  const sourceFile = parse(file, original);
  const edits: TextEdit[] = [];
  const imports = new Set<string>();

  for (const literal of findDescriptorLiterals(file, original, sourceFile)) {
    if (literal.declarationKind !== "inline" || literal.fields.has("instance")) continue;
    const contexts = iteratorContexts(literal.node, sourceFile);
    if (contexts.length === 0) continue;
    const plan = instanceExpression(contexts, file, literal.line);
    if (!plan) {
      unresolvedDescriptors += 1;
      continue;
    }
    const close = literal.node.getEnd() - 1;
    const beforeClose = original.slice(literal.node.getStart(sourceFile), close).trimEnd();
    const separator = beforeClose.endsWith("{") ? "" : ",";
    edits.push({ start: close, end: close, text: `${separator} instance: ${plan.expression}` });
    if (plan.usesOpaque) imports.add("createOpaqueUiInstanceId");
    if (plan.usesPosition) imports.add("createUiPositionInstanceId");
    if (contexts.length > 1) imports.add("composeUiInstanceId");
    migratedDescriptors += 1;
  }

  if (edits.length === 0) continue;
  let next = original;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
  }
  next = ensureImports(next, [...imports]);
  writeFileSync(file, next);
  changedFiles += 1;
}

console.log(JSON.stringify({ changedFiles, migratedDescriptors, unresolvedDescriptors }, null, 2));
