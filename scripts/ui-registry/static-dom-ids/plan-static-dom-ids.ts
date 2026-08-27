import { isUiUidPrefix } from "@asol/ui-registry-core";

import ts from "typescript";

import {
  isNonDomRootComponent,
  isSharedUiFile,
  semanticHostToken,
} from "./component-host-policy";
import { fileSemanticPrefix } from "./file-semantic";
import { literalHtmlIds } from "./literal-html-ids";
import { hostMultiplicity, jsxComponentName, localBindings, symbolKey } from "./repeating-definitions";
import {
  enclosingFunctionName,
  isInsideIteratorCallback,
  isRouteShellFile,
  parseTsx,
} from "./tsx-hosts";
import { VISIBLE_HOST_TAGS } from "./visible-host-tags";

export interface StaticDomIdEdit {
  readonly file: string;
  readonly insertAt: number;
  readonly line: number;
  readonly tag: string;
  readonly id: string;
}

function htmlTagName(tag: ts.JsxTagNameExpression): string | null {
  if (ts.isIdentifier(tag) && /^[a-z]/.test(tag.text)) return tag.text;
  return null;
}

function hasLiteralOrExpressionId(attributes: ts.JsxAttributes): boolean {
  return attributes.properties.some(
    (property) => ts.isJsxAttribute(property) && property.name.getText() === "id",
  );
}

function hasSpread(attributes: ts.JsxAttributes): boolean {
  return attributes.properties.some((property) => ts.isJsxSpreadAttribute(property));
}

function mintId(prefix: string, tag: string, taken: Set<string>): string {
  const token = semanticHostToken(tag) || "host";
  const base = `${prefix}.${token}`;
  let candidate = isUiUidPrefix(base) ? base : `${prefix}.host-${token}`;
  if (!isUiUidPrefix(candidate)) candidate = `host.${token}`;
  if (!taken.has(candidate) && isUiUidPrefix(candidate)) {
    taken.add(candidate);
    return candidate;
  }
  let index = 2;
  while (true) {
    const next = `${candidate}.${index}`;
    if (!taken.has(next) && isUiUidPrefix(next)) {
      taken.add(next);
      return next;
    }
    index += 1;
  }
}

function templateWouldDuplicate(
  file: string,
  node: ts.Node,
  multiplicity: ReturnType<typeof hostMultiplicity>,
): boolean {
  if (isInsideIteratorCallback(node)) return true;
  if (multiplicity.repeatingFiles.has(file) && !isRouteShellFile(file)) return true;
  const owner = enclosingFunctionName(node);
  return owner !== null && multiplicity.repeatingSymbols.has(symbolKey(file, owner));
}

function componentUsageNeedsId(
  file: string,
  name: string,
  node: ts.Node,
  bindings: Map<string, string>,
  multiplicity: ReturnType<typeof hostMultiplicity>,
  locals: Set<string>,
): boolean {
  if (isNonDomRootComponent(name)) return false;
  if (templateWouldDuplicate(file, node, multiplicity)) return false;
  const imported = bindings.get(name);
  if (imported) {
    return multiplicity.repeatingFiles.has(imported) || isSharedUiFile(imported);
  }
  if (locals.has(name)) {
    return multiplicity.repeatingSymbols.has(symbolKey(file, name));
  }
  return true;
}

function localComponentNames(sourceFile: ts.SourceFile): Set<string> {
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

export function planStaticDomIds(sources: Map<string, string>): StaticDomIdEdit[] {
  const taken = new Set<string>();
  for (const source of sources.values()) {
    for (const id of literalHtmlIds(source)) taken.add(id);
  }

  const multiplicity = hostMultiplicity(sources);
  const edits: StaticDomIdEdit[] = [];

  for (const [file, source] of sources) {
    if (!file.endsWith(".tsx")) continue;
    const sourceFile = parseTsx(file, source);
    const prefix = fileSemanticPrefix(file);
    const bindings = localBindings(sourceFile, file, sources);
    const locals = localComponentNames(sourceFile);

    function visit(node: ts.Node): void {
      const opening =
        ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) ? node : null;
      if (
        opening &&
        !hasLiteralOrExpressionId(opening.attributes) &&
        !hasSpread(opening.attributes)
      ) {
        const htmlTag = htmlTagName(opening.tagName);
        const componentName = jsxComponentName(opening.tagName);
        if (
          htmlTag &&
          VISIBLE_HOST_TAGS.has(htmlTag) &&
          !templateWouldDuplicate(file, opening, multiplicity)
        ) {
          edits.push({
            file,
            insertAt: opening.tagName.getEnd(),
            line: sourceFile.getLineAndCharacterOfPosition(opening.getStart()).line + 1,
            tag: htmlTag,
            id: mintId(prefix, htmlTag, taken),
          });
        } else if (
          componentName &&
          componentUsageNeedsId(file, componentName, opening, bindings, multiplicity, locals)
        ) {
          edits.push({
            file,
            insertAt: opening.tagName.getEnd(),
            line: sourceFile.getLineAndCharacterOfPosition(opening.getStart()).line + 1,
            tag: componentName,
            id: mintId(prefix, componentName, taken),
          });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  return edits.sort((left, right) =>
    left.file === right.file ? right.insertAt - left.insertAt : left.file.localeCompare(right.file),
  );
}

export function applyStaticDomIdEdits(
  sources: Map<string, string>,
  edits: readonly StaticDomIdEdit[],
): Map<string, string> {
  const next = new Map(sources);
  const byFile = new Map<string, StaticDomIdEdit[]>();
  for (const edit of edits) {
    const list = byFile.get(edit.file) ?? [];
    list.push(edit);
    byFile.set(edit.file, list);
  }
  for (const [file, fileEdits] of byFile) {
    const ordered = [...fileEdits].sort((left, right) => right.insertAt - left.insertAt);
    let source = next.get(file)!;
    for (const edit of ordered) {
      source = `${source.slice(0, edit.insertAt)} id="${edit.id}"${source.slice(edit.insertAt)}`;
    }
    next.set(file, source);
  }
  return next;
}
