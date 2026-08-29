import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";

import { findDescriptorLiterals } from "../dom-identity/descriptor-literals";
import { readUiPageRegistryAst } from "../dom-identity/page-registry-reader";
import { parseTsx } from "../dom-identity/tsx-ast";
import { ROOT, addViolation } from "./architecture-types";

const REGISTRY_OWNER = join(ROOT, "packages", "ui-registry-core", "src");
const GUARD_OWNER = join(ROOT, "packages", "architecture-core", "src", "checks");
const REGISTRY_PATH = join(REGISTRY_OWNER, "registry", "ui-page-registry.ts");
const APP_ROOT = join(ROOT, "src", "app");
const MANUAL_DATA_UI_ATTRIBUTE = /^data-ui-(?:uid|id|page|component|state|action|part|item-id|instance)$/;
const UID_SYNTAX = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*-[0-9A-Za-z]{6}$/;

function hasGeneratedSuffix(uid: string): boolean {
  const suffix = uid.slice(uid.lastIndexOf("-") + 1);
  return UID_SYNTAX.test(uid) && /[A-Z]/.test(suffix) && /[0-9]/.test(suffix);
}

function isDeterministicCopy(uid: string, identity: string): boolean {
  if (identity === "") return false;
  return uid === identity || uid === `page.${identity}` || uid === `ui.${identity}` || uid === identity.split(".").join("-");
}

function collectPageRoutes(directory: string): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) { routes.push(...collectPageRoutes(fullPath)); continue; }
    if (entry !== "page.tsx") continue;
    const pageDirectory = relative(APP_ROOT, directory).replace(/\\/g, "/");
    routes.push(pageDirectory ? `/${pageDirectory}` : "/");
  }
  return routes;
}

function sourceFilesUnder(directory: string): string[] {
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) return [];
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      if (entry !== "tests" && entry !== "__tests__" && entry !== "node_modules" && entry !== "generated" && entry !== "dist") files.push(...sourceFilesUnder(fullPath));
      continue;
    }
    if (/\.tsx?$/.test(entry)) files.push(fullPath);
  }
  return files;
}

function isRegistryCall(expression: ts.Expression): boolean {
  return ts.isCallExpression(expression) && ts.isIdentifier(expression.expression) &&
    (expression.expression.text === "uiAttributes" || expression.expression.text === "uiComponentAttributes" || expression.expression.text === "uiPageAttributes");
}

function scanKeyAfterSpread(file: string, sourceFile: ts.SourceFile): void {
  function visit(node: ts.Node): void {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      let sawRegistrySpread = false;
      for (const property of node.attributes.properties) {
        if (ts.isJsxSpreadAttribute(property) && isRegistryCall(property.expression)) { sawRegistrySpread = true; continue; }
        if (sawRegistrySpread && ts.isJsxAttribute(property) && property.name.getText() === "key") {
          const line = sourceFile.getLineAndCharacterOfPosition(property.getStart()).line + 1;
          addViolation("UI Attributes", file, `key follows the UiRegistry spread at line ${line}; write key before the spread.`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const INDEX_NAMES = new Set(["index", "idx", "i"]);
function expressionReferencesIndex(node: ts.Node): boolean {
  let found = false;
  function visit(current: ts.Node): void {
    if (ts.isIdentifier(current) && INDEX_NAMES.has(current.text)) found = true;
    if (!found) ts.forEachChild(current, visit);
  }
  visit(node);
  return found;
}

type InstanceConstructorKind = "direct" | "opaque" | "position" | "compose";
interface ApprovedInstanceExpression { readonly kind: InstanceConstructorKind | "forwarded"; readonly call?: ts.CallExpression; }

function directInstanceConstructor(node: ts.Expression): ApprovedInstanceExpression | null {
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return null;
  if (node.expression.text === "createUiInstanceId") return { kind: "direct", call: node };
  if (node.expression.text === "createOpaqueUiInstanceId") return { kind: "opaque", call: node };
  if (node.expression.text === "createUiPositionInstanceId") return { kind: "position", call: node };
  if (node.expression.text === "composeUiInstanceId") return { kind: "compose", call: node };
  return null;
}

function variableInitializer(sourceFile: ts.SourceFile, name: string): ts.Expression | null {
  let found: ts.Expression | null = null;
  function visit(node: ts.Node): void {
    if (found) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) { found = node.initializer; return; }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

function approvedInstanceExpression(node: ts.Expression, sourceFile: ts.SourceFile, seen: ReadonlySet<string> = new Set()): ApprovedInstanceExpression | null {
  const direct = directInstanceConstructor(node);
  if (direct) return direct;
  if (ts.isPropertyAccessExpression(node) && node.name.text === "instance") return { kind: "forwarded" };
  if (ts.isIdentifier(node)) {
    if (seen.has(node.text)) return null;
    const initializer = variableInitializer(sourceFile, node.text);
    if (!initializer) return null;
    const nextSeen = new Set(seen); nextSeen.add(node.text);
    return approvedInstanceExpression(initializer, sourceFile, nextSeen);
  }
  return null;
}

function validateInstanceExpression(file: string, line: number, node: ts.Expression, sourceFile: ts.SourceFile): void {
  const approved = approvedInstanceExpression(node, sourceFile);
  if (!approved) {
    addViolation("UI Attributes", file, `UiRegistry descriptor at line ${line} must use a branded UiInstanceId from an approved constructor or forward caller ui.instance.`);
    return;
  }
  if (approved.kind === "direct" && approved.call && expressionReferencesIndex(approved.call.arguments[0] ?? approved.call)) {
    addViolation("UI Attributes", file, `UiRegistry descriptor at line ${line} derives instance from a reorderable array index; use a stable domain key or createUiPositionInstanceId when position is the domain.`);
  }
  if ((approved.kind === "position" || approved.kind === "opaque") && approved.call) {
    const scope = approved.call.arguments[0];
    if (!scope || !ts.isStringLiteral(scope)) addViolation("UI Attributes", file, `${approved.kind === "position" ? "Positional" : "Opaque"} UI instance at line ${line} requires a quoted static scope/namespace.`);
  }
}

function scanManualAttributes(file: string, sourceFile: ts.SourceFile): void {
  function visit(node: ts.Node): void {
    if (ts.isJsxAttribute(node) && MANUAL_DATA_UI_ATTRIBUTE.test(node.name.getText())) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      addViolation("UI Attributes", file, `Manual ${node.name.getText()} is forbidden at line ${line}. Use the UiRegistry API.`);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function scanGenericHelperForFixedUid(file: string, source: string): void {
  const sourceFile = parseTsx(file, source);
  function visit(node: ts.Node): void {
    if (ts.isPropertyAssignment(node) && node.name.getText() === "uid" && ts.isStringLiteral(node.initializer)) {
      addViolation("UI Attributes", file, `Generic UI helper declares fixed uid "${node.initializer.text}"; helper-level identity repeats across callers.`);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

export function checkUiAttributeContract(): void {
  if (!existsSync(REGISTRY_PATH)) { addViolation("UI Attributes", REGISTRY_PATH, "Missing package-owned UI page registry."); return; }
  const registrySource = readFileSync(REGISTRY_PATH, "utf8");
  const registryLabel = relative(ROOT, REGISTRY_PATH).replace(/\\/g, "/");
  const entries = readUiPageRegistryAst(registryLabel, registrySource);
  const routes = entries.map((entry) => entry.route);
  const ids = entries.map((entry) => entry.id);
  const registered = new Set(routes);
  const appRoutes = collectPageRoutes(APP_ROOT);
  const uidOwners = new Map<string, string>();
  const descriptorSignatures = new Map<string, { signature: string; location: string }>();

  for (const route of appRoutes) if (!registered.has(route)) addViolation("UI Attributes", REGISTRY_PATH, `Page route ${route} is missing from UI_PAGE_REGISTRY.`);
  for (const route of routes) if (!appRoutes.includes(route)) addViolation("UI Attributes", REGISTRY_PATH, `UI_PAGE_REGISTRY contains no App Router page for ${route}.`);
  if (new Set(routes).size !== routes.length) addViolation("UI Attributes", REGISTRY_PATH, "UI_PAGE_REGISTRY has duplicate route templates.");
  if (new Set(ids).size !== ids.length) addViolation("UI Attributes", REGISTRY_PATH, "UI_PAGE_REGISTRY has duplicate page identities.");

  for (const entry of entries) {
    if (isDeterministicCopy(entry.uid, entry.id)) { addViolation("UI Attributes", REGISTRY_PATH, `UI_PAGE_REGISTRY uid "${entry.uid}" is a deterministic copy of page id ${entry.id}.`); continue; }
    if (!hasGeneratedSuffix(entry.uid)) { addViolation("UI Attributes", REGISTRY_PATH, `UI_PAGE_REGISTRY uid "${entry.uid}" is not a valid generated UiUid.`); continue; }
    const owner = uidOwners.get(entry.uid);
    if (owner) { addViolation("UI Attributes", REGISTRY_PATH, `UID "${entry.uid}" is already used by ${owner}.`); continue; }
    uidOwners.set(entry.uid, `UI_PAGE_REGISTRY route ${entry.route}`);
  }

  const componentAttributesHelper = join(REGISTRY_OWNER, "domain", "ui-component-attributes.ts");
  scanGenericHelperForFixedUid(componentAttributesHelper, readFileSync(componentAttributesHelper, "utf8"));

  for (const directory of [join(ROOT, "src"), join(ROOT, "packages")]) {
    for (const file of sourceFilesUnder(directory)) {
      if (file.startsWith(REGISTRY_OWNER) || file.startsWith(GUARD_OWNER)) continue;
      const fileSource = readFileSync(file, "utf8");
      const sourceFile = parseTsx(file, fileSource);
      scanManualAttributes(file, sourceFile);
      scanKeyAfterSpread(file, sourceFile);

      for (const literal of findDescriptorLiterals(file, fileSource, sourceFile)) {
        if (!literal.fields.has("id")) continue;
        const idField = literal.fields.get("id")!;
        const uidField = literal.fields.get("uid");
        const instanceField = literal.fields.get("instance");
        if (idField.isComputed || idField.literalValue === null) { addViolation("UI Attributes", file, `UiRegistry descriptor at line ${literal.line} computes its semantic id; id must be a quoted source literal.`); continue; }
        if (instanceField) {
          if (!instanceField.isComputed) addViolation("UI Attributes", file, `UiRegistry descriptor at line ${literal.line} stores a literal runtime instance; instances must be created at render time.`);
          else validateInstanceExpression(file, literal.line, instanceField.node, sourceFile);
        }
        if (!uidField) { addViolation("UI Attributes", file, `UiRegistry descriptor at line ${literal.line} has no uid.`); continue; }
        if (uidField.isComputed || uidField.literalValue === null) { addViolation("UI Attributes", file, `UiRegistry descriptor at line ${literal.line} computes its uid. Only a normal quoted StringLiteral is canonical.`); continue; }
        const uid = uidField.literalValue;
        const descriptorId = idField.literalValue;
        if (isDeterministicCopy(uid, descriptorId)) { addViolation("UI Attributes", file, `UiRegistry uid "${uid}" at line ${literal.line} deterministically copies its id.`); continue; }
        if (!hasGeneratedSuffix(uid)) { addViolation("UI Attributes", file, `UiRegistry uid "${uid}" at line ${literal.line} is not a valid generated UiUid.`); continue; }
        const owner = uidOwners.get(uid);
        if (owner) { addViolation("UI Attributes", file, `UID "${uid}" at line ${literal.line} is already used by ${owner}.`); continue; }
        const location = `${relative(ROOT, file).replace(/\\/g, "/")}:${literal.line}`;
        uidOwners.set(uid, location);
        const signature = [uid, literal.fields.get("kind")?.literalValue ?? "", literal.fields.get("action")?.literalValue ?? "", literal.fields.get("part")?.literalValue ?? ""].join("|");
        const known = descriptorSignatures.get(descriptorId);
        if (known && known.signature !== signature) { addViolation("UI Attributes", file, `UiRegistry descriptor "${descriptorId}" at line ${literal.line} drifts from ${known.location}.`); continue; }
        if (!known) descriptorSignatures.set(descriptorId, { signature, location });
      }
    }
  }
}
