/**
 * Small AST primitives shared by every DOM-identity check: parsing, JSX tag
 * classification, and the import-resolution walk that finds which file
 * actually defines a JSX component name. This is the one place that answers
 * "what does this JSX identifier refer to" — every other check in this
 * package, and every uid-migration/coverage tool under `scripts/`, calls
 * through here instead of re-parsing or re-resolving imports itself.
 */
import { dirname, join } from 'node:path';

import ts from 'typescript';

export function parseTsx(fileName: string, source: string): ts.SourceFile {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** True for a JSX intrinsic — any tag whose name starts lowercase. React/JSX
 * semantics, not a maintained list: `div`, `path`, `circle`, a future tag —
 * all recognized the same way, with no whitelist to fall behind. */
export function isIntrinsicJsxTag(tag: ts.JsxTagNameExpression): tag is ts.Identifier {
  return ts.isIdentifier(tag) && /^[a-z]/.test(tag.text);
}

/** A project-owned (capitalized) JSX component reference, e.g. `<Button>`. */
export function jsxComponentName(tag: ts.JsxTagNameExpression): string | null {
  if (ts.isIdentifier(tag) && /^[A-Z]/.test(tag.text)) return tag.text;
  return null;
}

/**
 * A namespaced/member JSX tag, e.g. `<DialogPrimitive.Close>`. Its leftmost
 * identifier is what a local import binds — `DialogPrimitive` — so that is
 * what resolution keys on; the whole dotted name is kept for reporting.
 */
export function jsxMemberTag(
  tag: ts.JsxTagNameExpression,
): { rootIdentifier: string; qualifiedName: string } | null {
  if (!ts.isPropertyAccessExpression(tag)) return null;
  let cursor: ts.Expression = tag;
  const parts: string[] = [];
  while (ts.isPropertyAccessExpression(cursor)) {
    parts.unshift(cursor.name.text);
    cursor = cursor.expression;
  }
  if (!ts.isIdentifier(cursor)) return null;
  parts.unshift(cursor.text);
  return { rootIdentifier: cursor.text, qualifiedName: parts.join('.') };
}

export function jsxOpening(
  node: ts.Node,
): ts.JsxOpeningElement | ts.JsxSelfClosingElement | null {
  return ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) ? node : null;
}

function resolveModule(fromFile: string, specifier: string, files: ReadonlySet<string>): string | null {
  let target = specifier;
  if (target.startsWith('@/')) target = `src/${target.slice(2)}`;
  else if (target.startsWith('.')) target = join(dirname(fromFile), target).replace(/\\/g, '/');
  else return null; // bare specifier: a package, not a project file
  for (const candidate of [target, `${target}.tsx`, `${target}.ts`, `${target}/index.tsx`, `${target}/index.ts`]) {
    const normalized = candidate.replace(/\\/g, '/');
    if (files.has(normalized)) return normalized;
  }
  return null;
}

function isExported(node: ts.Node): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
}

function fileExportsName(
  modulePath: string,
  exportName: string,
  sources: ReadonlyMap<string, string>,
  seen: Set<string> = new Set(),
): boolean {
  if (seen.has(modulePath)) return false;
  seen.add(modulePath);
  const source = sources.get(modulePath);
  if (!source) return false;
  const sourceFile = parseTsx(modulePath, source);
  const files = new Set(sources.keys());
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === exportName && isExported(statement)) {
      return true;
    }
    if (ts.isClassDeclaration(statement) && statement.name?.text === exportName && isExported(statement)) {
      return true;
    }
    if (ts.isVariableStatement(statement) && isExported(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === exportName) return true;
      }
    }
    if (ts.isExportAssignment(statement) && exportName === 'default') return true;
    if (!ts.isExportDeclaration(statement)) continue;
    if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        if (element.name.text === exportName) return true;
      }
    }
    if (!statement.exportClause && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      const next = resolveModule(modulePath, statement.moduleSpecifier.text, files);
      if (next && fileExportsName(next, exportName, sources, seen)) return true;
    }
  }
  return false;
}

function definingFileForExport(
  modulePath: string,
  exportName: string | null,
  sources: ReadonlyMap<string, string>,
  seen: Set<string> = new Set(),
): string | null {
  if (seen.has(modulePath)) return null;
  seen.add(modulePath);
  if (modulePath.endsWith('.tsx')) {
    if (!exportName || exportName === 'default' || fileExportsName(modulePath, exportName, sources)) {
      return modulePath;
    }
    return null;
  }
  const source = sources.get(modulePath);
  if (!source) return null;
  const sourceFile = parseTsx(modulePath, source);
  const files = new Set(sources.keys());
  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const next = resolveModule(modulePath, statement.moduleSpecifier.text, files);
    if (!next) continue;
    if (!statement.exportClause) {
      const defined = definingFileForExport(next, exportName, sources, seen);
      if (defined) return defined;
      continue;
    }
    if (exportName && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        if (element.name.text === exportName) return definingFileForExport(next, exportName, sources, seen);
      }
    }
  }
  return null;
}

/**
 * Maps every local JSX/value identifier bound by an import in `fromFile` to
 * the project-relative file that actually defines it — following barrel
 * re-exports — or leaves it unmapped when the specifier is a bare package
 * name (third-party) or cannot be resolved inside `sources`.
 */
export function localBindings(
  sourceFile: ts.SourceFile,
  fromFile: string,
  sources: ReadonlyMap<string, string>,
): Map<string, string> {
  const files = new Set(sources.keys());
  const bindings = new Map<string, string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const modulePath = resolveModule(fromFile, statement.moduleSpecifier.text, files);
    if (!statement.importClause) continue;
    if (!modulePath) {
      // A bare specifier: record the binding as third-party by mapping it to
      // the specifier itself, which never matches a project file path.
      if (statement.importClause.name) {
        bindings.set(statement.importClause.name.text, `third-party:${statement.moduleSpecifier.text}`);
      }
      const named = statement.importClause.namedBindings;
      if (named && ts.isNamedImports(named)) {
        for (const element of named.elements) {
          bindings.set(element.name.text, `third-party:${statement.moduleSpecifier.text}`);
        }
      }
      continue;
    }
    if (statement.importClause.name) {
      const defined =
        definingFileForExport(modulePath, statement.importClause.name.text, sources) ??
        definingFileForExport(modulePath, 'default', sources) ??
        modulePath;
      bindings.set(statement.importClause.name.text, defined);
    }
    const named = statement.importClause.namedBindings;
    if (named && ts.isNamedImports(named)) {
      for (const element of named.elements) {
        const exportName = (element.propertyName ?? element.name).text;
        const defined = definingFileForExport(modulePath, exportName, sources) ?? modulePath;
        bindings.set(element.name.text, defined);
      }
    }
  }
  return bindings;
}

export function isThirdPartyBinding(binding: string | undefined): boolean {
  return binding !== undefined && binding.startsWith('third-party:');
}
