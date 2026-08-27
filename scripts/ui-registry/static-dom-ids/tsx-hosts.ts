import ts from "typescript";

const ITERATORS = new Set(["map", "flatMap", "forEach"]);

function isIteratorCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) return false;
  const expression = node.expression;
  if (!ts.isPropertyAccessExpression(expression) && !ts.isPropertyAccessChain(expression)) {
    return false;
  }
  return ITERATORS.has(expression.name.text);
}

/** True when the node is JSX produced by map/flatMap/forEach. */
export function isInsideIteratorCallback(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (isIteratorCall(current)) return true;
    current = current.parent;
  }
  return false;
}

/**
 * Function/component names passed directly to map/flatMap/forEach, so their
 * returned hosts can appear once per list row.
 */
export function iteratorCallbackNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  function visit(node: ts.Node): void {
    if (isIteratorCall(node) && ts.isCallExpression(node)) {
      for (const argument of node.arguments) {
        if (ts.isIdentifier(argument)) names.add(argument.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return names;
}

export function enclosingFunctionName(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
    if (ts.isFunctionExpression(current) && current.name) return current.name.text;
    if (ts.isClassDeclaration(current) && current.name) return current.name.text;
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      if (
        current.initializer &&
        (ts.isArrowFunction(current.initializer) ||
          ts.isFunctionExpression(current.initializer) ||
          ts.isCallExpression(current.initializer))
      ) {
        return current.name.text;
      }
    }
    current = current.parent;
  }
  return null;
}

export function exportedComponentNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && isExported(statement)) {
      names.add(statement.name.text);
    }
    if (ts.isClassDeclaration(statement) && statement.name && isExported(statement)) {
      names.add(statement.name.text);
    }
    if (ts.isVariableStatement(statement) && isExported(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
      }
    }
    if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) {
      names.add(statement.expression.text);
    }
  }
  return names;
}

function isExported(node: ts.Node): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
}

export function isRouteShellFile(relativePath: string): boolean {
  return /\/(page|layout|error|loading|template|not-found|default|global-error)\.tsx$/.test(
    relativePath.replace(/\\/g, "/"),
  );
}

export function parseTsx(fileName: string, source: string): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}
