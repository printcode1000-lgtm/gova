import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { ROOT, addViolation } from "./architecture-types";

/** `@asol/ui-registry-core` owns every UiRegistry contract; the guard reads it there. */
const REGISTRY_OWNER = join(ROOT, "packages", "ui-registry-core", "src");
/** The enforcement package quotes every attribute it forbids. */
const GUARD_OWNER = join(ROOT, "packages", "architecture-core", "src", "checks");
const REGISTRY_PATH = join(REGISTRY_OWNER, "registry", "ui-page-registry.ts");
const APP_ROOT = join(ROOT, "src", "app");
const MANUAL_ATTRIBUTE = /\bdata-ui-(?:uid|id|page|component|state|action|part|item-id)\s*=/;
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
/** Descriptor literals the application writes by hand. */
const DESCRIPTOR_OPENINGS = ["uiAttributes({", "ui={{", "ui: {"] as const;

/**
 * Generic helpers render the same component in dozens of places, so a uid
 * written inside one would repeat across every instance and stop being an
 * identity. These files may forward a caller's descriptor; they may never
 * contain a uid of their own.
 */
const GENERIC_HELPERS = [
  join(ROOT, "src", "shared", "ui"),
  join(REGISTRY_OWNER, "domain", "ui-component-attributes.ts"),
];

/** The exact shape of a descriptor's `simulation` field, which is not a descriptor. */
const SIMULATION_FIELD_SHAPE =
  /^\s*kind:\s*["'](?:event|field|list-item|file|state)["']\s*,\s*id:\s*["'][^"']+["']\s*$/;

/** A uid must be a source literal; anything computed cannot be stable. */
const COMPUTED_UID = /\buid:\s*(?!["'])/;

interface RegistryEntry {
  route: string;
  id: string;
  uid: string | null;
}

interface DescriptorLiteral {
  file: string;
  line: number;
  body: string;
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

function scanManualAttributes(file: string, source: string): void {
  const match = source.match(MANUAL_ATTRIBUTE);
  if (!match || match.index === undefined) return;
  const line = source.slice(0, match.index).split("\n").length;
  addViolation(
    "UI Attributes",
    file,
    `Manual ${match[0].trim()} is forbidden at line ${line}. Use uiAttributes() or a shared UI primitive.`,
  );
}

/** Reads one balanced `{ … }` literal starting at the given brace index. */
function balancedObject(source: string, openIndex: number): string | null {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, index);
    }
  }
  return null;
}

function descriptorLiterals(file: string, source: string): DescriptorLiteral[] {
  const literals: DescriptorLiteral[] = [];
  for (const opening of DESCRIPTOR_OPENINGS) {
    let cursor = source.indexOf(opening);
    while (cursor !== -1) {
      const braceIndex = source.indexOf("{", cursor + opening.length - 1);
      const body = braceIndex === -1 ? null : balancedObject(source, braceIndex);
      if (body !== null) {
        literals.push({
          file,
          line: source.slice(0, cursor).split("\n").length,
          body,
        });
      }
      cursor = source.indexOf(opening, cursor + opening.length);
    }
  }
  return literals;
}

/**
 * Reads descriptor objects held in a typed `Record<string, UiDescriptor>`.
 * These records are common for fixed navigation controls, where a later
 * `uiAttributes(recordItem)` spread would otherwise hide every uid from the
 * direct-call scanner.
 */
function descriptorRegistryLiterals(file: string, source: string): DescriptorLiteral[] {
  const literals: DescriptorLiteral[] = [];
  const opening = /const\s+\w+\s*=\s*\{/g;
  for (const match of source.matchAll(opening)) {
    if (match.index === undefined) continue;
    const braceIndex = source.indexOf("{", match.index);
    const body = balancedObject(source, braceIndex);
    if (body === null) continue;
    const endIndex = braceIndex + body.length + 2;
    const declarationTail = source.slice(endIndex, endIndex + 96);
    if (!/^\s*as const satisfies Record<string, UiDescriptor>/.test(declarationTail)) continue;

    let cursor = 0;
    while (cursor < body.length) {
      const member = /\b\w+\s*:\s*\{/.exec(body.slice(cursor));
      if (!member || member.index === undefined) break;
      const memberBrace = cursor + member.index + member[0].lastIndexOf("{");
      const memberBody = balancedObject(body, memberBrace);
      if (memberBody === null) break;
      // `simulation: { kind, id }` and `interaction: { type }` are fields of a
      // descriptor, not descriptors. Their `id` is a scenario name, and asking
      // them for a uid would report every registered element as unregistered.
      if (/(?:simulation|interaction)\s*:\s*$/.test(body.slice(0, memberBrace))) {
        cursor = memberBrace + memberBody.length + 2;
        continue;
      }
      literals.push({
        file,
        line: source.slice(0, braceIndex + 1 + memberBrace).split("\n").length,
        body: memberBody,
      });
      cursor = memberBrace + memberBody.length + 2;
    }
  }
  return literals;
}

/**
 * Keeps UI identity declarative and complete: every App Router page must have
 * exactly one safe, value-free registry route carrying a unique uid, every
 * explicitly registered element must declare its own uid, and JSX must not
 * create an alternate attribute dialect outside the typed builder.
 *
 * Generic shared primitives that emit only a component marker are intentionally
 * uid-free and are never reported here.
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

  for (const directory of [join(ROOT, "src"), join(ROOT, "packages")]) {
    for (const file of sourceFilesUnder(directory)) {
      if (file.startsWith(REGISTRY_OWNER)) continue;
      // The guards quote every attribute they forbid; scanning them would
      // report the rule text itself as a violation.
      if (file.startsWith(GUARD_OWNER)) continue;
      const fileSource = readFileSync(file, "utf8");
      scanManualAttributes(file, fileSource);

      // A generic helper may forward a caller's descriptor; it may never own a
      // uid, because that uid would repeat on every rendered instance.
      if (GENERIC_HELPERS.some((helper) => file.startsWith(helper))) {
        const helperUid = fileSource.match(/\buid:\s*["']([^"']*)["']/);
        if (helperUid) {
          addViolation(
            "UI Attributes",
            file,
            `Generic UI helper declares uid "${helperUid[1]}". A helper-level uid repeats across every instance; register each usage site instead.`,
          );
        }
        continue;
      }

      const descriptorRecords = [
        ...descriptorLiterals(file, fileSource),
        ...descriptorRegistryLiterals(file, fileSource),
      ];
      const checkedDescriptorLines = new Set<number>();
      for (const literal of descriptorRecords) {
        if (checkedDescriptorLines.has(literal.line)) continue;
        checkedDescriptorLines.add(literal.line);
        // Only records that declare a UI identity are registrations. A literal
        // that merely forwards another descriptor (`{ ...ui, state }`) declares
        // no id of its own and carries the forwarded uid; a literal that
        // declares an id needs its own uid, spread or not.
        if (!/\bid:\s*["'`]/.test(literal.body)) continue;
        // `simulation: { kind, id }` is a *field* of a descriptor. Its `id` is
        // a scenario name and it never carries a uid, so reading it as a
        // descriptor would report every simulated element as unregistered.
        if (SIMULATION_FIELD_SHAPE.test(literal.body) && !/\buid:/.test(literal.body)) continue;
        const uid = literal.body.match(/\buid:\s*["']([^"']*)["']/)?.[1];
        if (uid === undefined) {
          // A uid built at render time — from an index, a key, a template, or
          // any other expression — is not a stable identity.
          addViolation(
            "UI Attributes",
            file,
            COMPUTED_UID.test(literal.body)
              ? `UiRegistry descriptor at line ${literal.line} computes its uid. A uid must be a source literal, never derived from an index, key, or expression.`
              : `UiRegistry descriptor at line ${literal.line} has no uid. Every explicitly registered element needs one.`,
          );
          continue;
        }
        const descriptorId = literal.body.match(/\bid:\s*["']([^"']*)["']/)?.[1] ?? "";
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
          literal.body.match(/\bkind:\s*["']([^"']*)["']/)?.[1] ?? "",
          literal.body.match(/\baction:\s*["']([^"']*)["']/)?.[1] ?? "",
          literal.body.match(/\bpart:\s*["']([^"']*)["']/)?.[1] ?? "",
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
