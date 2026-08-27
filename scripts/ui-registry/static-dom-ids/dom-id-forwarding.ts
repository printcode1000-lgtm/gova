import ts from "typescript";

import { isNonDomRootComponent } from "./component-host-policy";
import { parseTsx } from "./tsx-hosts";

function openingForwardsId(
  opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
): boolean {
  return opening.attributes.properties.some((property) => {
    if (ts.isJsxSpreadAttribute(property)) return true;
    if (!ts.isJsxAttribute(property) || property.name.getText() !== "id") return false;
    if (!property.initializer) return false;
    return ts.isJsxExpression(property.initializer);
  });
}

function isWrapperTag(tag: ts.JsxTagNameExpression): boolean {
  const text = tag.getText();
  return (
    text === "Fragment" ||
    text === "Controller" ||
    text === "Select" ||
    text === "Dialog" ||
    text === "DialogTrigger" ||
    text === "DropdownMenu" ||
    text === "DropdownMenuTrigger" ||
    text === "StorageImageManager" ||
    text.endsWith("Portal") ||
    text.endsWith("Overlay") ||
    text.endsWith(".Overlay")
  );
}

function firstHostOpening(node: ts.Node): ts.JsxOpeningElement | ts.JsxSelfClosingElement | null {
  if (ts.isJsxSelfClosingElement(node)) {
    if (isWrapperTag(node.tagName)) return null;
    return node;
  }
  if (ts.isJsxFragment(node)) {
    for (const child of node.children) {
      const nested = firstHostOpening(child);
      if (nested) return nested;
    }
    return null;
  }
  if (ts.isJsxElement(node)) {
    if (isWrapperTag(node.openingElement.tagName)) {
      for (const child of node.children) {
        const nested = firstHostOpening(child);
        if (nested) return nested;
      }
      return null;
    }
    return node.openingElement;
  }
  if (ts.isJsxExpression(node) && node.expression) {
    return firstHostOpening(node.expression);
  }
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) {
    return firstHostOpening(node.expression);
  }
  if (ts.isConditionalExpression(node)) {
    return firstHostOpening(node.whenTrue) ?? firstHostOpening(node.whenFalse);
  }
  return null;
}

function functionBody(node: ts.Node): ts.Node | undefined {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) return node.body;
  if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) return node.body;
  return undefined;
}

function unwrapForwardRef(initializer: ts.Expression): ts.Node | undefined {
  if (!ts.isCallExpression(initializer)) return initializer;
  const callee = initializer.expression.getText();
  if (!callee.includes("forwardRef")) return initializer;
  return initializer.arguments[0];
}

function collectReturnJsx(body: ts.Node, found: ts.Node[]): void {
  if (ts.isBlock(body)) {
    function visit(node: ts.Node): void {
      if (ts.isReturnStatement(node) && node.expression) found.push(node.expression);
      ts.forEachChild(node, visit);
    }
    visit(body);
    return;
  }
  found.push(body);
}

function componentNodeForName(sourceFile: ts.SourceFile, exportName: string): ts.Node | null {
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === exportName) {
      return statement;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === exportName && declaration.initializer) {
          return unwrapForwardRef(declaration.initializer) ?? declaration.initializer;
        }
      }
    }
  }
  return null;
}

/** True when the exported component puts `id` or `{...props}` on its root host. */
export function componentForwardsDomId(source: string, file: string, exportName: string): boolean {
  if (isNonDomRootComponent(exportName)) return true;
  const sourceFile = parseTsx(file, source);
  const component = componentNodeForName(sourceFile, exportName);
  if (!component) return true;
  const body = functionBody(component);
  if (!body) return true;
  const returns: ts.Node[] = [];
  collectReturnJsx(body, returns);
  const hosts = returns
    .map((node) => firstHostOpening(node))
    .filter((node): node is ts.JsxOpeningElement | ts.JsxSelfClosingElement => node !== null);
  if (hosts.length === 0) return true;
  return hosts.every((host) => openingForwardsId(host));
}

export function applyDomIdForwarding(
  source: string,
  file: string,
  exportName: string,
): string {
  const alreadyForwards = componentForwardsDomId(source, file, exportName);
  const sourceFile = parseTsx(file, source);
  const component = componentNodeForName(sourceFile, exportName);
  if (!component) return source;
  const body = functionBody(component);
  if (!body) return source;
  const returns: ts.Node[] = [];
  collectReturnJsx(body, returns);
  const hosts = returns
    .map((node) => firstHostOpening(node))
    .filter((node): node is ts.JsxOpeningElement | ts.JsxSelfClosingElement => node !== null);

  const inserts: { at: number; end?: number; text: string }[] = [];
  const params = getParameters(component);
  let idExpr = "id";
  if (params.length === 0 && !alreadyForwards) {
    const start = getParameterListStart(component);
    if (start !== null) inserts.push({ at: start, text: `{ id }: { id?: string }` });
  } else if (params.length > 0) {
    const first = params[0]!;
    if (ts.isObjectBindingPattern(first.name)) {
      if (
        !alreadyForwards &&
        !first.name.elements.some((el) => !el.dotDotDotToken && el.name.getText() === "id")
      ) {
        inserts.push({ at: first.name.getStart() + 1, text: " id," });
      }
      if (first.type && !typeAlreadyAllowsId(first.type)) {
        inserts.push({ at: first.type.getEnd(), text: " & { id?: string }" });
      }
    } else if (ts.isIdentifier(first.name)) {
      idExpr = `${first.name.text}.id`;
      if (first.type && !typeAlreadyAllowsId(first.type)) {
        inserts.push({ at: first.type.getEnd(), text: " & { id?: string }" });
      }
    }
  }

  if (!alreadyForwards) {
    for (const host of hosts) {
      if (openingForwardsId(host)) continue;
      const existingId = host.attributes.properties.find(
        (property) => ts.isJsxAttribute(property) && property.name.getText() === "id",
      );
      if (existingId && ts.isJsxAttribute(existingId)) {
        inserts.push({
          at: existingId.getStart(),
          end: existingId.getEnd(),
          text: `id={${idExpr}}`,
        });
        continue;
      }
      inserts.push({ at: host.tagName.getEnd(), text: ` id={${idExpr}}` });
    }
  }

  if (inserts.length === 0) return source;
  return applyInserts(source, inserts);
}

function typeAlreadyAllowsId(type: ts.TypeNode): boolean {
  const text = type.getText();
  return text.includes("id?:") || text.includes("& { id?: string }") || text.includes("HTMLAttributes");
}

function getParameters(component: ts.Node): readonly ts.ParameterDeclaration[] {
  if (
    ts.isFunctionDeclaration(component) ||
    ts.isFunctionExpression(component) ||
    ts.isArrowFunction(component) ||
    ts.isMethodDeclaration(component)
  ) {
    return component.parameters;
  }
  return [];
}

function getParameterListStart(component: ts.Node): number | null {
  if (ts.isFunctionDeclaration(component) && component.name) {
    const open = component.getChildren().find((child) => child.kind === ts.SyntaxKind.OpenParenToken);
    return open ? open.getStart() + 1 : null;
  }
  if (ts.isArrowFunction(component) || ts.isFunctionExpression(component)) {
    const open = component.getChildren().find((child) => child.kind === ts.SyntaxKind.OpenParenToken);
    return open ? open.getStart() + 1 : null;
  }
  return null;
}

function applyInserts(source: string, inserts: readonly { at: number; end?: number; text: string }[]): string {
  const ordered = [...inserts].sort((left, right) => right.at - left.at);
  let next = source;
  for (const insert of ordered) {
    const end = insert.end ?? insert.at;
    next = `${next.slice(0, insert.at)}${insert.text}${next.slice(end)}`;
  }
  return next;
}
