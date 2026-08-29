import ts from 'typescript';

import { parseTsx, resolveProjectModule } from './tsx-ast';

/**
 * Files reachable through static project-owned imports/re-exports from a set of
 * repository-relative entries. External packages are terminal leaves. This is
 * shared tooling infrastructure for route attribution; no regex import parser
 * may maintain a second dependency graph.
 */
export function reachableProjectFiles(
  entries: readonly string[],
  sources: ReadonlyMap<string, string>,
): ReadonlySet<string> {
  const files = new Set(sources.keys());
  const pending = [...entries];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const current = pending.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const source = sources.get(current);
    if (!source) continue;
    const sourceFile = parseTsx(current, source);

    for (const statement of sourceFile.statements) {
      let specifier: string | null = null;
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        specifier = statement.moduleSpecifier.text;
      } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        specifier = statement.moduleSpecifier.text;
      }
      if (!specifier) continue;
      const resolved = resolveProjectModule(current, specifier, files);
      if (resolved && !visited.has(resolved)) pending.push(resolved);
    }
  }

  return visited;
}
