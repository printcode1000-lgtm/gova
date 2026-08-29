/**
 * The canonical DOM-identity analyzer: one AST walk over `src/**\/*.tsx` that
 * answers, for every JSX usage site, "does this produce project-owned DOM,
 * and if so, does it already carry a canonical `uid`?"
 *
 * This is the single source of truth `uid-migration`, `checkUidCoverage`,
 * `checkUiAttributeContract`, registry generation, and the pending-request
 * pipeline all read instead of keeping their own tag whitelist or component
 * list. See `docs/04-ui-components/ui-attribute-system.md` for the model.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';

import { analyzeComponentDefinition, type ComponentRootShape } from './component-definition';
import { findDescriptorLiterals } from './descriptor-literals';
import { hostMultiplicity, isInsideIteratorCallback, type HostMultiplicity } from './repetition';
import {
  isIntrinsicJsxTag,
  isThirdPartyBinding,
  jsxComponentName,
  jsxMemberTag,
  localBindings,
  parseTsx,
} from './tsx-ast';

/**
 * Framework/library special forms that are provably never a DOM root by
 * construction — not derivable from local source (their render behavior
 * lives inside React or a third-party render-prop component), so this stays
 * a short, justified, hand-reviewed list instead of a heuristic.
 */
const STRUCTURAL_COMPONENTS: ReadonlySet<string> = new Set([
  'Fragment',
  'Suspense',
  'StrictMode',
  'Profiler',
  'Activity',
  'ViewTransition',
  'Slot',
  'Controller',
  'FormProvider',
  'StorageImageManager',
  'FocusTrap',
]);

function isStructuralComponent(name: string): boolean {
  return STRUCTURAL_COMPONENTS.has(name) || name.endsWith('Provider') || name.endsWith('Context');
}

export type DomUsageOwnership =
  | { readonly kind: 'intrinsic'; readonly tag: string }
  | { readonly kind: 'structural' }
  | { readonly kind: 'third-party'; readonly name: string }
  | { readonly kind: 'generic-primitive-wired'; readonly component: string; readonly definingFile: string }
  | { readonly kind: 'generic-primitive-unconverted'; readonly component: string; readonly definingFile: string }
  | { readonly kind: 'opaque'; readonly component: string };

export interface DomUsageSite {
  readonly file: string;
  readonly line: number;
  readonly tagOrComponent: string;
  readonly ownership: DomUsageOwnership;
  readonly node: ts.JsxOpeningElement | ts.JsxSelfClosingElement;
  readonly hasUiRegistration: boolean;
  readonly hasForeignSpread: boolean;
}

export interface DomIdentityInventory {
  readonly sites: readonly DomUsageSite[];
  readonly multiplicity: HostMultiplicity;
  readonly sources: ReadonlyMap<string, string>;
  /**
   * Source position (character offset of the JSX opening tag) of every
   * generic primitive's own DOM root, keyed by defining file. A literal uid
   * baked into the descriptor spread at exactly one of these positions is a
   * primitive owning a fixed identity — forbidden, because it would repeat
   * across every caller. A fixed uid anywhere *else* in the same file (an
   * internal, non-caller-configurable structural sub-part, such as a dialog's
   * built-in close button) is a legitimate, different case.
   */
  readonly genericPrimitiveRootPositions: ReadonlyMap<string, ReadonlySet<number>>;
}

function listTsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      return entry === 'node_modules' || entry === 'tests' || entry === '__tests__' || entry === 'generated'
        ? []
        : listTsxFiles(full);
    }
    if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) return [];
    return entry.endsWith('.tsx') ? [full] : [];
  });
}

/** Every `.tsx` file under `src/`, relative-pathed and content-loaded once. */
export function loadProjectTsx(root: string): Map<string, string> {
  const sources = new Map<string, string>();
  for (const full of listTsxFiles(join(root, 'src'))) {
    const relativePath = relative(root, full).replace(/\\/g, '/');
    sources.set(relativePath, readFileSync(full, 'utf8'));
  }
  return sources;
}

function hasUiRegistrySpread(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): boolean {
  return node.attributes.properties.some(
    (property) =>
      ts.isJsxSpreadAttribute(property) &&
      /\b(?:uiAttributes|uiComponentAttributes|uiPageAttributes|uiPrimitiveAttributes)\s*\(/.test(
        property.expression.getText(),
      ),
  );
}

function hasUiProp(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): boolean {
  return node.attributes.properties.some(
    (property) => ts.isJsxAttribute(property) && property.name.getText() === 'ui',
  );
}

function hasAnySpread(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): boolean {
  return node.attributes.properties.some((property) => ts.isJsxSpreadAttribute(property));
}

function exportedComponentCandidates(sourceFile: ts.SourceFile): string[] {
  const names: string[] = [];
  for (const statement of sourceFile.statements) {
    const exported =
      (ts.getCombinedModifierFlags(statement as unknown as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
    if (!exported) continue;
    if (ts.isFunctionDeclaration(statement) && statement.name && /^[A-Z]/.test(statement.name.text)) {
      names.push(statement.name.text);
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && /^[A-Z]/.test(declaration.name.text)) {
          names.push(declaration.name.text);
        }
      }
    }
  }
  return names;
}

/** Runs the full analyzer and returns every JSX usage site, classified. */
export function buildDomIdentityInventory(root: string): DomIdentityInventory {
  const sources = loadProjectTsx(root);
  const multiplicity = hostMultiplicity(sources);
  const sites: DomUsageSite[] = [];

  const shapeCache = new Map<string, ComponentRootShape | null>();
  function shapeOf(file: string, exportName: string): ComponentRootShape | null {
    const key = `${file}#${exportName}`;
    if (shapeCache.has(key)) return shapeCache.get(key)!;
    const source = sources.get(file);
    const shape = source ? analyzeComponentDefinition(file, source, exportName) : null;
    shapeCache.set(key, shape);
    return shape;
  }

  const ownershipCache = new Map<string, DomUsageOwnership>();
  function ownershipOf(definingFile: string, exportName: string, depth = 0): DomUsageOwnership {
    const key = `${definingFile}#${exportName}`;
    if (ownershipCache.has(key)) return ownershipCache.get(key)!;
    if (isStructuralComponent(exportName)) {
      const result: DomUsageOwnership = { kind: 'structural' };
      ownershipCache.set(key, result);
      return result;
    }
    const shape = shapeOf(definingFile, exportName);
    let result: DomUsageOwnership;
    if (!shape) {
      result = { kind: 'opaque', component: exportName };
    } else {
      let reachesDom = shape.rootIntrinsicTag !== null;
      if (!reachesDom && shape.rootComponentName && depth < 4) {
        const nestedShape = shapeOf(definingFile, shape.rootComponentName);
        reachesDom = nestedShape !== null && (nestedShape.rootIntrinsicTag !== null || nestedShape.rootComponentName !== null);
      }
      if (!reachesDom && shape.rootQualifiedName) reachesDom = true; // third-party member root: DOM by construction

      if (!reachesDom) {
        result = { kind: 'opaque', component: exportName };
      } else {
        const repeating = multiplicity.repeatingFiles.has(definingFile) || multiplicity.repeatingSymbols.has(key);
        if (shape.forwardsUiThroughRegistryCall) {
          result = { kind: 'generic-primitive-wired', component: exportName, definingFile };
        } else if (shape.rootSpreadsRest && repeating) {
          result = { kind: 'generic-primitive-unconverted', component: exportName, definingFile };
        } else {
          result = { kind: 'opaque', component: exportName };
        }
      }
    }
    ownershipCache.set(key, result);
    return result;
  }

  // Pass 1: classify every exported component candidate up front, and record
  // the source position of every generic primitive's own DOM root — that
  // root's identity comes from the *caller*, so the bare-intrinsic scan in
  // pass 2 must not also require (or let a codemod bake) a fixed uid there.
  const excludedRootPositions = new Map<string, Set<number>>();
  for (const [file, source] of sources) {
    const sourceFile = parseTsx(file, source);
    for (const name of exportedComponentCandidates(sourceFile)) {
      const ownership = ownershipOf(file, name);
      if (ownership.kind === 'generic-primitive-wired' || ownership.kind === 'generic-primitive-unconverted') {
        const shape = shapeOf(file, name);
        if (shape?.rootNode) {
          const positions = excludedRootPositions.get(file) ?? new Set<number>();
          positions.add(shape.rootNode.getStart());
          excludedRootPositions.set(file, positions);
        }
      }
    }
  }

  // Pass 2: walk every JSX usage site in the repository.
  for (const [file, source] of sources) {
    const sourceFile = parseTsx(file, source);
    const bindings = localBindings(sourceFile, file, sources);
    const excluded = excludedRootPositions.get(file);

    function visit(node: ts.Node): void {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (!excluded || !excluded.has(node.getStart())) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          let ownership: DomUsageOwnership | null = null;

          if (isIntrinsicJsxTag(node.tagName)) {
            ownership = { kind: 'intrinsic', tag: node.tagName.text };
          } else {
            const component = jsxComponentName(node.tagName);
            if (component) {
              const binding = bindings.get(component);
              if (isThirdPartyBinding(binding)) {
                ownership = { kind: 'third-party', name: component };
              } else if (isStructuralComponent(component)) {
                ownership = { kind: 'structural' };
              } else {
                const definingFile = binding ?? file;
                ownership = ownershipOf(definingFile, component);
              }
            } else {
              const member = jsxMemberTag(node.tagName);
              if (member) {
                const rootBinding = bindings.get(member.rootIdentifier);
                ownership = isThirdPartyBinding(rootBinding)
                  ? { kind: 'third-party', name: member.qualifiedName }
                  : { kind: 'opaque', component: member.qualifiedName };
              }
            }
          }

          if (ownership) {
            const actionable =
              ownership.kind === 'intrinsic' ||
              ownership.kind === 'generic-primitive-wired' ||
              ownership.kind === 'generic-primitive-unconverted';
            const tagOrComponent =
              ownership.kind === 'intrinsic'
                ? ownership.tag
                : ownership.kind === 'third-party'
                  ? ownership.name
                  : ownership.kind === 'structural'
                    ? node.tagName.getText()
                    : ownership.component;
            sites.push({
              file,
              line,
              tagOrComponent,
              ownership,
              node,
              hasUiRegistration: !actionable ? false : ownership.kind === 'intrinsic' ? hasUiRegistrySpread(node) : hasUiProp(node),
              hasForeignSpread: !actionable
                ? false
                : ownership.kind === 'intrinsic'
                  ? hasAnySpread(node) && !hasUiRegistrySpread(node)
                  : hasAnySpread(node) && !hasUiProp(node),
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  return { sites, multiplicity, sources, genericPrimitiveRootPositions: excludedRootPositions };
}

/** True for the ownership kinds that require (and can receive) a canonical uid. */
export function isActionableDomUsage(site: DomUsageSite): boolean {
  return (
    site.ownership.kind === 'intrinsic' ||
    site.ownership.kind === 'generic-primitive-wired' ||
    site.ownership.kind === 'generic-primitive-unconverted'
  );
}

export { findDescriptorLiterals, isInsideIteratorCallback };
export type { DescriptorLiteral, DescriptorLiteralField } from './descriptor-literals';
