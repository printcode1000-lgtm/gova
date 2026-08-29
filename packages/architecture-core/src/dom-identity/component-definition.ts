/**
 * Structural analysis of one exported component's own function body: does it
 * render exactly one DOM/JSX root, does that root forward the rest of its
 * props (`{...props}`) onto that root, and does it already forward a `ui`
 * descriptor through the `uiAttributes` family? This is what tells a real
 * "generic reusable primitive" (Button, DialogTitle, a future composite)
 * apart from an opaque application component — by reading the function, not
 * by naming it in a list.
 */
import ts from 'typescript';

import { isIntrinsicJsxTag, jsxComponentName, jsxMemberTag, parseTsx } from './tsx-ast';

export interface ComponentRootShape {
  readonly rootIntrinsicTag: string | null;
  readonly rootComponentName: string | null;
  readonly rootQualifiedName: string | null;
  readonly rootNode: ts.JsxOpeningElement | ts.JsxSelfClosingElement | null;
  readonly restParamName: string | null;
  readonly rootSpreadsRest: boolean;
  readonly destructuresUi: boolean;
  readonly forwardsUiThroughRegistryCall: boolean;
}

function unwrapParens(expression: ts.Expression): ts.Expression {
  return ts.isParenthesizedExpression(expression) ? unwrapParens(expression.expression) : expression;
}

function jsxRootOf(expression: ts.Expression): ts.JsxElement | ts.JsxSelfClosingElement | null {
  const unwrapped = unwrapParens(expression);
  if (ts.isJsxElement(unwrapped) || ts.isJsxSelfClosingElement(unwrapped)) return unwrapped;
  if (ts.isJsxFragment(unwrapped)) {
    const children = unwrapped.children.filter(
      (child) => !ts.isJsxText(child) || child.text.trim() !== '',
    );
    if (children.length === 1) {
      const only = children[0]!;
      if (ts.isJsxElement(only) || ts.isJsxSelfClosingElement(only)) return only;
    }
    return null;
  }
  // Conditional (`cond ? <A/> : <B/>`) or logical (`cond && <A/>`) returns
  // are not a single provable root — left unclassified, not misclassified.
  return null;
}

function functionReturnJsxRoot(body: ts.ConciseBody | ts.Block): ts.JsxElement | ts.JsxSelfClosingElement | null {
  if (!ts.isBlock(body)) return jsxRootOf(body);
  const returns: ts.Expression[] = [];
  let ambiguous = false;
  function visit(node: ts.Node): void {
    // Don't cross into a nested function's own returns.
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    ) {
      return;
    }
    if (ts.isReturnStatement(node)) {
      if (!node.expression) return; // bare `return;` guard
      const isTrivial =
        node.expression.kind === ts.SyntaxKind.NullKeyword ||
        node.expression.kind === ts.SyntaxKind.FalseKeyword ||
        node.expression.kind === ts.SyntaxKind.TrueKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'undefined');
      if (!isTrivial) returns.push(node.expression);
    }
    ts.forEachChild(node, visit);
  }
  visit(body);
  if (returns.length !== 1) ambiguous = true;
  if (ambiguous) return null;
  return jsxRootOf(returns[0]!);
}

/** Finds `{ ...expr }` on the root's opening tag where `expr` is `paramName`. */
function rootSpreadsIdentifier(
  attributes: ts.JsxAttributes,
  paramName: string | null,
): boolean {
  if (!paramName) return false;
  return attributes.properties.some(
    (property) =>
      ts.isJsxSpreadAttribute(property) &&
      ts.isIdentifier(property.expression) &&
      property.expression.text === paramName,
  );
}

const UI_REGISTRY_CALL_NAMES = new Set(['uiAttributes', 'uiComponentAttributes', 'uiPrimitiveAttributes']);

function callReferencesBinding(call: ts.CallExpression, uiBindingName: string): boolean {
  for (const argument of call.arguments) {
    if (ts.isIdentifier(argument) && argument.text === uiBindingName) return true;
    if (ts.isObjectLiteralExpression(argument)) {
      for (const property of argument.properties) {
        if (ts.isSpreadAssignment(property) && ts.isIdentifier(property.expression) && property.expression.text === uiBindingName) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * True when the *root element's own attribute list* — not merely somewhere
 * in the function body — spreads a `uiAttributes`/`uiComponentAttributes`/
 * `uiPrimitiveAttributes` call that forwards `uiBindingName`. Scoped to the
 * root deliberately: a component can legitimately use the caller's `ui` on
 * an *inner* element (a product card's outer wrapper carries fixed
 * structural chrome while an inner button carries the caller's identity),
 * and that inner usage must not make the outer root look "wired" too.
 */
function rootForwardsUiIntoRegistryCall(opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement, uiBindingName: string): boolean {
  for (const property of opening.attributes.properties) {
    if (!ts.isJsxSpreadAttribute(property)) continue;
    const expression = property.expression;
    if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression) && UI_REGISTRY_CALL_NAMES.has(expression.expression.text)) {
      if (callReferencesBinding(expression, uiBindingName)) return true;
    }
    // `{...(ui ? uiAttributes(ui) : {})}` — a conditional spread guarding the call.
    if (ts.isParenthesizedExpression(expression) && ts.isConditionalExpression(expression.expression)) {
      for (const branch of [expression.expression.whenTrue, expression.expression.whenFalse]) {
        if (ts.isCallExpression(branch) && ts.isIdentifier(branch.expression) && UI_REGISTRY_CALL_NAMES.has(branch.expression.text)) {
          if (callReferencesBinding(branch, uiBindingName)) return true;
        }
      }
    }
  }
  return false;
}

function paramNames(pattern: ts.BindingName): { rest: string | null; hasUi: boolean } {
  if (!ts.isObjectBindingPattern(pattern)) return { rest: null, hasUi: false };
  let rest: string | null = null;
  let hasUi = false;
  for (const element of pattern.elements) {
    if (element.dotDotDotToken && ts.isIdentifier(element.name)) rest = element.name.text;
    const propertyName = element.propertyName
      ? (ts.isIdentifier(element.propertyName) ? element.propertyName.text : null)
      : ts.isIdentifier(element.name)
        ? element.name.text
        : null;
    if (propertyName === 'ui') hasUi = true;
  }
  return { rest, hasUi };
}

/**
 * Resolves the common `asChild` pattern — `const Comp = asChild ? Slot :
 * "button"; return <Comp ... />` — to the literal DOM tag one of its
 * branches names. Both branches render DOM either way (a Radix `Slot` merges
 * onto its single child, which is DOM by construction here), so finding one
 * literal branch is enough to prove the root DOM-producing without having to
 * resolve `Comp` as an import.
 */
function localTernaryTagLiteral(body: ts.Node, localName: string): string | null {
  let found: string | null = null;
  function visit(node: ts.Node): void {
    if (found) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === localName &&
      node.initializer &&
      ts.isConditionalExpression(node.initializer)
    ) {
      for (const branch of [node.initializer.whenTrue, node.initializer.whenFalse]) {
        if (ts.isStringLiteral(branch)) {
          found = branch.text;
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(body);
  return found;
}

function analyzeFunctionLike(fn: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression): ComponentRootShape | null {
  if (!fn.body) return null;
  const propsParam = fn.parameters[0];
  const { rest, hasUi } = propsParam ? paramNames(propsParam.name) : { rest: null, hasUi: false };
  const jsxRoot = ts.isBlock(fn.body) ? functionReturnJsxRoot(fn.body) : jsxRootOf(fn.body as ts.Expression);
  if (!jsxRoot) return null;
  const opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement = ts.isJsxElement(jsxRoot)
    ? jsxRoot.openingElement
    : jsxRoot;
  const component = jsxComponentName(opening.tagName);
  const intrinsic =
    (isIntrinsicJsxTag(opening.tagName) ? opening.tagName.text : null) ??
    (component ? localTernaryTagLiteral(fn.body, component) : null);
  const member = jsxMemberTag(opening.tagName);
  return {
    rootIntrinsicTag: intrinsic,
    rootComponentName: intrinsic ? null : component,
    rootQualifiedName: member?.qualifiedName ?? null,
    rootNode: opening,
    restParamName: rest,
    rootSpreadsRest: rootSpreadsIdentifier(opening.attributes, rest),
    destructuresUi: hasUi,
    forwardsUiThroughRegistryCall: hasUi && rootForwardsUiIntoRegistryCall(opening, 'ui'),
  };
}

/**
 * Finds the exported component named `exportName` in `file` and reports the
 * shape of its single JSX return, if the function has exactly one provable
 * root. Handles a bare function/arrow, `React.forwardRef(...)`, and
 * `React.memo(...)` — the three shapes every primitive in this repo uses.
 */
export function analyzeComponentDefinition(
  file: string,
  source: string,
  exportName: string,
): ComponentRootShape | null {
  const sourceFile = parseTsx(file, source);
  let result: ComponentRootShape | null = null;

  function tryFunctionLike(node: ts.Node): ComponentRootShape | null {
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      return analyzeFunctionLike(node);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const callee = node.expression.name.text;
      if ((callee === 'forwardRef' || callee === 'memo') && node.arguments[0]) {
        return tryFunctionLike(node.arguments[0]!);
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const callee = node.expression.text;
      if ((callee === 'forwardRef' || callee === 'memo') && node.arguments[0]) {
        return tryFunctionLike(node.arguments[0]!);
      }
    }
    return null;
  }

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === exportName) {
      result = analyzeFunctionLike(statement);
      if (result) return result;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || declaration.name.text !== exportName || !declaration.initializer) {
          continue;
        }
        result = tryFunctionLike(declaration.initializer);
        if (result) return result;
      }
    }
  }
  return result;
}
