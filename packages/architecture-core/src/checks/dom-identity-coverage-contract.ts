import { join } from 'node:path';

import ts from 'typescript';

import { buildDomIdentityInventory, isActionableDomUsage } from '../dom-identity/analyzer';
import { findDescriptorLiterals } from '../dom-identity/descriptor-literals';
import { parseTsx } from '../dom-identity/tsx-ast';
import { ROOT, addViolation } from './architecture-types';

function enclosingJsxOpening(node: ts.Node): ts.JsxOpeningElement | ts.JsxSelfClosingElement | null {
  let current: ts.Node | undefined = node;
  while (current) {
    if (ts.isJsxOpeningElement(current) || ts.isJsxSelfClosingElement(current)) return current;
    current = current.parent;
  }
  return null;
}

export interface DomIdentityCoverageException {
  readonly file: string;
  readonly line: number;
  readonly tagOrComponent: string;
  readonly reason: string;
}

/**
 * Exact transparent-wrapper seams. These are not identity omissions: the
 * wrapper forwards the caller descriptor through `...props` one layer down.
 * They stay exact and stale-checked; the caller usage is independently
 * mandatory because the analyzer now follows the wrapper chain transitively.
 */
export const DOM_IDENTITY_COVERAGE_EXCEPTIONS: readonly DomIdentityCoverageException[] = [
  {
    file: 'src/features/onboarding/presentation/form-components.tsx',
    line: 68,
    tagOrComponent: 'Input',
    reason: 'FormInput transparently forwards its caller props, including ui, into Input. Caller identity is enforced at every FormInput usage.',
  },
  {
    file: 'src/features/onboarding/presentation/form-components.tsx',
    line: 83,
    tagOrComponent: 'Textarea',
    reason: 'FormTextarea transparently forwards its caller props, including ui, into Textarea. Caller identity is enforced at every FormTextarea usage.',
  },
];

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
    if (site.registrationKind === 'literal' || site.registrationKind === 'forwarded') continue;

    const key = `${site.file}|${site.line}|${site.tagOrComponent}`;
    if (site.registrationKind === 'computed') {
      addViolation(
        'UI Identity Coverage',
        join(ROOT, site.file),
        `<${site.tagOrComponent}> at line ${site.line} uses a computed/non-literal UI descriptor. ` +
          'Canonical source identity must be a quoted literal at the usage site; only the exact caller-forwarding `ui` binding is allowed as a forwarded seam.',
        'Inline a literal ui descriptor at this usage site, or make the component a structurally proven caller-owned forwarding seam.',
      );
      continue;
    }

    if (site.hasForeignSpread && declared.has(key)) {
      matched.add(key);
      continue;
    }

    if (site.hasForeignSpread) {
      addViolation(
        'UI Identity Coverage',
        join(ROOT, site.file),
        `<${site.tagOrComponent}> at line ${site.line} has no uid and already spreads another attribute object.`,
        'Propagate caller-owned ui explicitly or register the exact usage site. Do not add a codemod-only exception.',
      );
      continue;
    }

    addViolation(
      'UI Identity Coverage',
      join(ROOT, site.file),
      `<${site.tagOrComponent}> at line ${site.line} has no ui.uid. Every project-owned DOM usage site must be registered.`,
      'Run the UID migration or add an explicit literal uiAttributes()/ui={{...}} descriptor.',
    );
  }

  for (const [key, exception] of declared) {
    if (matched.has(key)) continue;
    addViolation(
      'UI Identity Coverage',
      join(ROOT, exception.file),
      `DOM_IDENTITY_COVERAGE_EXCEPTIONS entry for <${exception.tagOrComponent}> at line ${exception.line} is stale or no longer an exact transparent-wrapper seam.`,
    );
  }

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
          `Generic primitive root at line ${literal.line} declares a fixed uid "${uidField.literalValue}". A caller-owned root must forward the caller descriptor instead.`,
        );
      }
    }
  }
}
