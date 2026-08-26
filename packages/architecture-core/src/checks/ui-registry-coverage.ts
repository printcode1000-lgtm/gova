/**
 * UiRegistry coverage — the rule that a *rendered instance* is what carries an
 * identity, enforced instead of counted.
 *
 * A shared primitive is generic by construction: one component, many places. A
 * uid written inside it would repeat on every instance and stop being an
 * identity, so the identity has to be declared where the component is used.
 * That makes "did we register everything?" a question about usage sites, and a
 * threshold ("at least N registered") answers it wrongly — it passes while a
 * newly added button stays anonymous.
 *
 * So this check classifies every usage site instead:
 *
 *   - inside a `.map(` callback → the instance count comes from data, so a
 *     source-defined uid cannot exist unless the list itself is a fixed source
 *     constant. Those fixed lists are registered through typed descriptor maps
 *     and are therefore *already* registered when scanned.
 *   - otherwise → the usage site is static, exactly one element renders, and it
 *     must declare a descriptor. If it cannot, it must be listed below with the
 *     reason, and the listing is checked for staleness in both directions.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { ROOT, addViolation } from './architecture-types';

/** Shared primitives and the feature wrappers that forward `ui` into them. */
const PRIMITIVES = [
  'Button',
  'Input',
  'Textarea',
  'Switch',
  'Checkbox',
  'SelectTrigger',
  'TabsTrigger',
  'RadioGroupItem',
  'FormInput',
  'FormTextarea',
  'FormSelect',
  'PharmacySelect',
] as const;

export interface UiRegistryUsage {
  file: string;
  line: number;
  component: string;
  registered: boolean;
  /** Rendered once per element of some collection. */
  repeated: boolean;
  /**
   * Rendered from a collection that is a fixed source constant, so every
   * instance is knowable at author time and must carry its own descriptor —
   * normally through a typed `Record<string, UiDescriptor>` map keyed by the
   * same domain constant that drives the list.
   */
  fixedList: boolean;
  /** The constant that drives a fixed list, for the violation message. */
  listSource?: string;
}

export interface UiRegistryCoverageException {
  /** Repository-relative file that renders the unregistered instance. */
  file: string;
  component: string;
  /** Why no stable source-defined identity exists for this instance. */
  reason: string;
}

/**
 * Instances that legitimately have no source-defined identity.
 *
 * Every entry is a *generic wrapper*: one component that renders in many
 * unrelated places and receives its descriptor from its caller. The wrapper's
 * own JSX therefore cannot name an instance — the caller already did, or the
 * caller is itself a runtime-data row. Anything not in this shape must be
 * registered at its usage site.
 */
export const UI_REGISTRY_COVERAGE_EXCEPTIONS: readonly UiRegistryCoverageException[] = [
  {
    file: 'src/features/onboarding/presentation/form-components.tsx',
    component: 'Input',
    reason:
      'FormInput is a generic field wrapper; it forwards the caller-supplied ui descriptor into Input.',
  },
  {
    file: 'src/features/onboarding/presentation/form-components.tsx',
    component: 'Textarea',
    reason:
      'FormTextarea is a generic field wrapper; it forwards the caller-supplied ui descriptor into Textarea.',
  },
  {
    file: 'src/features/google-play-console/presentation/components/Field.tsx',
    component: 'Input',
    reason:
      'Field is a generic label+input wrapper rendered once per arbitrary caller-defined field.',
  },
  {
    file: 'src/features/google-play-console/presentation/components/CommandParameterFields.tsx',
    component: 'Input',
    reason:
      'Rendered once per release-command parameter schema, which is data supplied by the command registry at runtime.',
  },
  {
    file: 'src/features/google-play-console/presentation/components/CommandParameterFields.tsx',
    component: 'Textarea',
    reason:
      'Rendered once per release-command parameter schema, which is data supplied by the command registry at runtime.',
  },
  {
    file: 'src/features/google-play-console/presentation/components/ReleaseJobIndicators.tsx',
    component: 'Button',
    reason:
      'Generic job indicator/stop control rendered per running job id, which exists only at runtime.',
  },
  {
    file: 'src/features/google-play-console/presentation/components/AndroidReleasePathCard.tsx',
    component: 'Button',
    reason: 'Generic card rendered once per release path supplied by the runbook data.',
  },
  {
    file: 'src/features/google-play-console/presentation/components/AndroidReleaseRunbookBranchCard.tsx',
    component: 'Button',
    reason: 'Generic card rendered once per runbook branch supplied by the runbook data.',
  },
  {
    file: 'src/features/product/presentation/ProductComponentPrimitives.tsx',
    component: 'SelectTrigger',
    reason:
      'Generic product-component field editor rendered once per component field defined by product data.',
  },
  {
    file: 'src/features/seller-discounts/presentation/discount-editor/SellerDiscountsManager.section-03.tsx',
    component: 'Input',
    reason:
      'Generic number/currency field wrappers reused by many discount fields; the caller names the field.',
  },
  {
    file: 'src/features/seller-discounts/presentation/discount-editor/SellerDiscountsManager.section-03.tsx',
    component: 'Button',
    reason: 'Generic action button wrapper reused by many discount rows; the caller names the action.',
  },
  {
    file: 'src/features/dev-cloud-backup/presentation/DevCloudBackupSavedList.tsx',
    component: 'Button',
    reason:
      'Row actions rendered once per stored backup file; the instance count and identity come from cloud data.',
  },
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      return entry === 'node_modules' || entry === 'tests' || entry === '__tests__'
        ? []
        : sourceFiles(full);
    }
    return entry.endsWith('.tsx') ? [full] : [];
  });
}

/**
 * Character ranges covered by a `.map(` callback.
 *
 * Parenthesis matching is enough here and deliberately simple: JSX inside a
 * callback is balanced, and the scan only has to decide "is this tag rendered
 * once, or once per element".
 */
/** Receiver name recorded for a list written inline as `[…].map(`. */
const INLINE_LITERAL_LIST = '(inline literal list)';

interface RepeatedRegion {
  open: number;
  close: number;
  /** The identifier the list came from, when the receiver is a plain name. */
  receiver: string | null;
}

/**
 * True when the `]` before `.map(` closes a written-out list of literals.
 *
 * `[5, 15, 30, 60].map(…)` is such a list. `(rows ?? []).map(…)` is not: the
 * empty literal is a fallback for runtime data, and `[...items].map(…)` copies
 * a runtime collection.
 */
function inlineLiteralList(source: string, closeIndex: number): boolean {
  let depth = 0;
  for (let index = closeIndex; index >= 0; index -= 1) {
    const character = source[index];
    if (character === ']') depth += 1;
    else if (character === '[') {
      depth -= 1;
      if (depth === 0) {
        const content = source.slice(index + 1, closeIndex);
        if (content.trim() === '') return false;
        return !/[()?.]|\.\.\./.test(content);
      }
    }
  }
  return false;
}

function repeatedRegions(source: string): RepeatedRegion[] {
  const regions: RepeatedRegion[] = [];
  // Every `.map(` marks a repeated region, whatever it is called on —
  // `rows.filter(…).map(…)` repeats exactly as much as `rows.map(…)`.
  // The receiver is only recorded when it is knowable in source: a plain name
  // (`DOCUMENT_TYPES.map`) or an inline literal list (`[5, 15].map`).
  for (const match of source.matchAll(/([A-Za-z_$][\w$]*|\])?\s*\.(?:map|flatMap)\s*\(/g)) {
    const open = source.indexOf('(', match.index! + match[0].length - 1);
    if (open === -1) continue;
    let depth = 0;
    for (let index = open; index < source.length; index += 1) {
      const character = source[index];
      if (character === '(') depth += 1;
      else if (character === ')') {
        depth -= 1;
        if (depth === 0) {
          const token = match[1];
          const inline =
            token === ']'
              ? inlineLiteralList(source, match.index! + match[0].indexOf(']'))
              : false;
          regions.push({
            open,
            close: index,
            receiver: inline ? INLINE_LITERAL_LIST : token === ']' ? null : token ?? null,
          });
          break;
        }
      }
    }
  }
  return regions;
}

/**
 * Constants in this file whose value is a literal array — the lists whose
 * members exist in source and can therefore be registered one by one.
 *
 * A list built from props, state, a fetch, or a call is excluded: its members
 * only exist at runtime, so no source-defined identity can name them.
 */
function fixedListConstants(source: string): Set<string> {
  const fixed = new Set<string>();
  for (const match of source.matchAll(
    /(?:^|\n)\s*(?:export\s+)?const\s+([A-Z][A-Z0-9_]*|[a-z][\w$]*)\s*(?::[^=]+)?=\s*\[([\s\S]*?)\]\s*(?:as const)?\s*;/g,
  )) {
    const [, name, body] = match;
    // Only a list of plain literals is author-time knowable.
    if (/[A-Za-z_$][\w$]*\s*\(/.test(body ?? '')) continue;
    // `[...value.slides]` copies a runtime collection; its length is not known
    // in source, so its members cannot be named there either.
    if ((body ?? '').includes('...')) continue;
    if (/\b(?:props|state|use[A-Z])/.test(body ?? '')) continue;
    fixed.add(name!);
  }
  return fixed;
}

/** Reads the opening tag text so the scan can look for a `ui={…}` prop. */
function openingTag(source: string, start: number): string {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (character === '{') depth += 1;
    else if (character === '}') depth -= 1;
    else if (character === '>' && depth === 0) return source.slice(start, index);
  }
  return source.slice(start, start + 600);
}

export function collectUiRegistryUsages(root = ROOT): UiRegistryUsage[] {
  const usages: UiRegistryUsage[] = [];
  for (const file of sourceFiles(join(root, 'src'))) {
    const label = relative(root, file).replace(/\\/g, '/');
    // The primitives themselves are the generic helpers; they never register.
    if (label.startsWith('src/shared/ui/')) continue;
    const source = readFileSync(file, 'utf8');
    const regions = repeatedRegions(source);
    const fixed = fixedListConstants(source);
    for (const component of PRIMITIVES) {
      for (const match of source.matchAll(new RegExp(`<${component}(?=[\\s/>])`, 'g'))) {
        const index = match.index!;
        const tag = openingTag(source, index);
        const enclosing = regions.filter((region) => index > region.open && index < region.close);
        const fixedRegion = enclosing.find(
          (region) =>
            region.receiver === INLINE_LITERAL_LIST ||
            (region.receiver !== null && fixed.has(region.receiver)),
        );
        usages.push({
          file: label,
          line: source.slice(0, index).split('\n').length,
          component,
          registered: /\sui=\{/.test(tag),
          repeated: enclosing.length > 0,
          fixedList: fixedRegion !== undefined,
          ...(fixedRegion?.receiver ? { listSource: fixedRegion.receiver } : {}),
        });
      }
    }
  }
  return usages;
}

/**
 * Fails the build when a statically rendered shared-primitive instance carries
 * no descriptor and is not a declared generic-wrapper exception.
 */
export function checkUiRegistryCoverageContract(): void {
  const usages = collectUiRegistryUsages();
  const declared = new Set(
    UI_REGISTRY_COVERAGE_EXCEPTIONS.map((entry) => `${entry.file}|${entry.component}`),
  );
  const used = new Set<string>();

  for (const usage of usages) {
    if (usage.registered) continue;
    const key = `${usage.file}|${usage.component}`;
    if (declared.has(key)) {
      used.add(key);
      continue;
    }
    if (usage.fixedList) {
      addViolation(
        'UI Registry Coverage',
        join(ROOT, usage.file),
        `<${usage.component}> at line ${usage.line} is rendered from the fixed source list ${usage.listSource} and has no UiRegistry descriptor.`,
        'A list whose members exist in source is registerable: add a typed Record<string, UiDescriptor> keyed by that constant and pass ui={MAP[key]}.',
      );
      continue;
    }
    if (usage.repeated) continue;
    addViolation(
      'UI Registry Coverage',
      join(ROOT, usage.file),
      `<${usage.component}> at line ${usage.line} renders once and has no UiRegistry descriptor.`,
      'Give the usage site an explicit ui={{ uid, id, kind, … }} descriptor, or declare it in UI_REGISTRY_COVERAGE_EXCEPTIONS with the reason no stable identity exists.',
    );
  }

  for (const entry of UI_REGISTRY_COVERAGE_EXCEPTIONS) {
    const key = `${entry.file}|${entry.component}`;
    if (used.has(key)) continue;
    addViolation(
      'UI Registry Coverage',
      join(ROOT, entry.file),
      `Stale UiRegistry coverage exception for <${entry.component}>: nothing unregistered matches it.`,
      'Remove the exception once the instance is registered or deleted.',
    );
  }
}
