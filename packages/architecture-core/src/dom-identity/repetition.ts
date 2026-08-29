/**
 * Which JSX hosts and component usages can render more than once in one DOM:
 * because their whole template lives inside a `.map`/`.flatMap`/`.forEach`
 * callback, or because the same JSX tag/component appears more than once in
 * source. A "repeating" usage site is the one that legitimately needs a
 * generic, caller-supplied identity instead of one baked into its own file.
 */
import ts from 'typescript';

import {
  isIntrinsicJsxTag,
  jsxComponentName,
  localBindingTargets,
  parseTsx,
} from './tsx-ast';

const ITERATOR_NAMES = new Set(['map', 'flatMap', 'forEach']);

function isIteratorCall(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false;
  const expression = node.expression;
  if (!ts.isPropertyAccessExpression(expression) && !ts.isPropertyAccessChain(expression)) return false;
  return ITERATOR_NAMES.has(expression.name.text);
}

export function isInsideIteratorCallback(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (isIteratorCall(current)) return true;
    current = current.parent;
  }
  return false;
}

export function iteratorCallbackNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  function visit(node: ts.Node): void {
    if (isIteratorCall(node)) {
      for (const argument of node.arguments) {
        if (ts.isIdentifier(argument)) names.add(argument.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return names;
}

function localNameDefined(sourceFile: ts.SourceFile, name: string): boolean {
  let found = false;
  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = true;
    if (ts.isClassDeclaration(node) && node.name?.text === name) found = true;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) found = true;
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

export function symbolKey(file: string, name: string): string {
  return `${file}#${name}`;
}

export interface HostMultiplicity {
  /** Defining files used repeatedly only when a precise exported symbol cannot be resolved. */
  readonly repeatingFiles: ReadonlySet<string>;
  /** `file#functionName` locals/exports that can appear more than once. */
  readonly repeatingSymbols: ReadonlySet<string>;
}

export function hostMultiplicity(sources: ReadonlyMap<string, string>): HostMultiplicity {
  const fileUses = new Map<string, { count: number; iterator: boolean }>();
  const symbolUses = new Map<string, { count: number; iterator: boolean }>();

  const bumpFile = (file: string, inIterator: boolean): void => {
    const current = fileUses.get(file) ?? { count: 0, iterator: false };
    fileUses.set(file, { count: current.count + 1, iterator: current.iterator || inIterator });
  };
  const bumpSymbol = (file: string, name: string, inIterator: boolean): void => {
    const key = symbolKey(file, name);
    const current = symbolUses.get(key) ?? { count: 0, iterator: false };
    symbolUses.set(key, { count: current.count + 1, iterator: current.iterator || inIterator });
  };

  for (const [path, source] of sources) {
    const sourceFile = parseTsx(path, source);
    const bindings = localBindingTargets(sourceFile, path, sources);

    for (const name of iteratorCallbackNames(sourceFile)) {
      const imported = bindings.get(name);
      if (imported && !imported.thirdParty) {
        if (imported.symbol) bumpSymbol(imported.file, imported.symbol, true);
        else bumpFile(imported.file, true);
      } else if (!imported && localNameDefined(sourceFile, name)) {
        bumpSymbol(path, name, true);
      }
    }

    function visit(node: ts.Node): void {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (!isIntrinsicJsxTag(node.tagName)) {
          const name = jsxComponentName(node.tagName);
          if (name) {
            const inIterator = isInsideIteratorCallback(node);
            const imported = bindings.get(name);
            if (imported && !imported.thirdParty) {
              if (imported.symbol) bumpSymbol(imported.file, imported.symbol, inIterator);
              else bumpFile(imported.file, inIterator);
            } else if (!imported && localNameDefined(sourceFile, name)) {
              bumpSymbol(path, name, inIterator);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  const repeatingFiles = new Set<string>();
  for (const [file, use] of fileUses) {
    if (use.iterator || use.count > 1) repeatingFiles.add(file);
  }

  const repeatingSymbols = new Set<string>();
  for (const [key, use] of symbolUses) {
    if (use.iterator || use.count > 1) repeatingSymbols.add(key);
  }
  return { repeatingFiles, repeatingSymbols };
}
