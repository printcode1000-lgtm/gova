/**
 * The mandatory-coverage half of the UiRegistry contract: every project-owned
 * DOM usage site under `src/` — every raw intrinsic host/SVG tag, and every
 * usage of a component the analyzer proves forwards to exactly one DOM root
 * (`generic-primitive-*`) — must carry a canonical `uid`. `ui-attribute-
 * contract.ts` is the other half: it proves whatever *is* registered is a
 * literal, unique, syntactically valid, non-computed uid. Both read the same
 * `dom-identity` analyzer, so there is exactly one definition of "a
 * registered DOM usage site" in the repository.
 */
import { join } from 'node:path';

import ts from 'typescript';

import { buildDomIdentityInventory, isActionableDomUsage } from '../dom-identity/analyzer';
import { findDescriptorLiterals } from '../dom-identity/descriptor-literals';
import { parseTsx } from '../dom-identity/tsx-ast';
import { ROOT, addViolation } from './architecture-types';

/** Walks up from a descriptor literal to the JSX opening tag that carries it. */
function enclosingJsxOpening(node: ts.Node): ts.JsxOpeningElement | ts.JsxSelfClosingElement | null {
  let current: ts.Node | undefined = node;
  while (current) {
    if (ts.isJsxOpeningElement(current) || ts.isJsxSelfClosingElement(current)) return current;
    current = current.parent;
  }
  return null;
}

export interface DomIdentityCoverageException {
  /** Repository-relative file that renders the unregistrable instance. */
  readonly file: string;
  /** 1-indexed source line of the JSX opening tag — an exact usage-site anchor: two usages of the same tag never share a line, so this can never silently cover a second, unrelated site. */
  readonly line: number;
  readonly tagOrComponent: string;
  /** Why this exact site cannot carry a caller-owned identity, and why the architecture cannot be extended to let it. */
  readonly reason: string;
}

/**
 * Usage sites that cannot receive an automated registration because they
 * already spread an unrelated attribute object the codemod cannot safely
 * merge into, *and* the wrapping component genuinely has no way to carry a
 * caller-owned identity (it transparently forwards `...props`, including
 * any caller-supplied `ui`, into the primitive it wraps — the identity
 * belongs one layer down, at the call site of that primitive, not here).
 */
export const DOM_IDENTITY_COVERAGE_EXCEPTIONS: readonly DomIdentityCoverageException[] = [
  {
    file: 'src/features/onboarding/presentation/form-components.tsx',
    line: 68,
    tagOrComponent: 'Input',
    reason:
      'FormInput is a transparent field wrapper: `{...props}` already forwards a caller-supplied ' +
      '`ui` straight into Input, so the identity is owned by FormInput’s own caller, one layer ' +
      'further out, not by this line. Giving FormInput itself a fixed `ui` would apply one identity ' +
      'to every field FormInput renders across the app.',
  },
  {
    file: 'src/features/onboarding/presentation/form-components.tsx',
    line: 83,
    tagOrComponent: 'Textarea',
    reason:
      'FormTextarea is a transparent field wrapper: `{...props}` already forwards a caller-supplied ' +
      '`ui` straight into Textarea, so the identity is owned by FormTextarea’s own caller, one ' +
      'layer further out, not by this line.',
  },
];

/**
 * Fails the build when a project-owned DOM usage site is left without a uid,
 * when a generic primitive's own definition bakes a fixed uid into its root
 * (repeating across every caller instead of being caller-owned), or when a
 * declared exception no longer matches a real, still-unregistrable gap.
 */
export function checkDomIdentityCoverageContract(): void {
  const inventory = buildDomIdentityInventory(ROOT);
  const declared = new Map(
    DOM_IDENTITY_COVERAGE_EXCEPTIONS.map((exception) => [
      `${exception.file}|${exception.line}|${exception.tagOrComponent}`,
      exception,
    ]),
  );
  const matched = new Set<string>();

  for (const site of inventory.sites) {
    if (!isActionableDomUsage(site)) continue;
    if (site.hasUiRegistration) continue;
    const key = `${site.file}|${site.line}|${site.tagOrComponent}`;
    if (site.hasForeignSpread) {
      if (declared.has(key)) {
        matched.add(key);
        continue;
      }
      addViolation(
        'UI Identity Coverage',
        join(ROOT, site.file),
        `<${site.tagOrComponent}> at line ${site.line} has no uid and already spreads an unrelated ` +
          `attribute object, so it cannot be auto-registered.`,
        'Register it explicitly, or add a reasoned entry to DOM_IDENTITY_COVERAGE_EXCEPTIONS in dom-identity-coverage-contract.ts.',
      );
      continue;
    }
    addViolation(
      'UI Identity Coverage',
      join(ROOT, site.file),
      `<${site.tagOrComponent}> at line ${site.line} has no ui.uid. Every project-owned DOM usage site must be registered.`,
      'Run npx tsx scripts/ui-registry/uid-migration/run-apply.ts, or add uiAttributes()/ui={{...}} by hand.',
    );
  }

  for (const key of declared.keys()) {
    if (!matched.has(key)) {
      const exception = declared.get(key)!;
      addViolation(
        'UI Identity Coverage',
        join(ROOT, exception.file),
        `DOM_IDENTITY_COVERAGE_EXCEPTIONS entry for <${exception.tagOrComponent}> at line ${exception.line} ` +
          `matches nothing and must be removed — the usage site is registered now, no longer exists, or moved.`,
      );
    }
  }

  // A generic primitive's own DOM root must never carry a fixed literal uid:
  // that uid would repeat across every caller instead of being caller-owned.
  // A fixed uid *elsewhere* in the same file — a non-caller-configurable
  // structural sub-part such as a dialog's built-in close button — is a
  // different, legitimate case and is not reported here.
  for (const [file, positions] of inventory.genericPrimitiveRootPositions) {
    const source = inventory.sources.get(file);
    if (!source || positions.size === 0) continue;
    const sourceFile = parseTsx(file, source);
    const literals = findDescriptorLiterals(file, source, sourceFile);
    for (const literal of literals) {
      const opening = enclosingJsxOpening(literal.node);
      if (!opening || !positions.has(opening.getStart())) continue;
      const uidField = literal.fields.get('uid');
      if (uidField && !uidField.isComputed) {
        addViolation(
          'UI Identity Coverage',
          join(ROOT, file),
          `Generic primitive root at line ${literal.line} declares a fixed uid "${uidField.literalValue}". ` +
            `A root-level uid repeats across every caller; forward the caller's own \`ui\` descriptor instead.`,
        );
      }
    }
  }
}
