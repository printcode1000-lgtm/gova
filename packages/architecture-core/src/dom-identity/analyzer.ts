/**
 * The canonical DOM-identity analyzer: one AST walk over `src/**/*.tsx` that
 * answers, for every JSX usage site, "does this produce project-owned DOM,
 * and if so, does it already carry a canonical `uid`?"
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

export function loadProjectTsx(root: string): Map<string, string> {
  const sources = new Map<string, string>();
  for (const full of listTsxFiles(join(root, 'src'))) {
    const relativePath = relative(root, full).replace(/\\/g, '/');
    sources.set(relativePath, readFileSync(full, 'utf8'));
  }
  const packagesRoot = join(root, 'packages');
  if (statSync(packagesRoot, { throwIfNoEntry: false })?.isDirectory()) {
    for (const full of listTsxFiles(packagesRoot)) {
      const relativePath = relative(root, full).replace(/\\/g, '/');
      sources.set(relativePath, readFileSync(full, 'utf8'));
    }
  }
  return sources;
}

function registryCall(node: ts.JsxSpreadAttribute): ts.CallExpression | null {
  const expression = node.expression;
  if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) return null;
  return /^(?:uiAttributes|uiComponentAttributes|uiPageAttributes|uiPrimitiveAttributes)$/.test(expression.expression.text)
    ? expression
    : null;
}

function hasUiRegistrySpread(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): boolean {
  return node.attributes.properties.some((property) => ts.isJsxSpreadAttribute(property) && registryCall(property) !== null);
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
  const declared = new Set<string>();
  const explicitlyExportedLocals = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && /^[A-Z]/.test(statement.name.text)) {
      declared.add(statement.name.text);
      const exported = (ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export) !== 0;
      if (exported) explicitlyExportedLocals.add(statement.name.text);
    }
    if (ts.isVariableStatement(statement)) {
      const exported = (ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export) !== 0;
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !/^[A-Z]/.test(declaration.name.text)) continue;
        declared.add(declaration.name.text);
        if (exported) explicitlyExportedLocals.add(declaration.name.text);
      }
    }
    if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        const localName = (element.propertyName ?? element.name).text;
        if (/^[A-Z]/.test(localName)) explicitlyExportedLocals.add(localName);
      }
    }
  }
  return [...explicitlyExportedLocals].filter((name) => declared.has(name));
}

interface RootTarget {
  readonly file: string;
  readonly exportName: string;
}

function rootTarget(
  definingFile: string,
  localName: string,
  sources: ReadonlyMap<string, string>,
): RootTarget | null {
  const source = sources.get(definingFile);
  if (!source) return null;
  const sourceFile = parseTsx(definingFile, source);
  const bindings = localBindings(sourceFile, definingFile, sources);
  const file = bindings.get(localName);
  if (!file || isThirdPartyBinding(file)) {
    const localDeclaration = sourceFile.statements.some((statement) =>
      (ts.isFunctionDeclaration(statement) && statement.name?.text === localName) ||
      (ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === localName)));
    return localDeclaration ? { file: definingFile, exportName: localName } : null;
  }

  let exportName = localName;
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const clause = statement.importClause;
    if (!clause) continue;
    if (clause.name?.text === localName) {
      exportName = 'default';
      break;
    }
    const named = clause.namedBindings;
    if (named && ts.isNamedImports(named)) {
      const element = named.elements.find((candidate) => candidate.name.text === localName);
      if (element) {
        exportName = (element.propertyName ?? element.name).text;
        break;
      }
    }
  }
  return { file, exportName };
}

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
  function ownershipOf(
    definingFile: string,
    exportName: string,
    seen: ReadonlySet<string> = new Set(),
  ): DomUsageOwnership {
    const key = `${definingFile}#${exportName}`;
    if (ownershipCache.has(key)) return ownershipCache.get(key)!;
    if (seen.has(key)) return { kind: 'opaque', component: exportName };
    if (isStructuralComponent(exportName)) {
      const result: DomUsageOwnership = { kind: 'structural' };
      ownershipCache.set(key, result);
      return result;
    }

    const nextSeen = new Set(seen);
    nextSeen.add(key);
    const shape = shapeOf(definingFile, exportName);
    let result: DomUsageOwnership;
    if (!shape) {
      result = { kind: 'opaque', component: exportName };
    } else {
      let reachesDom = shape.rootIntrinsicTag !== null || shape.rootQualifiedName !== null;
      let nestedOwnership: DomUsageOwnership | null = null;
      if (!reachesDom && shape.rootComponentName) {
        const target = rootTarget(definingFile, shape.rootComponentName, sources);
        if (target) {
          nestedOwnership = ownershipOf(target.file, target.exportName, nextSeen);
          reachesDom = nestedOwnership.kind === 'generic-primitive-wired' ||
            nestedOwnership.kind === 'generic-primitive-unconverted' ||
            shapeOf(target.file, target.exportName) !== null;
        }
      }

      if (!reachesDom) {
        result = { kind: 'opaque', component: exportName };
      } else {
        const repeating = multiplicity.repeatingFiles.has(definingFile) || multiplicity.repeatingSymbols.has(key);
        const directlyWired = shape.forwardsUiThroughRegistryCall;
        const transparentlyWired = shape.rootSpreadsRest && nestedOwnership?.kind === 'generic-primitive-wired';
        if (directlyWired || transparentlyWired) {
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
                const target = rootTarget(file, component, sources);
                ownership = ownershipOf(definingFile, target?.exportName ?? component);
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
              hasUiRegistration: !actionable
                ? false
                : ownership.kind === 'intrinsic'
                  ? hasUiRegistrySpread(node)
                  : hasUiProp(node),
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

export function isActionableDomUsage(site: DomUsageSite): boolean {
  return (
    site.ownership.kind === 'intrinsic' ||
    site.ownership.kind === 'generic-primitive-wired' ||
    site.ownership.kind === 'generic-primitive-unconverted'
  );
}

export { findDescriptorLiterals, isInsideIteratorCallback };
export type { DescriptorLiteral, DescriptorLiteralField } from './descriptor-literals';
