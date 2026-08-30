/**
 * Structural analysis of one exported component's own function body.
 * Besides the root shape, this records whether a caller-owned `ui` descriptor
 * is forwarded to any project UI sink inside the component. That distinction
 * is required for wrappers such as FormSelect whose caller identity belongs to
 * an inner SelectTrigger rather than to the wrapper's outer structural root.
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
  /** Caller `ui` reaches any JSX `ui={ui}` or registry call in this component. */
  readonly forwardsUiAnywhere: boolean;
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
  return null;
}

function functionReturnJsxRoot(body: ts.ConciseBody | ts.Block): ts.JsxElement | ts.JsxSelfClosingElement | null {
  if (!ts.isBlock(body)) return jsxRootOf(body);
  const returns: ts.Expression[] = [];
  function visit(node: ts.Node): void {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    ) {
      return;
    }
    if (ts.isReturnStatement(node) && node.expression) {
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
  return returns.length === 1 ? jsxRootOf(returns[0]!) : null;
}

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

const UI_REGISTRY_CALL_NAMES = new Set(['uiAttributes', 'uiComponentAttributes', 'uiPrimitiveAttributes', 'uiForwardedAttributes']);

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

function rootForwardsUiIntoRegistryCall(opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement, uiBindingName: string): boolean {
  for (const property of opening.attributes.properties) {
    if (!ts.isJsxSpreadAttribute(property)) continue;
    const expression = property.expression;
    if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression) && UI_REGISTRY_CALL_NAMES.has(expression.expression.text)) {
      if (callReferencesBinding(expression, uiBindingName)) return true;
    }
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

function functionForwardsUiAnywhere(body: ts.Node, uiBindingName: string): boolean {
  let found = false;
  function visit(node: ts.Node): void {
    if (found) return;
    if (ts.isJsxAttribute(node) && node.name.getText() === 'ui' && node.initializer && ts.isJsxExpression(node.initializer)) {
      if (node.initializer.expression && ts.isIdentifier(node.initializer.expression) && node.initializer.expression.text === uiBindingName) {
        found = true;
        return;
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && UI_REGISTRY_CALL_NAMES.has(node.expression.text)) {
      if (callReferencesBinding(node, uiBindingName)) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(body);
  return found;
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
    forwardsUiAnywhere: hasUi && functionForwardsUiAnywhere(fn.body, 'ui'),
  };
}

export function analyzeComponentDefinition(
  file: string,
  source: string,
  exportName: string,
): ComponentRootShape | null {
  const sourceFile = parseTsx(file, source);

  function tryFunctionLike(node: ts.Node): ComponentRootShape | null {
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      return analyzeFunctionLike(node);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const callee = node.expression.name.text;
      if ((callee === 'forwardRef' || callee === 'memo') && node.arguments[0]) return tryFunctionLike(node.arguments[0]!);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const callee = node.expression.text;
      if ((callee === 'forwardRef' || callee === 'memo') && node.arguments[0]) return tryFunctionLike(node.arguments[0]!);
    }
    return null;
  }

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === exportName) {
      const result = analyzeFunctionLike(statement);
      if (result) return result;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || declaration.name.text !== exportName || !declaration.initializer) continue;
        const result = tryFunctionLike(declaration.initializer);
        if (result) return result;
      }
    }
    if (exportName === 'default' && ts.isExportAssignment(statement)) {
      const result = tryFunctionLike(statement.expression);
      if (result) return result;
    }
  }
  return null;
}
