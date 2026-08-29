import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";

import { findDescriptorLiterals } from "../dom-identity/descriptor-literals";
import { parseTsx } from "../dom-identity/tsx-ast";
import { ROOT, addViolation } from "./architecture-types";

/** `@asol/ui-registry-core` owns every UiRegistry contract; the guard reads it there. */
const REGISTRY_OWNER = join(ROOT, "packages", "ui-registry-core", "src");
/** The enforcement package quotes every attribute it forbids. */
const GUARD_OWNER = join(ROOT, "packages", "architecture-core", "src", "checks");
const REGISTRY_PATH = join(REGISTRY_OWNER, "registry", "ui-page-registry.ts");
const APP_ROOT = join(ROOT, "src", "app");
const MANUAL_DATA_UI_ATTRIBUTE = /^data-ui-(?:uid|id|page|component|state|action|part|item-id|instance)$/;

/**
 * The one safe uid shape: a stable lowercase dot/dash-separated semantic
 * prefix, then an immutable six-character Base62 suffix minted once during
 * development. The suffix must carry both an uppercase letter and a digit,
 * which is what separates a real uid from a deterministic copy of the element
 * id or the page id.
 */
const UID_SYNTAX = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*-[0-9A-Za-z]{6}$/;

function hasGeneratedSuffix(uid: string): boolean {
  const suffix = uid.slice(uid.lastIndexOf("-") + 1);
  return UID_SYNTAX.test(uid) && /[A-Z]/.test(suffix) && /[0-9]/.test(suffix);
}

/** True when the uid merely repeats the identity it addresses. */
function isDeterministicCopy(uid: string, identity: string): boolean {
  if (identity === "") return false;
  return (
    uid === identity ||
    uid === `page.${identity}` ||
    uid === `ui.${identity}` ||
    uid === identity.split(".").join("-")
  );
}

interface RegistryEntry {
  route: string;
  id: string;
  uid: string | null;
}

function collectPageRoutes(directory: string): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      routes.push(...collectPageRoutes(fullPath));
      continue;
    }
    if (entry !== "page.tsx") continue;
    const pageDirectory = relative(APP_ROOT, directory).replace(/\\/g, "/");
    routes.push(pageDirectory ? `/${pageDirectory}` : "/");
  }
  return routes;
}

function registryEntries(source: string): RegistryEntry[] {
  const registrySource =
    source.match(/export const UI_PAGE_REGISTRY = \[([\s\S]*?)\] as const/)?.[1] ?? "";
  return [...registrySource.matchAll(/\{([^{}]*)\}/g)].map((match) => {
    const body = match[1]!;
    return {
      route: body.match(/route:\s*"([^"]*)"/)?.[1] ?? "",
      id: body.match(/\bid:\s*"([^"]*)"/)?.[1] ?? "",
      uid: body.match(/\buid:\s*"([^"]*)"/)?.[1] ?? null,
    };
  });
}

function sourceFilesUnder(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      if (
        entry !== "tests" &&
        entry !== "__tests__" &&
        entry !== "node_modules" &&
        entry !== "generated" &&
        entry !== "dist"
      ) {
        files.push(...sourceFilesUnder(fullPath));
      }
      continue;
    }
    if (/\.tsx?$/.test(entry)) files.push(fullPath);
  }
  return files;
}

/**
 * `key` written after a `uiAttributes()`/`ui={{}}` spread on the same
 * element. This is a correctness bug, not a style rule: the JSX transform
 * cannot use `jsx`/`jsxs` when `key` follows a spread, so it falls back to
 * `createElement`, which does not mark the element's static children as
 * validated — React then re-validates them as an unkeyed list and warns
 * about the first child, an element that is not in any list and has
 * nothing to fix. Read from the real attribute order, not text adjacency.
 */
function scanKeyAfterSpread(file: string, sourceFile: ts.SourceFile): void {
  function visit(node: ts.Node): void {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      let sawRegistrySpread = false;
      for (const property of node.attributes.properties) {
        if (
          ts.isJsxSpreadAttribute(property) &&
          /\b(?:uiAttributes|uiComponentAttributes|uiPageAttributes)\s*\(/.test(property.expression.getText())
        ) {
          sawRegistrySpread = true;
          continue;
        }
        if (sawRegistrySpread && ts.isJsxAttribute(property) && property.name.getText() === "key") {
          const line = sourceFile.getLineAndCharacterOfPosition(property.getStart()).line + 1;
          addViolation(
            "UI Attributes",
            file,
            `key follows the uiAttributes spread at line ${line}. Write key before the spread, or React drops to createElement and misreports child keys.`,
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const INDEX_NAMES = new Set(["index", "idx", "i"]);

/** True for a bare `index`/`idx`/`i` identifier, or `String(index)`. */
function isIndexDerivedExpression(node: ts.Expression): boolean {
  if (ts.isIdentifier(node)) return INDEX_NAMES.has(node.text);
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "String") {
    const argument = node.arguments[0];
    return argument !== undefined && ts.isIdentifier(argument) && INDEX_NAMES.has(argument.text);
  }
  if (ts.isTemplateExpression(node)) {
    return node.templateSpans.some((span) => ts.isIdentifier(span.expression) && INDEX_NAMES.has(span.expression.text));
  }
  return false;
}

/** A hand-authored `data-ui-*` JSX attribute — the registry API was bypassed. */
function scanManualAttributes(file: string, sourceFile: ts.SourceFile): void {
  function visit(node: ts.Node): void {
    if (ts.isJsxAttribute(node) && MANUAL_DATA_UI_ATTRIBUTE.test(node.name.getText())) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      addViolation(
        "UI Attributes",
        file,
        `Manual ${node.name.getText()} is forbidden at line ${line}. Use uiAttributes() or a shared UI primitive.`,
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

/**
 * Keeps UI identity declarative and complete: every App Router page must have
 * exactly one safe, value-free registry route carrying a unique uid, every
 * explicitly registered element must declare its own uid as a source literal,
 * and JSX must not create an alternate attribute dialect outside the typed
 * builder. Descriptor reading is AST-exact (`findDescriptorLiterals`): no
 * formatting, multiline object, alias, or comment can hide a violation from
 * a regex the way the old balanced-brace scan could be confused by one.
 *
 * Generic shared primitives that emit only a component marker are intentionally
 * uid-free and are never reported here; `checkUidCoverage` (dom-identity)
 * separately proves every DOM usage site — including every generic primitive
 * usage — actually carries a registration in the first place.
 */
export function checkUiAttributeContract(): void {
  if (!existsSync(REGISTRY_PATH)) {
    addViolation("UI Attributes", REGISTRY_PATH, "Missing package-owned UI page registry.");
    return;
  }

  const source = readFileSync(REGISTRY_PATH, "utf8");
  const entries = registryEntries(source);
  const routes = entries.map((entry) => entry.route);
  const ids = entries.map((entry) => entry.id);
  const registered = new Set(routes);
  const appRoutes = collectPageRoutes(APP_ROOT);
  const uidOwners = new Map<string, string>();
  const descriptorSignatures = new Map<string, { signature: string; location: string }>();

  for (const route of appRoutes) {
    if (!registered.has(route)) {
      addViolation("UI Attributes", REGISTRY_PATH, `Page route ${route} is missing from UI_PAGE_REGISTRY.`);
    }
  }
  for (const route of routes) {
    if (!appRoutes.includes(route)) {
      addViolation("UI Attributes", REGISTRY_PATH, `UI_PAGE_REGISTRY contains no App Router page for ${route}.`);
    }
  }
  if (new Set(routes).size !== routes.length) {
    addViolation("UI Attributes", REGISTRY_PATH, "UI_PAGE_REGISTRY has duplicate route templates.");
  }
  if (new Set(ids).size !== ids.length) {
    addViolation("UI Attributes", REGISTRY_PATH, "UI_PAGE_REGISTRY has duplicate page identities.");
  }
  for (const entry of entries) {
    if (entry.uid === null) {
      addViolation(
        "UI Attributes",
        REGISTRY_PATH,
        `UI_PAGE_REGISTRY entry ${entry.route || entry.id} has no uid. Every registered page needs a stable uid.`,
      );
      continue;
    }
    if (isDeterministicCopy(entry.uid, entry.id)) {
      addViolation(
        "UI Attributes",
        REGISTRY_PATH,
        `UI_PAGE_REGISTRY uid "${entry.uid}" is a deterministic copy of the page id. Mint a uid with a generated Base62 suffix.`,
      );
      continue;
    }
    if (!hasGeneratedSuffix(entry.uid)) {
      addViolation(
        "UI Attributes",
        REGISTRY_PATH,
        `UI_PAGE_REGISTRY uid "${entry.uid}" is not a semantic prefix plus a generated Base62 suffix, for example "product-data-a8K3xP".`,
      );
      continue;
    }
    const owner = uidOwners.get(entry.uid);
    if (owner) {
      addViolation(
        "UI Attributes",
        REGISTRY_PATH,
        `UID "${entry.uid}" is already used by ${owner}. UIDs must be globally unique.`,
      );
      continue;
    }
    uidOwners.set(entry.uid, `UI_PAGE_REGISTRY route ${entry.route}`);
  }

  // `ui-component-attributes.ts` is the one hand-authored no-uid fallback
  // builder; it must never gain a uid parameter that could be misused as a
  // fixed helper-level identity. Checked before the blanket REGISTRY_OWNER
  // skip below, which otherwise excludes all of `@asol/ui-registry-core`'s
  // own source (it is the door the rest of this scan validates *through*,
  // not a UI usage site itself). `dom-identity`'s coverage check proves the
  // broader "no generic primitive owns a fixed root uid" invariant
  // structurally, across every shared UI file, not just this one.
  const componentAttributesHelper = join(REGISTRY_OWNER, "domain", "ui-component-attributes.ts");
  const helperSource = readFileSync(componentAttributesHelper, "utf8");
  const helperUid = helperSource.match(/\buid:\s*["']([^"']*)["']/);
  if (helperUid) {
    addViolation(
      "UI Attributes",
      componentAttributesHelper,
      `Generic UI helper declares uid "${helperUid[1]}". A helper-level uid repeats across every instance; register each usage site instead.`,
    );
  }

  for (const directory of [join(ROOT, "src"), join(ROOT, "packages")]) {
    for (const file of sourceFilesUnder(directory)) {
      if (file.startsWith(REGISTRY_OWNER)) continue;
      // The guards quote every attribute they forbid; scanning them would
      // report the rule text itself as a violation.
      if (file.startsWith(GUARD_OWNER)) continue;
      const fileSource = readFileSync(file, "utf8");
      const sourceFile = parseTsx(file, fileSource);
      scanManualAttributes(file, sourceFile);
      scanKeyAfterSpread(file, sourceFile);

      const literals = findDescriptorLiterals(file, fileSource, sourceFile);
      for (const literal of literals) {
        // Only records that declare a UI identity are registrations. A literal
        // that merely forwards another descriptor (`{ ...ui, state }`) declares
        // no id of its own and carries the forwarded uid.
        if (!literal.fields.has("id")) continue;
        const idField = literal.fields.get("id")!;
        const uidField = literal.fields.get("uid");
        const instanceField = literal.fields.get("instance");

        if (instanceField?.isComputed && isIndexDerivedExpression(instanceField.node)) {
          addViolation(
            "UI Attributes",
            file,
            `UiRegistry descriptor at line ${literal.line} derives "instance" from an array index. ` +
              `Prefer a stable domain identifier; an index does not survive reordering.`,
          );
        }

        if (!uidField) {
          addViolation(
            "UI Attributes",
            file,
            `UiRegistry descriptor at line ${literal.line} has no uid. Every explicitly registered element needs one.`,
          );
          continue;
        }
        if (uidField.isComputed) {
          addViolation(
            "UI Attributes",
            file,
            `UiRegistry descriptor at line ${literal.line} computes its uid. A uid must be a source literal, never derived from an index, key, or expression.`,
          );
          continue;
        }
        const uid = uidField.literalValue!;
        const descriptorId = idField.literalValue ?? "";
        if (isDeterministicCopy(uid, descriptorId)) {
          addViolation(
            "UI Attributes",
            file,
            `UiRegistry uid "${uid}" at line ${literal.line} is a deterministic copy of its id. Mint a uid with a generated Base62 suffix.`,
          );
          continue;
        }
        if (!hasGeneratedSuffix(uid)) {
          addViolation(
            "UI Attributes",
            file,
            `UiRegistry uid "${uid}" at line ${literal.line} is not a semantic prefix plus a generated Base62 suffix, for example "product-data-a8K3xP".`,
          );
          continue;
        }
        const owner = uidOwners.get(uid);
        if (owner) {
          addViolation(
            "UI Attributes",
            file,
            `UID "${uid}" at line ${literal.line} is already used by ${owner}. UIDs must be globally unique.`,
          );
          continue;
        }
        const location = `${relative(ROOT, file).replace(/\\/g, "/")}:${literal.line}`;
        uidOwners.set(uid, location);

        // Descriptor drift: one semantic identity must always be described the
        // same way. Two usage sites sharing an id but disagreeing on uid, kind,
        // action, or part make the registry ambiguous.
        const signature = [
          uid,
          literal.fields.get("kind")?.literalValue ?? "",
          literal.fields.get("action")?.literalValue ?? "",
          literal.fields.get("part")?.literalValue ?? "",
        ].join("|");
        const known = descriptorSignatures.get(descriptorId);
        if (known && known.signature !== signature) {
          addViolation(
            "UI Attributes",
            file,
            `UiRegistry descriptor "${descriptorId}" at line ${literal.line} drifts from its registration at ${known.location} (${known.signature} vs ${signature}).`,
          );
          continue;
        }
        if (!known) descriptorSignatures.set(descriptorId, { signature, location });
      }
    }
  }
}
