import { dirname, join } from 'node:path';

import ts from 'typescript';

export function parseTsx(fileName: string, source: string): ts.SourceFile {
  const scriptKind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind);
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

function existingCandidate(target: string, files: ReadonlySet<string>): string | null {
  for (const candidate of [
    target,
    `${target}.tsx`,
    `${target}.ts`,
    `${target}/index.tsx`,
    `${target}/index.ts`,
    `${target}/ui.tsx`,
    `${target}/ui.ts`,
    `${target}/server.tsx`,
    `${target}/server.ts`,
  ]) {
    const normalized = candidate.replace(/\\/g, '/');
    if (files.has(normalized)) return normalized;
  }
  return null;
}

/**
 * Resolves a project module specifier against the loaded repository source.
 * `@asol/*` is an internal workspace scope, never a third-party package.
 */
export function resolveProjectModule(
  fromFile: string,
  specifier: string,
  files: ReadonlySet<string>,
): string | null {
  let target: string;
  if (specifier.startsWith('@/')) {
    target = `src/${specifier.slice(2)}`;
  } else if (specifier.startsWith('.')) {
    target = join(dirname(fromFile), specifier).replace(/\\/g, '/');
  } else if (specifier.startsWith('@asol/')) {
    const parts = specifier.split('/');
    const packageFolder = parts[1];
    if (!packageFolder) return null;
    const subpath = parts.slice(2).join('/');
    target = subpath
      ? `packages/${packageFolder}/src/${subpath}`
      : `packages/${packageFolder}/src/index`;
  } else {
    return null;
  }
  return existingCandidate(target, files);
}

function hasDefaultModifier(node: ts.Node): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Default) !== 0;
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
  const key = `${modulePath}#${exportName}`;
  if (seen.has(key)) return false;
  seen.add(key);
  const source = sources.get(modulePath);
  if (!source) return false;
  const sourceFile = parseTsx(modulePath, source);
  const files = new Set(sources.keys());

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
      if (exportName === 'default' && isExported(statement) && hasDefaultModifier(statement)) return true;
      if (statement.name?.text === exportName && isExported(statement)) return true;
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
        if (element.name.text !== exportName) continue;
        if (!statement.moduleSpecifier) return true;
        if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const next = resolveProjectModule(modulePath, statement.moduleSpecifier.text, files);
        const targetName = (element.propertyName ?? element.name).text;
        if (next && fileExportsName(next, targetName, sources, seen)) return true;
      }
    }

    if (!statement.exportClause && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      const next = resolveProjectModule(modulePath, statement.moduleSpecifier.text, files);
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
  const key = `${modulePath}#${exportName ?? '*'}`;
  if (seen.has(key)) return null;
  seen.add(key);
  const source = sources.get(modulePath);
  if (!source) return null;

  if (modulePath.endsWith('.tsx')) {
    if (!exportName || exportName === 'default' || fileExportsName(modulePath, exportName, sources)) {
      return modulePath;
    }
  }

  const sourceFile = parseTsx(modulePath, source);
  const files = new Set(sources.keys());
  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const next = resolveProjectModule(modulePath, statement.moduleSpecifier.text, files);
    if (!next) continue;

    if (!statement.exportClause) {
      const defined = definingFileForExport(next, exportName, sources, seen);
      if (defined) return defined;
      continue;
    }

    if (exportName && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        if (element.name.text !== exportName) continue;
        const targetName = (element.propertyName ?? element.name).text;
        const defined = definingFileForExport(next, targetName, sources, seen);
        if (defined) return defined;
      }
    }
  }

  if (modulePath.endsWith('.tsx') && exportName && fileExportsName(modulePath, exportName, sources)) {
    return modulePath;
  }
  return null;
}

/**
 * Maps every local JSX/value identifier bound by an import in `fromFile` to
 * the project-relative file that actually defines it — following barrels and
 * workspace exports — or to `third-party:<specifier>` for a true external
 * dependency.
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
    const specifier = statement.moduleSpecifier.text;
    const modulePath = resolveProjectModule(fromFile, specifier, files);
    if (!statement.importClause) continue;

    if (!modulePath) {
      const external = `third-party:${specifier}`;
      if (statement.importClause.name) bindings.set(statement.importClause.name.text, external);
      const named = statement.importClause.namedBindings;
      if (named && ts.isNamedImports(named)) {
        for (const element of named.elements) bindings.set(element.name.text, external);
      }
      if (named && ts.isNamespaceImport(named)) bindings.set(named.name.text, external);
      continue;
    }

    if (statement.importClause.name) {
      const defined =
        definingFileForExport(modulePath, 'default', sources) ??
        definingFileForExport(modulePath, statement.importClause.name.text, sources) ??
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
    if (named && ts.isNamespaceImport(named)) bindings.set(named.name.text, modulePath);
  }
  return bindings;
}

export function isThirdPartyBinding(binding: string | undefined): boolean {
  return binding !== undefined && binding.startsWith('third-party:');
}
