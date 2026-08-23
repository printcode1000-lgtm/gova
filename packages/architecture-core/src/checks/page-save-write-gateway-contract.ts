import { readFileSync } from 'fs';
import { join } from 'path';
import ts from 'typescript';

import { ROOT, addViolation, rel, walk } from './architecture-types';

/**
 * Rendering code may not write. `@asol/page-save-core` is the only path.
 *
 * The gateway contract next door checks that the package exists, keeps one door
 * and is not deep-imported. It does not check the thing that actually matters,
 * and delegated that to `page-save-write-surface.test.ts`, which matches an
 * allowlist of *named service calls* (`productApiService.create`, …). A page
 * calling `asolApi.post(...)` directly is invisible to it — a delete button
 * shipped on `/super-admin/users` with both gates green, and a probe page
 * written to reproduce it passed both again.
 *
 * So this check reads the syntax tree instead of the text, and follows calls
 * inside the module: a mutating `asolApi` call is legal only when every path
 * that can reach it starts at a page-save staged executor (`stage({ execute })`)
 * or a registration's `save` handler. A page that hands `submitRequest` to
 * `save:` is compliant even though the call site sits in another function —
 * lexical nesting alone would report that as a violation.
 *
 * Scope is rendering code: `presentation/` and `components/`. Hooks and
 * services are the transport layer; the policy's concern is that *pages* do not
 * own writes.
 */
const MUTATING_METHODS = new Set([
  'post',
  'put',
  'patch',
  'delete',
  'postForm',
  'putForm',
]);

/**
 * Capabilities the page-save policy explicitly does not own, per
 * docs/05-platform-features/page-save-system.md: those packages own their own
 * writes, and routing them through page-save would take over another package's
 * responsibility. Narrow, file-scoped, and each one names why.
 */
const NON_PAGE_SAVE_CAPABILITIES: ReadonlyArray<{ file: string; reason: string }> = [
  {
    file: 'src/features/cart/presentation/cart-order-submit.ts',
    reason: 'cart owns its own checkout write',
  },
  {
    file: 'src/features/orders/presentation/OrderDetailsPageContent.tsx',
    reason: 'order lifecycle transitions are owned by the orders capability',
  },
  {
    file: 'src/features/super-admin/presentation/SuperAdminUsersPage.tsx',
    reason: 'impersonation is a session operation owned by auth, not a page write',
  },
  {
    file: 'src/features/catalog-studio/presentation/CatalogStudioPage.tsx',
    reason: 'catalog validation is a read-shaped RPC that persists nothing',
  },
];

interface FunctionNode {
  name: string;
  node: ts.Node;
  /** Names of functions in this module that this one calls. */
  calls: Set<string>;
  /** Mutating asolApi call lines directly inside this function. */
  writes: number[];
  /** Reached through `stage({ execute })` or a page-save `save` handler. */
  isGateway: boolean;
}

function declaredName(node: ts.Node, sf: ts.SourceFile): string | null {
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.getText(sf);
  let parent = node.parent;
  if (ts.isCallExpression(parent)) parent = parent.parent; // useCallback(fn, deps)
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.getText(sf);
  }
  if (ts.isPropertyAssignment(parent)) return parent.name.getText(sf);
  return null;
}

/** Is this function the body of a staged executor or a page-save save handler? */
function isGatewayFunction(node: ts.Node, sf: ts.SourceFile): boolean {
  let parent = node.parent;
  if (ts.isCallExpression(parent)) parent = parent.parent;
  if (!ts.isPropertyAssignment(parent)) return false;
  const key = parent.name.getText(sf);
  if (key !== 'execute' && key !== 'save' && key !== 'prepareForSave') return false;
  // `execute` only counts inside a stage(...) call; `save` inside a page-save
  // registration. Both are object literals passed to a page-save API.
  let ancestor: ts.Node | undefined = parent;
  while (ancestor) {
    if (ts.isCallExpression(ancestor)) {
      const callee = ancestor.expression.getText(sf);
      if (/\bstage$|usePageSave|registerPageSave|stagePageSaveOperation/.test(callee)) {
        return true;
      }
    }
    ancestor = ancestor.parent;
  }
  return false;
}

/**
 * A POST that computes and returns something, persisting nothing, is not a
 * write — planning, validation, inspection, comparison. The HTTP verb cannot
 * tell them apart, so the call site says so and states why:
 *
 *     // page-save-read: returns a cleanup plan, persists nothing
 *     const plan = await asolApi.post<Plan>(...);
 *
 * Deliberately per-call and reason-bearing. It cannot be applied to a file or a
 * directory, it is visible in review at the exact line it excuses, and a
 * reasonless marker is rejected — an exception that costs nothing to add is one
 * nobody weighs.
 */
const READ_MARKER = /\/\/\s*page-save-read:\s*(\S.*)$/;

function readMarkerReason(lines: string[], lineNumber: number): string | null {
  for (let at = lineNumber - 2; at >= 0 && at >= lineNumber - 4; at -= 1) {
    const match = READ_MARKER.exec(lines[at] ?? '');
    if (match) return match[1]!.trim();
  }
  return null;
}

function analyse(filePath: string, content: string): void {
  const fileRel = rel(filePath).replace(/\\/g, '/');
  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  // A list, not a name-keyed map: a module has many `execute:` arrows, and
  // keying by name kept only the last, silently dropping the calls the earlier
  // ones made — a staged write then looked unreachable from any gateway.
  const functions: FunctionNode[] = [];
  const byName = new Map<string, FunctionNode[]>();
  const topLevelWrites: number[] = [];

  const enclosing: FunctionNode[] = [];

  const visit = (node: ts.Node): void => {
    const isFn =
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node);

    let entry: FunctionNode | undefined;
    if (isFn) {
      const name = declaredName(node, sf) ?? `anonymous@${node.getStart()}`;
      entry = {
        name,
        node,
        calls: new Set(),
        writes: [],
        isGateway: isGatewayFunction(node, sf),
      };
      functions.push(entry);
      const existing = byName.get(name);
      if (existing) existing.push(entry);
      else byName.set(name, [entry]);
      enclosing.push(entry);
    }

    if (ts.isCallExpression(node)) {
      const current = enclosing[enclosing.length - 1];
      if (ts.isPropertyAccessExpression(node.expression)) {
        const object = node.expression.expression.getText(sf);
        const method = node.expression.name.getText(sf);
        if (object === 'asolApi' && MUTATING_METHODS.has(method)) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          if (current) current.writes.push(line);
          else topLevelWrites.push(line);
        }
      } else if (ts.isIdentifier(node.expression) && current) {
        current.calls.add(node.expression.getText(sf));
      }
    }

    ts.forEachChild(node, visit);
    if (entry) enclosing.pop();
  };
  visit(sf);

  // A function is reachable-from-gateway when it is one, or when every caller
  // chain that reaches it starts at one. Walk forward from the gateways.
  const reachable = new Set<FunctionNode>();
  const queue = functions.filter((fn) => fn.isGateway);
  for (const fn of queue) reachable.add(fn);
  while (queue.length > 0) {
    const fn = queue.shift()!;
    for (const callee of fn.calls) {
      for (const target of byName.get(callee) ?? []) {
        if (reachable.has(target)) continue;
        reachable.add(target);
        queue.push(target);
      }
    }
  }

  // CRLF sources leave `\r` on each line when split on `\n` alone; the read
  // marker regex anchors at `$` and would miss valid `page-save-read` comments.
  const lines = content.split(/\r?\n/);
  const candidates: number[] = [...topLevelWrites];
  for (const fn of functions) {
    if (fn.writes.length === 0 || reachable.has(fn)) continue;
    candidates.push(...fn.writes);
  }

  const offending: number[] = [];
  for (const line of candidates) {
    const reason = readMarkerReason(lines, line);
    if (reason === null) offending.push(line);
    else if (reason.length < 8) {
      addViolation(
        'Page Save Write Gateway',
        filePath,
        `page-save-read marker at line ${line} states no reason.`,
        'Say what the call computes and that it persists nothing, or stage it.',
      );
    }
  }
  if (offending.length === 0) return;

  const exempt = NON_PAGE_SAVE_CAPABILITIES.find((entry) => entry.file === fileRel);
  if (exempt) return;

  addViolation(
    'Page Save Write Gateway',
    filePath,
    `Rendering code writes outside the page-save gateway (line${offending.length > 1 ? 's' : ''} ${offending.sort((a, b) => a - b).join(', ')}).`,
    'Stage the write as a page-save operation — stage({ kind, execute }) — or implement it in a save handler. ' +
      'A capability that legitimately owns its own writes belongs in NON_PAGE_SAVE_CAPABILITIES with a stated reason.',
  );
}

export function checkPageSaveWriteGatewayContract(): void {
  for (const file of walk(join(ROOT, 'src'))) {
    const fileRel = rel(file).replace(/\\/g, '/');
    // Every `.tsx` is rendering code wherever it lives, plus `.ts` under
    // `presentation/` for the hooks that back a page. Scoping by folder alone
    // missed a component placed outside `presentation/` — the probe written to
    // reproduce the original bypass sailed through the very check meant to
    // catch it.
    const isRenderingCode =
      fileRel.endsWith('.tsx') || /\/presentation\//.test(fileRel);
    if (!isRenderingCode) continue;
    if (/\.test\.tsx?$/.test(fileRel)) continue;
    const content = readFileSync(file, 'utf8');
    if (!content.includes('asolApi')) continue;
    analyse(file, content);
  }
}
