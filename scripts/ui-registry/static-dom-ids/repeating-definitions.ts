import { dirname, join } from "node:path";

import ts from "typescript";

import { iteratorCallbackNames, parseTsx } from "./tsx-hosts";

export interface HostMultiplicity {
  /** Defining files whose entire template can appear more than once in one DOM. */
  readonly repeatingFiles: Set<string>;
  /** `file#functionName` locals that can appear more than once. */
  readonly repeatingSymbols: Set<string>;
}

export function symbolKey(file: string, name: string): string {
  return `${file}#${name}`;
}

function resolveModule(
  fromFile: string,
  specifier: string,
  files: Set<string>,
): string | null {
  if (specifier.startsWith("@/")) specifier = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith(".")) {
    specifier = join(dirname(fromFile), specifier).replace(/\\/g, "/");
  } else return null;
  for (const candidate of [
    specifier,
    `${specifier}.tsx`,
    `${specifier}.ts`,
    `${specifier}/index.tsx`,
    `${specifier}/index.ts`,
  ]) {
    const normalized = candidate.replace(/\\/g, "/");
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
  sources: Map<string, string>,
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
    if (ts.isExportAssignment(statement) && exportName === "default") return true;
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
  sources: Map<string, string>,
  seen: Set<string> = new Set(),
): string | null {
  if (seen.has(modulePath)) return null;
  seen.add(modulePath);
  if (modulePath.endsWith(".tsx")) {
    if (!exportName || exportName === "default" || fileExportsName(modulePath, exportName, sources)) {
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
        if (element.name.text === exportName) {
          return definingFileForExport(next, exportName, sources, seen);
        }
      }
    }
  }
  return null;
}

export function localBindings(
  sourceFile: ts.SourceFile,
  fromFile: string,
  sources: Map<string, string>,
): Map<string, string> {
  const files = new Set(sources.keys());
  const bindings = new Map<string, string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const modulePath = resolveModule(fromFile, statement.moduleSpecifier.text, files);
    if (!modulePath || !statement.importClause) continue;
    if (statement.importClause.name) {
      const defined =
        definingFileForExport(modulePath, statement.importClause.name.text, sources) ??
        definingFileForExport(modulePath, "default", sources) ??
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

export function jsxComponentName(tag: ts.JsxTagNameExpression): string | null {
  if (ts.isIdentifier(tag) && /^[A-Z]/.test(tag.text)) return tag.text;
  return null;
}

function isIteratorCall(node: ts.CallExpression): boolean {
  const expression = node.expression;
  if (!ts.isPropertyAccessExpression(expression) && !ts.isPropertyAccessChain(expression)) {
    return false;
  }
  const name = expression.name.text;
  return name === "map" || name === "flatMap" || name === "forEach";
}

function nodeInIterator(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isCallExpression(current) && isIteratorCall(current)) return true;
    current = current.parent;
  }
  return false;
}

function localNameDefined(sourceFile: ts.SourceFile, name: string): boolean {
  let found = false;
  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = true;
    if (ts.isClassDeclaration(node) && node.name?.text === name) found = true;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      found = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

export function hostMultiplicity(sources: Map<string, string>): HostMultiplicity {
  const files = new Set(sources.keys());
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
    const bindings = localBindings(sourceFile, path, sources);
    for (const name of iteratorCallbackNames(sourceFile)) {
      if (bindings.has(name)) bumpFile(bindings.get(name)!, true);
      else if (localNameDefined(sourceFile, name)) bumpSymbol(path, name, true);
    }

    function visit(node: ts.Node): void {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const name = jsxComponentName(node.tagName);
        if (name) {
          const inIterator = nodeInIterator(node);
          const imported = bindings.get(name);
          if (imported) bumpFile(imported, inIterator);
          else if (localNameDefined(sourceFile, name)) bumpSymbol(path, name, inIterator);
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
  for (const file of files) {
    if (!file.endsWith(".tsx")) continue;
    if (file.replace(/\\/g, "/").startsWith("src/shared/ui/")) repeatingFiles.add(file);
  }

  const repeatingSymbols = new Set<string>();
  for (const [key, use] of symbolUses) {
    if (use.iterator || use.count > 1) repeatingSymbols.add(key);
  }
  return { repeatingFiles, repeatingSymbols };
}
