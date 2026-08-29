import ts from 'typescript';

import { jsxComponentName, parseTsx } from './tsx-ast';

export interface PendingAstSourceMatch {
  readonly index: number;
  readonly line: number;
  readonly component: string;
}

function stringAttributeValue(attribute: ts.JsxAttribute): string | null {
  if (!attribute.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression && ts.isStringLiteral(attribute.initializer.expression)) {
    return attribute.initializer.expression.text;
  }
  return null;
}

function hasRegistration(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): boolean {
  return node.attributes.properties.some((property) => {
    if (ts.isJsxAttribute(property) && property.name.getText() === 'ui') return true;
    if (!ts.isJsxSpreadAttribute(property) || !ts.isCallExpression(property.expression) || !ts.isIdentifier(property.expression.expression)) return false;
    return property.expression.expression.text === 'uiAttributes' || property.expression.expression.text === 'uiPageAttributes';
  });
}

/**
 * AST-exact matching for the pending registration pipeline. Formatting,
 * comments, strings containing JSX-like text, nested object literals and
 * multiline props cannot create false source matches.
 */
export function findPendingAstSourceMatches(
  file: string,
  source: string,
  components: readonly string[],
  anchor: string | null,
): PendingAstSourceMatch[] {
  const sourceFile = parseTsx(file, source);
  const allowed = new Set(components);
  const matches: PendingAstSourceMatch[] = [];

  function visit(node: ts.Node): void {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const intrinsic = ts.isIdentifier(node.tagName) && /^[a-z]/.test(node.tagName.text) ? node.tagName.text : null;
      const component = intrinsic ?? jsxComponentName(node.tagName);
      if (component && allowed.has(component) && !hasRegistration(node)) {
        let anchorMatches = anchor === null;
        if (anchor !== null) {
          const idAttribute = node.attributes.properties.find(
            (property): property is ts.JsxAttribute => ts.isJsxAttribute(property) && property.name.getText() === 'id',
          );
          anchorMatches = idAttribute ? stringAttributeValue(idAttribute) === anchor : false;
        }
        if (anchorMatches) {
          matches.push({
            index: node.getStart(sourceFile),
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
            component,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return matches;
}
