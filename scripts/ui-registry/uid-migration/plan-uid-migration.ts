import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";

import { isSharedUiFile, isNonDomRootComponent } from "../static-dom-ids/component-host-policy";
import { fileSemanticPrefix } from "../static-dom-ids/file-semantic";
import { localBindings } from "../static-dom-ids/repeating-definitions";
import { parseTsx } from "../static-dom-ids/tsx-hosts";
import { VISIBLE_HOST_TAGS } from "../static-dom-ids/visible-host-tags";
import { mintSemanticId, mintUid } from "./mint-uid";

/**
 * Shared UI primitives that own no uid of their own by design: the DOM node
 * they render lives inside their file, but the identity belongs to the
 * caller. `file` is relative to the repo root; `component` is the imported
 * name callers use.
 */
const PRIMITIVE_COMPONENTS: ReadonlyArray<{ file: string; component: string }> = [
  { file: "src/shared/ui/button.tsx", component: "Button" },
  { file: "src/shared/ui/checkbox.tsx", component: "Checkbox" },
  { file: "src/shared/ui/input.tsx", component: "Input" },
  { file: "src/shared/ui/phone-field.tsx", component: "PhoneField" },
  { file: "src/shared/ui/radio-group.tsx", component: "RadioGroupItem" },
  { file: "src/shared/ui/select.tsx", component: "SelectTrigger" },
  { file: "src/shared/ui/switch.tsx", component: "Switch" },
  { file: "src/shared/ui/tabs.tsx", component: "TabsTrigger" },
  { file: "src/shared/ui/textarea.tsx", component: "Textarea" },
];

export interface UidMigrationEdit {
  readonly file: string;
  readonly insertAt: number;
  readonly line: number;
  readonly kind: "host" | "primitive";
  readonly tag: string;
  readonly uid: string;
  readonly id: string;
}

function tsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      return entry === "node_modules" || entry === "tests" || entry === "generated" ? [] : tsxFiles(full);
    }
    if (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) return [];
    return entry.endsWith(".tsx") ? [full] : [];
  });
}

export function loadAppTsx(root: string): Map<string, string> {
  const sources = new Map<string, string>();
  for (const full of tsxFiles(join(root, "src"))) {
    const relativePath = relative(root, full).replace(/\\/g, "/");
    sources.set(relativePath, readFileSync(full, "utf8"));
  }
  return sources;
}

/** Every `uid: "…"` literal already registered anywhere in `src/` or the page registry. */
export function collectExistingUids(root: string, sources: Map<string, string>): Set<string> {
  const uids = new Set<string>();
  for (const source of sources.values()) {
    for (const match of source.matchAll(/\buid:\s*["']([^"']+)["']/g)) uids.add(match[1]!);
  }
  const registryPath = join(root, "packages", "ui-registry-core", "src", "registry", "ui-page-registry.ts");
  try {
    const registrySource = readFileSync(registryPath, "utf8");
    for (const match of registrySource.matchAll(/\buid:\s*["']([^"']+)["']/g)) uids.add(match[1]!);
  } catch {
    // Registry file always exists in this repo; ignore if it does not.
  }
  return uids;
}

/** Every semantic `id` string literal already declared anywhere in `src/`, so minted ids never collide. */
function collectExistingIds(sources: Map<string, string>): Set<string> {
  const ids = new Set<string>();
  for (const source of sources.values()) {
    for (const match of source.matchAll(/\bid:\s*["']([^"']+)["']/g)) ids.add(match[1]!);
    for (const match of source.matchAll(/\bid="([^"]+)"/g)) ids.add(match[1]!);
  }
  return ids;
}

function hasAttribute(attributes: ts.JsxAttributes, name: string): boolean {
  return attributes.properties.some(
    (property) => ts.isJsxAttribute(property) && property.name.getText() === name,
  );
}

function hasSpread(attributes: ts.JsxAttributes): boolean {
  return attributes.properties.some((property) => ts.isJsxSpreadAttribute(property));
}

/** True when the element already carries our own registry spread — already covered, not a gap. */
function hasUiRegistrySpread(attributes: ts.JsxAttributes): boolean {
  return attributes.properties.some(
    (property) =>
      ts.isJsxSpreadAttribute(property) &&
      /\b(?:uiAttributes|uiComponentAttributes|uiPageAttributes)\s*\(/.test(property.expression.getText()),
  );
}

/** True when a spread attribute exists that is *not* our own registry call — a genuine gap. */
function hasForeignSpread(attributes: ts.JsxAttributes): boolean {
  return hasSpread(attributes) && !hasUiRegistrySpread(attributes);
}

/**
 * Where to splice the new attribute: right after the tag name, unless a
 * `key` attribute is already present, in which case after `key` — a
 * `uiAttributes()`/`ui={{}}` spread written before `key` drops the JSX
 * transform to `createElement`, which stops validating the element's
 * children and misreports an unrelated sibling as missing its key.
 */
function insertionPoint(opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement): number {
  const keyAttribute = opening.attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.getText() === "key",
  );
  return keyAttribute ? keyAttribute.getEnd() : opening.tagName.getEnd();
}

function htmlTagName(tag: ts.JsxTagNameExpression): string | null {
  if (ts.isIdentifier(tag) && /^[a-z]/.test(tag.text)) return tag.text;
  return null;
}

function jsxComponentName(tag: ts.JsxTagNameExpression): string | null {
  if (ts.isIdentifier(tag) && /^[A-Z]/.test(tag.text)) return tag.text;
  return null;
}

/**
 * Plans the literal-uid migration for every project-owned DOM usage site
 * under `src/`: raw intrinsic host tags get a `{...uiAttributes({...})}`
 * spread, and usages of the known shared UI primitives get an explicit
 * `ui={{...}}` descriptor. Shared primitive *definitions* themselves are
 * never touched — a uid baked into one would repeat across every instance.
 */
export function planUidMigration(root: string): {
  edits: UidMigrationEdit[];
  importsNeeded: Set<string>;
  skippedSpread: { file: string; line: number; tag: string }[];
} {
  const sources = loadAppTsx(root);
  const takenUids = collectExistingUids(root, sources);
  const takenIds = collectExistingIds(sources);
  const edits: UidMigrationEdit[] = [];
  const importsNeeded = new Set<string>();
  const skippedSpread: { file: string; line: number; tag: string }[] = [];

  const primitiveByComponentName = new Map(
    PRIMITIVE_COMPONENTS.map((entry) => [entry.component, entry.file] as const),
  );

  for (const [file, source] of sources) {
    if (isSharedUiFile(file)) continue; // primitives never own a uid of their own

    const sourceFile = parseTsx(file, source);
    const prefix = fileSemanticPrefix(file);
    const bindings = localBindings(sourceFile, file, sources);
    let fileNeedsImport = false;

    function visit(node: ts.Node): void {
      const opening =
        ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) ? node : null;
      if (opening) {
        const htmlTag = htmlTagName(opening.tagName);
        const componentName = jsxComponentName(opening.tagName);
        const line = sourceFile.getLineAndCharacterOfPosition(opening.getStart()).line + 1;

        if (htmlTag && VISIBLE_HOST_TAGS.has(htmlTag)) {
          if (hasUiRegistrySpread(opening.attributes)) {
            // Already covered by an earlier migration pass — not a gap.
          } else if (hasForeignSpread(opening.attributes)) {
            skippedSpread.push({ file, line, tag: htmlTag });
          } else {
            const id = mintSemanticId(prefix, htmlTag, takenIds);
            const uid = mintUid(id, takenUids);
            edits.push({ file, insertAt: insertionPoint(opening), line, kind: "host", tag: htmlTag, uid, id });
            fileNeedsImport = true;
          }
        } else if (componentName && !isNonDomRootComponent(componentName)) {
          const imported = bindings.get(componentName);
          const isPrimitiveUsage = imported !== undefined && primitiveByComponentName.get(componentName) === imported;
          if (isPrimitiveUsage && !hasAttribute(opening.attributes, "ui")) {
            if (hasSpread(opening.attributes)) {
              skippedSpread.push({ file, line, tag: componentName });
            } else {
              const id = mintSemanticId(prefix, componentName, takenIds);
              const uid = mintUid(id, takenUids);
              edits.push({
                file,
                insertAt: insertionPoint(opening),
                line,
                kind: "primitive",
                tag: componentName,
                uid,
                id,
              });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    if (
      fileNeedsImport &&
      !/import\s*\{[^}]*\buiAttributes\b[^}]*\}\s*from\s*["']@asol\/ui-registry-core["']/.test(source)
    ) {
      importsNeeded.add(file);
    }
  }

  return { edits, importsNeeded, skippedSpread };
}
