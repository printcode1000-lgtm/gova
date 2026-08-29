/**
 * Generates the `data-ui-component` marker → JSX component name bridge the
 * pending-registration pipeline uses to find a browser-reported marker's
 * source. Replaces a hand-maintained list: every exported component under
 * `src/shared/ui/**` whose root forwards a literal marker into
 * `uiPrimitiveAttributes("<marker>", ui, ...)` is discovered automatically,
 * so adding a new shared primitive never requires a second, easy-to-forget
 * edit here.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import { loadProjectTsx } from "@asol/architecture-core";
import ts from "typescript";

const OUTPUT = join(
  "packages",
  "ui-registry-core",
  "src",
  "pending",
  "generated",
  "component-marker-bridge.ts",
);

const BANNER = `/* GENERATED FILE. DO NOT EDIT BY HAND.
   Source: every exported component under src/shared/ui/** whose root forwards
   a literal marker into uiPrimitiveAttributes("<marker>", ui, ...).
   Regenerate: npm run ui-registry:component-bridge:generate
   Drift fails: npm run ui-registry:component-bridge:check (also an architecture:check preflight) */
`;

function markerAndExportName(sourceFile: ts.SourceFile): Map<string, string> {
  const found = new Map<string, string>(); // component name -> marker
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "uiPrimitiveAttributes" &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const marker = node.arguments[0].text;
      // Walk up to the nearest enclosing exported function/arrow/forwardRef
      // component — its name is what a locator's `component` field resolves to.
      let current: ts.Node | undefined = node;
      while (current) {
        if (ts.isVariableStatement(current)) {
          for (const declaration of current.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name)) found.set(declaration.name.text, marker);
          }
          break;
        }
        if (ts.isFunctionDeclaration(current) && current.name) {
          found.set(current.name.text, marker);
          break;
        }
        current = current.parent;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

export function buildComponentMarkerBridge(root: string): Record<string, string[]> {
  const sources = loadProjectTsx(root);
  const bridge: Record<string, string[]> = {};
  for (const [file, source] of sources) {
    if (!file.replace(/\\/g, "/").startsWith("src/shared/ui/")) continue;
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const [component, marker] of markerAndExportName(sourceFile)) {
      const list = bridge[marker] ?? [];
      if (!list.includes(component)) list.push(component);
      bridge[marker] = list;
    }
  }
  for (const marker of Object.keys(bridge)) bridge[marker]!.sort();
  return bridge;
}

export function renderComponentMarkerBridge(root: string): string {
  const bridge = buildComponentMarkerBridge(root);
  const lines = Object.keys(bridge)
    .sort()
    .map((marker) => `  ${JSON.stringify(marker)}: [${bridge[marker]!.map((name) => JSON.stringify(name)).join(", ")}],`);
  return [
    BANNER,
    "export const COMPONENT_MARKER_BRIDGE: Readonly<Record<string, readonly string[]>> = {",
    ...lines,
    "};",
    "",
  ].join("\n");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  const root = process.cwd();
  const rendered = renderComponentMarkerBridge(root);
  const output = join(root, OUTPUT);
  const current = existsSync(output) ? readFileSync(output, "utf8") : "";
  if (current !== rendered) {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, rendered, "utf8");
    console.log(`Wrote ${relative(root, output)}.`);
  } else {
    console.log(`${relative(root, output)} already up to date.`);
  }
}
