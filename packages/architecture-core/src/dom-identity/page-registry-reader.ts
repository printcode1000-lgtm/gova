import ts from 'typescript';

import { parseTsx } from './tsx-ast';

export interface AstPageRegistryEntry {
  readonly route: string;
  readonly id: string;
  readonly uid: string;
  readonly line: number;
}

function unwrap(expression: ts.Expression): ts.Expression {
  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression) || ts.isParenthesizedExpression(expression)) {
    return unwrap(expression.expression);
  }
  return expression;
}

function stringField(object: ts.ObjectLiteralExpression, name: string): string | null {
  const property = object.properties.find((candidate) =>
    ts.isPropertyAssignment(candidate) &&
    ((ts.isIdentifier(candidate.name) && candidate.name.text === name) ||
      (ts.isStringLiteral(candidate.name) && candidate.name.text === name)),
  );
  return property && ts.isPropertyAssignment(property) && ts.isStringLiteral(property.initializer)
    ? property.initializer.text
    : null;
}

/** Parse UI_PAGE_REGISTRY by syntax, never formatting-dependent regex. */
export function readUiPageRegistryAst(file: string, source: string): AstPageRegistryEntry[] {
  const sourceFile = parseTsx(file, source);
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== 'UI_PAGE_REGISTRY' || !declaration.initializer) continue;
      const initializer = unwrap(declaration.initializer);
      if (!ts.isArrayLiteralExpression(initializer)) return [];
      const entries: AstPageRegistryEntry[] = [];
      for (const element of initializer.elements) {
        const value = unwrap(element as ts.Expression);
        if (!ts.isObjectLiteralExpression(value)) continue;
        const route = stringField(value, 'route');
        const id = stringField(value, 'id');
        const uid = stringField(value, 'uid');
        if (!route || !id || !uid) continue;
        entries.push({
          route,
          id,
          uid,
          line: sourceFile.getLineAndCharacterOfPosition(value.getStart(sourceFile)).line + 1,
        });
      }
      return entries;
    }
  }
  return [];
}
