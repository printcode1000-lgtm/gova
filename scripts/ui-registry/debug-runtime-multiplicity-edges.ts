import ts from 'typescript';

import {
  isIntrinsicJsxTag,
  jsxComponentName,
  loadProjectTsx,
  localBindingTargets,
  parseTsx,
} from '@asol/architecture-core';

const TRACKED = new Set([
  'src/shared/layouts/AppShell.tsx#AppShell',
  'src/shared/layouts/AppHeader.tsx#AppHeader',
  'src/shared/layouts/AppSidebar.tsx#AppSidebar',
  'src/shared/layouts/ShellLayout.tsx#ShellLayout',
  'src/features/onboarding/presentation/onboarding-page.tsx#CompletionScreen',
]);

function symbolKey(file: string, name: string): string {
  return `${file}#${name}`;
}

function containingHostName(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
    if (
      (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
      ts.isVariableDeclaration(current.parent) &&
      ts.isIdentifier(current.parent.name)
    ) return current.parent.name.text;
    current = current.parent;
  }
  return null;
}

const sources = loadProjectTsx(process.cwd());
const incoming = new Map<string, Array<{ caller: string; file: string; line: number; tag: string; target: string }>>();

for (const [path, source] of sources) {
  const sf = parseTsx(path, source);
  const bindings = localBindingTargets(sf, path, sources);
  const localNames = new Set<string>();
  for (const statement of sf.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) localNames.add(statement.name.text);
    if (ts.isClassDeclaration(statement) && statement.name) localNames.add(statement.name.text);
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) localNames.add(declaration.name.text);
      }
    }
  }

  function visit(node: ts.Node): void {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && !isIntrinsicJsxTag(node.tagName)) {
      const name = jsxComponentName(node.tagName);
      if (name) {
        const imported = bindings.get(name);
        let target: string | null = null;
        if (imported && !imported.thirdParty) {
          target = imported.symbol ? symbolKey(imported.file, imported.symbol) : `@file:${imported.file}`;
        } else if (localNames.has(name)) {
          target = symbolKey(path, name);
        }
        if (target) {
          const host = containingHostName(node);
          const caller = host ? symbolKey(path, host) : `${path}#@module`;
          const list = incoming.get(target) ?? [];
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          list.push({ caller, file: path, line, tag: name, target });
          incoming.set(target, list);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

function printTarget(target: string, depth: number, seen: Set<string>): void {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${target}`);
  if (depth >= 6 || seen.has(target)) return;
  const nextSeen = new Set(seen).add(target);
  for (const edge of incoming.get(target) ?? []) {
    console.log(`${indent}  <- ${edge.caller} via <${edge.tag}> ${edge.file}:${edge.line}`);
    printTarget(edge.caller, depth + 2, nextSeen);
  }
}

for (const target of TRACKED) {
  printTarget(target, 0, new Set());
  console.log('---');
}
