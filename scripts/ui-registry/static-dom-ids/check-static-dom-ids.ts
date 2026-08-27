import { loadSrcTsx, duplicateLiteralIds } from "./apply-to-repo";
import { isNonDomRootComponent, isSharedUiFile } from "./component-host-policy";
import { componentForwardsDomId } from "./dom-id-forwarding";
import { planStaticDomIds } from "./plan-static-dom-ids";
import { hostMultiplicity, jsxComponentName, localBindings } from "./repeating-definitions";
import { parseTsx } from "./tsx-hosts";
import ts from "typescript";

export function requiredDomIdForwardingKeys(sources: Map<string, string>): string[] {
  const multiplicity = hostMultiplicity(sources);
  const required = new Set<string>();
  for (const [file, source] of sources) {
    if (!file.endsWith(".tsx")) continue;
    const sourceFile = parseTsx(file, source);
    const bindings = localBindings(sourceFile, file, sources);
    function visit(node: ts.Node): void {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const name = jsxComponentName(node.tagName);
        if (!name || isNonDomRootComponent(name)) return;
        const imported = bindings.get(name);
        if (imported && (multiplicity.repeatingFiles.has(imported) || isSharedUiFile(imported))) {
          required.add(`${imported}#${name}`);
        }
        if (!imported && multiplicity.repeatingSymbols.has(`${file}#${name}`)) {
          required.add(`${file}#${name}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }
  return [...required];
}

export function checkStaticDomIds(root: string): string[] {
  const sources = loadSrcTsx(root);
  const errors: string[] = [];
  const remaining = planStaticDomIds(sources);
  if (remaining.length > 0) {
    const preview = remaining
      .slice(0, 20)
      .map((edit) => `${edit.file}:${edit.line} <${edit.tag}>`)
      .join("; ");
    errors.push(
      `${remaining.length} static host(s) still lack a literal HTML id. Run npx tsx scripts/ui-registry/static-dom-ids/apply-static-dom-ids.ts. First: ${preview}`,
    );
  }
  const duplicates = duplicateLiteralIds(sources);
  if (duplicates.length > 0) {
    errors.push(`duplicate HTML ids: ${duplicates.slice(0, 20).join(", ")}`);
  }

  for (const key of requiredDomIdForwardingKeys(sources)) {
    const hash = key.indexOf("#");
    const file = key.slice(0, hash);
    const name = key.slice(hash + 1);
    const source = sources.get(file);
    if (!source) continue;
    if (!componentForwardsDomId(source, file, name)) {
      errors.push(`${file} export ${name} must forward id to its root DOM node`);
    }
  }
  return errors;
}
