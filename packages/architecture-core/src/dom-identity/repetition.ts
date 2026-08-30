/**
 * Which project-owned component templates can render more than once in one DOM.
 *
 * Multiplicity is intentionally a render-graph property, not a repository-wide
 * usage count. Two unrelated route/page roots may each use the same component
 * once without ever producing two simultaneous runtime copies. A component is
 * repeated when one render tree can reach it more than once: directly through
 * an iterator/multiple compatible usages, transitively through repeated parents
 * or converging child paths, or recursively through a component cycle.
 */
import ts from 'typescript';

import {
  isIntrinsicJsxTag,
  jsxComponentName,
  localBindingTargets,
  parseTsx,
} from './tsx-ast';

const ITERATOR_NAMES = new Set(['map', 'flatMap', 'forEach']);
const FILE_NODE_PREFIX = '@file:';
const MODULE_HOST_SUFFIX = '#@module';

type Multiplicity = 0 | 1 | 2;

type CallSite = {
  readonly node: ts.JsxOpeningElement | ts.JsxSelfClosingElement;
  readonly multiplicity: Multiplicity;
};

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

function declaredNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name) names.add(node.name.text);
    if (ts.isClassDeclaration(node) && node.name) names.add(node.name.text);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) names.add(node.name.text);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return names;
}

function containingHostName(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
    if (
      (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
      ts.isVariableDeclaration(current.parent) &&
      ts.isIdentifier(current.parent.name)
    ) {
      return current.parent.name.text;
    }
    current = current.parent;
  }
  return null;
}

export function symbolKey(file: string, name: string): string {
  return `${file}#${name}`;
}

function fileNodeKey(file: string): string {
  return `${FILE_NODE_PREFIX}${file}`;
}

function isFileNode(key: string): boolean {
  return key.startsWith(FILE_NODE_PREFIX);
}

function fileFromNode(key: string): string {
  return key.slice(FILE_NODE_PREFIX.length);
}

function capMultiplicity(value: number): Multiplicity {
  return value >= 2 ? 2 : value <= 0 ? 0 : 1;
}

function addEdge(
  edges: Map<string, Map<string, Multiplicity>>,
  caller: string,
  target: string,
  multiplicity: Multiplicity,
): void {
  const targets = edges.get(caller) ?? new Map<string, Multiplicity>();
  const current = targets.get(target) ?? 0;
  targets.set(target, capMultiplicity(current + multiplicity));
  edges.set(caller, targets);
}

function isDescendantOf(node: ts.Node, ancestor: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function branchOfConditional(
  node: ts.Node,
  conditional: ts.ConditionalExpression,
): 'true' | 'false' | null {
  if (isDescendantOf(node, conditional.whenTrue)) return 'true';
  if (isDescendantOf(node, conditional.whenFalse)) return 'false';
  return null;
}

function branchOfIf(node: ts.Node, statement: ts.IfStatement): 'then' | 'else' | null {
  if (isDescendantOf(node, statement.thenStatement)) return 'then';
  if (statement.elseStatement && isDescendantOf(node, statement.elseStatement)) return 'else';
  return null;
}

function jsxTagText(tagName: ts.JsxTagNameExpression): string {
  return tagName.getText();
}

function suspenseRole(node: ts.Node, element: ts.JsxElement): 'fallback' | 'children' | null {
  if (jsxTagText(element.openingElement.tagName) !== 'Suspense') return null;
  let current: ts.Node | undefined = node;
  while (current && current !== element) {
    if (
      ts.isJsxAttribute(current) &&
      current.name.getText() === 'fallback' &&
      isDescendantOf(current, element.openingElement)
    ) {
      return 'fallback';
    }
    current = current.parent;
  }
  return isDescendantOf(node, element) ? 'children' : null;
}

/**
 * Whether two component call sites are statically proven unable to render at
 * the same time. The proof is deliberately narrow: opposite ternary branches,
 * opposite if/else branches, and React Suspense fallback versus its children.
 * Anything else remains compatible and therefore fails closed as multiplicity.
 */
function areMutuallyExclusive(a: ts.Node, b: ts.Node): boolean {
  let current: ts.Node | undefined = a.parent;
  while (current) {
    if (ts.isConditionalExpression(current) && isDescendantOf(b, current)) {
      const left = branchOfConditional(a, current);
      const right = branchOfConditional(b, current);
      if (left && right && left !== right) return true;
    }
    if (ts.isIfStatement(current) && isDescendantOf(b, current)) {
      const left = branchOfIf(a, current);
      const right = branchOfIf(b, current);
      if (left && right && left !== right) return true;
    }
    if (ts.isJsxElement(current) && isDescendantOf(b, current)) {
      const left = suspenseRole(a, current);
      const right = suspenseRole(b, current);
      if (left && right && left !== right) return true;
    }
    current = current.parent;
  }
  return false;
}

function simultaneousMultiplicity(sites: readonly CallSite[]): Multiplicity {
  if (sites.some((site) => site.multiplicity >= 2)) return 2;
  if (sites.length === 0) return 0;
  if (sites.length === 1) return 1;
  for (let left = 0; left < sites.length; left += 1) {
    for (let right = left + 1; right < sites.length; right += 1) {
      if (!areMutuallyExclusive(sites[left]!.node, sites[right]!.node)) return 2;
    }
  }
  return 1;
}

export interface HostMultiplicity {
  /** Defining files repeated only when a precise exported symbol cannot be resolved. */
  readonly repeatingFiles: ReadonlySet<string>;
  /** `file#functionName` locals/exports that can appear more than once in one render tree. */
  readonly repeatingSymbols: ReadonlySet<string>;
}

/**
 * Propagate capped occurrence counts from one possible render root. Every node
 * can increase only 0 -> 1 -> 2, so cycles converge while still proving that a
 * recursive component produces multiple runtime copies.
 */
function occurrencesFromRoot(
  root: string,
  rootMultiplicity: Multiplicity,
  edges: ReadonlyMap<string, ReadonlyMap<string, Multiplicity>>,
): Map<string, Multiplicity> {
  const counts = new Map<string, Multiplicity>([[root, rootMultiplicity]]);
  const forwarded = new Map<string, Multiplicity>();
  const queue: string[] = [root];

  while (queue.length > 0) {
    const caller = queue.shift()!;
    const current = counts.get(caller) ?? 0;
    const alreadyForwarded = forwarded.get(caller) ?? 0;
    const delta = current - alreadyForwarded;
    if (delta <= 0) continue;
    forwarded.set(caller, current);

    for (const [target, edgeMultiplicity] of edges.get(caller) ?? []) {
      const increment = capMultiplicity(delta * edgeMultiplicity);
      const previous = counts.get(target) ?? 0;
      const next = capMultiplicity(previous + increment);
      if (next > previous) {
        counts.set(target, next);
        queue.push(target);
      }
    }
  }

  return counts;
}

export function hostMultiplicity(sources: ReadonlyMap<string, string>): HostMultiplicity {
  const edges = new Map<string, Map<string, Multiplicity>>();
  const callSites = new Map<string, Map<string, CallSite[]>>();
  const roots = new Set<string>();
  const forcedRepeated = new Set<string>();
  const namesByFile = new Map<string, Set<string>>();

  const resolveTarget = (
    path: string,
    sourceFile: ts.SourceFile,
    bindings: ReturnType<typeof localBindingTargets>,
    localNames: ReadonlySet<string>,
    name: string,
  ): string | null => {
    const imported = bindings.get(name);
    if (imported) {
      if (imported.thirdParty) return null;
      return imported.symbol ? symbolKey(imported.file, imported.symbol) : fileNodeKey(imported.file);
    }
    if (localNames.has(name)) return symbolKey(path, name);
    return null;
  };

  const addCallSite = (caller: string, target: string, site: CallSite): void => {
    const targets = callSites.get(caller) ?? new Map<string, CallSite[]>();
    const sites = targets.get(target) ?? [];
    sites.push(site);
    targets.set(target, sites);
    callSites.set(caller, targets);
  };

  for (const [path, source] of sources) {
    const sourceFile = parseTsx(path, source);
    const bindings = localBindingTargets(sourceFile, path, sources);
    const localNames = declaredNames(sourceFile);
    namesByFile.set(path, localNames);

    for (const name of iteratorCallbackNames(sourceFile)) {
      const target = resolveTarget(path, sourceFile, bindings, localNames, name);
      if (target) forcedRepeated.add(target);
    }

    function visit(node: ts.Node): void {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (!isIntrinsicJsxTag(node.tagName)) {
          const name = jsxComponentName(node.tagName);
          if (name) {
            const target = resolveTarget(path, sourceFile, bindings, localNames, name);
            if (target) {
              const hostName = containingHostName(node);
              const caller = hostName ? symbolKey(path, hostName) : `${path}${MODULE_HOST_SUFFIX}`;
              roots.add(caller);
              roots.add(target);
              addCallSite(caller, target, {
                node,
                multiplicity: isInsideIteratorCallback(node) ? 2 : 1,
              });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  for (const [caller, targets] of callSites) {
    for (const [target, sites] of targets) {
      addEdge(edges, caller, target, simultaneousMultiplicity(sites));
    }
  }

  // Fail closed when import/export resolution can identify only the defining
  // file: a repeated unresolved file target may denote any local export, so a
  // repeated file occurrence must propagate into each local symbol in it.
  for (const [file, names] of namesByFile) {
    const fileNode = fileNodeKey(file);
    if (names.size === 0) continue;
    roots.add(fileNode);
    for (const name of names) addEdge(edges, fileNode, symbolKey(file, name), 1);
  }

  const repeatingFiles = new Set<string>();
  const repeatingSymbols = new Set<string>();
  const markRepeated = (key: string): void => {
    if (isFileNode(key)) repeatingFiles.add(fileFromNode(key));
    else if (!key.endsWith(MODULE_HOST_SUFFIX)) repeatingSymbols.add(key);
  };

  for (const root of roots) {
    for (const [key, count] of occurrencesFromRoot(root, 1, edges)) {
      if (count >= 2) markRepeated(key);
    }
  }

  // Named functions passed directly as iterator callbacks repeat even though
  // there is no JSX component-call edge to seed them. Their descendants inherit
  // the same multiplicity through the normal graph.
  for (const repeatedRoot of forcedRepeated) {
    for (const [key, count] of occurrencesFromRoot(repeatedRoot, 2, edges)) {
      if (count >= 2) markRepeated(key);
    }
  }

  return { repeatingFiles, repeatingSymbols };
}
