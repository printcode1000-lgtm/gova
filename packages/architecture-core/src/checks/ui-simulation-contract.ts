/**
 * The simulation half of the UiRegistry contract.
 *
 * Simulation used to find its targets by whatever attribute a developer
 * happened to write, so a rename was invisible until a run failed in a browser.
 * These checks make the registry the only authority: a target is a registered
 * uid with a registered interaction, and everything else — a CSS selector, a
 * semantic id, a label, a DOM index, a component marker — is refused here, with
 * the file, line, uid, route and reason.
 *
 * Everything is read from disk. This package checks the repository and must not
 * import it: importing `@asol/ui-registry-core` here would make the enforcement
 * depend on the thing being enforced, and a broken registry would take the
 * guard down with it instead of being reported by it.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { ROOT, addViolation } from './architecture-types';

const UI_REGISTRY_PACKAGE = join(ROOT, 'packages', 'ui-registry-core', 'src');
/** The one file allowed to emit `data-simulation-*` attributes. */
const SIMULATION_ATTRIBUTE_OWNER = join(UI_REGISTRY_PACKAGE, 'domain', 'ui-simulation-attributes.ts');
const GENERATED_REGISTRY = join(
  UI_REGISTRY_PACKAGE,
  'simulation',
  'generated',
  'ui-simulation-registry.ts',
);
const VALUE_CONTRACTS_FILE = join(UI_REGISTRY_PACKAGE, 'simulation', 'value-contracts.ts');
const SCENARIO_REGISTRY = join(
  ROOT,
  'packages',
  'simulation-core',
  'src',
  'registries',
  'user-page-registry.ts',
);

/** A generated uid: semantic prefix plus a minted Base62 suffix. */
const UID_SYNTAX = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*-[0-9A-Za-z]{6}$/;

function isGeneratedUid(uid: string): boolean {
  const suffix = uid.slice(uid.lastIndexOf('-') + 1);
  return UID_SYNTAX.test(uid) && /[A-Z]/.test(suffix) && /[0-9]/.test(suffix);
}

/**
 * Files that may name a `data-simulation-*` attribute for a reason other than
 * emitting one: the discovery scanner reads legacy markers, and the inspector
 * lists safe attribute prefixes. Both are reading, not writing, and each entry
 * is checked for staleness below.
 */
const ATTRIBUTE_READERS = [
  'packages/simulation-core/src/discovery/simulation-instrumentation-discovery.ts',
  'packages/simulation-core/src/discovery/interaction-source-discovery.ts',
  'src/features/super-admin/presentation/ui-attribute-inspector-model.ts',
  'src/features/super-admin/presentation/ui-registration-proposal.ts',
  'src/features/super-admin/presentation/ui-pending-registration.ts',
] as const;

/** Locators simulation may never use. */
const FORBIDDEN_LOCATORS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /querySelector(?:All)?\(\s*[`'"](?!\[data-ui-uid)/,
    reason: 'a CSS selector other than [data-ui-uid="…"]',
  },
  { pattern: /\[data-ui-id=/, reason: 'data-ui-id, which is semantic metadata and not a locator' },
  { pattern: /\[data-ui-component=/, reason: 'a generic component marker' },
  { pattern: /\[data-simulation-/, reason: 'a data-simulation-* attribute' },
  { pattern: /getByText\(|textContent\s*===|innerText\s*===/, reason: 'element text or a label' },
  { pattern: /querySelectorAll\([^)]*\)\s*\[\s*\d+\s*\]/, reason: 'a DOM index' },
];

/** Where simulation resolves elements. */
const EXECUTION_ADAPTERS = [
  'src/features/simulation/infrastructure/iframe-simulation-execution.port.ts',
] as const;

interface GeneratedTarget {
  uid: string;
  id: string;
  interactionType: string | null;
  valueContract: string | null;
  simulationId: string | null;
  simulationKind: string | null;
  sourceFile: string;
  sourceLine: number;
}

function sourceFiles(directory: string): string[] {
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) return [];
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      return entry === 'node_modules' || entry === 'generated' ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

/** Reads the generated catalog as text; the guard never imports the package. */
function readGeneratedTargets(): GeneratedTarget[] {
  if (!statSync(GENERATED_REGISTRY, { throwIfNoEntry: false })?.isFile()) return [];
  const source = readFileSync(GENERATED_REGISTRY, 'utf8');
  const targets: GeneratedTarget[] = [];
  for (const block of source.matchAll(/\{\s*uid: "([^"]+)",([\s\S]*?)\n  \},/g)) {
    const body = block[2] ?? '';
    const interaction = body.match(
      /interaction: \{ type: "([^"]+)"(?:, valueContract: "([^"]+)")? \}/,
    );
    targets.push({
      uid: block[1]!,
      id: body.match(/\n\s*id: "([^"]*)"/)?.[1] ?? '',
      interactionType: interaction?.[1] ?? null,
      valueContract: interaction?.[2] ?? null,
      simulationId: body.match(/simulationId: "([^"]*)"/)?.[1] ?? null,
      simulationKind: body.match(/simulationKind: "([^"]*)"/)?.[1] ?? null,
      sourceFile: body.match(/sourceFile: "([^"]*)"/)?.[1] ?? '',
      sourceLine: Number(body.match(/sourceLine: (\d+)/)?.[1] ?? 0),
    });
  }
  return targets;
}

/** The closed list of value-contract names, read from its owning module. */
function readValueContractNames(): Set<string> {
  if (!statSync(VALUE_CONTRACTS_FILE, { throwIfNoEntry: false })?.isFile()) return new Set();
  const source = readFileSync(VALUE_CONTRACTS_FILE, 'utf8');
  return new Set([...source.matchAll(/contract\(\s*"([^"]+)"/g)].map((match) => match[1]!));
}

/** The object literal that declares a field at `index`, as text. */
function enclosingLiteral(source: string, index: number): string | null {
  let depth = 0;
  let start = -1;
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    const character = source[cursor];
    if (character === '}') depth += 1;
    else if (character === '{') {
      if (depth === 0) {
        start = cursor;
        break;
      }
      depth -= 1;
    }
  }
  if (start === -1) return null;
  depth = 0;
  for (let cursor = start; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, cursor + 1);
    }
  }
  return null;
}

/** Every descriptor in source that takes part in simulation. */
function readSimulatedDescriptors(): Array<{
  uid: string;
  interactionType: string | null;
  simulationId: string | null;
  file: string;
  line: number;
}> {
  const found: Array<{
    uid: string;
    interactionType: string | null;
    simulationId: string | null;
    file: string;
    line: number;
  }> = [];
  for (const directory of [join(ROOT, 'src'), join(ROOT, 'packages')]) {
    for (const file of sourceFiles(directory)) {
      const label = relative(ROOT, file).replace(/\\/g, '/');
      if (label.startsWith('packages/ui-registry-core/') || label.includes('/tests/')) continue;
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\buid:\s*["']([^"']+)["']/g)) {
        // Read exactly the literal that declares this uid. A fixed-size window
        // would spill into the next descriptor and attribute its interaction to
        // this one, which is how a guard invents drift that does not exist.
        const window = enclosingLiteral(source, match.index!);
        if (window === null) continue;
        const interaction = window.match(/interaction:\s*\{\s*type:\s*["']([^"']+)["']/);
        const simulation = window.match(
          /simulation:\s*\{\s*kind:\s*["'][^"']+["']\s*,\s*id:\s*["']([^"']+)["']/,
        );
        if (!interaction && !simulation) continue;
        found.push({
          uid: match[1]!,
          interactionType: interaction?.[1] ?? null,
          simulationId: simulation?.[1] ?? null,
          file: label,
          line: lineOf(source, match.index!),
        });
      }
    }
  }
  return found;
}

export function checkUiSimulationContract(): void {
  const readers = new Set<string>(ATTRIBUTE_READERS);
  const usedReaders = new Set<string>();

  // ── 1. Only the package builder emits data-simulation-* ──────────────────
  for (const directory of [join(ROOT, 'src'), join(ROOT, 'packages')]) {
    for (const file of sourceFiles(directory)) {
      if (file === SIMULATION_ATTRIBUTE_OWNER) continue;
      const label = relative(ROOT, file).replace(/\\/g, '/');
      if (label.includes('/tests/')) continue;
      const source = readFileSync(file, 'utf8');
      if (readers.has(label)) {
        if (source.includes('data-simulation-')) usedReaders.add(label);
        continue;
      }
      const match = source.match(/data-simulation-[a-z-]+\s*=/);
      if (!match || match.index === undefined) continue;
      addViolation(
        'UI Simulation',
        file,
        `Manual ${match[0].trim()} at line ${lineOf(source, match.index)}. Only @asol/ui-registry-core emits simulation attributes; declare simulation on the descriptor instead.`,
      );
    }
  }
  for (const reader of ATTRIBUTE_READERS) {
    if (usedReaders.has(reader)) continue;
    addViolation(
      'UI Simulation',
      join(ROOT, reader),
      'Stale simulation-attribute reader exemption: this file no longer names a data-simulation-* attribute.',
      'Remove the entry from ATTRIBUTE_READERS.',
    );
  }

  // ── 2. Adapters may only resolve a registered uid ────────────────────────
  for (const adapter of EXECUTION_ADAPTERS) {
    const file = join(ROOT, adapter);
    if (!statSync(file, { throwIfNoEntry: false })?.isFile()) {
      addViolation('UI Simulation', file, 'Missing simulation execution adapter.');
      continue;
    }
    const source = readFileSync(file, 'utf8');
    for (const forbidden of FORBIDDEN_LOCATORS) {
      const match = source.match(forbidden.pattern);
      if (!match || match.index === undefined) continue;
      addViolation(
        'UI Simulation',
        file,
        `Simulation targets ${forbidden.reason} at line ${lineOf(source, match.index)}.`,
        'Resolve elements only through uiSimulationSelector(uid), which queries [data-ui-uid="…"].',
      );
    }
    if (!source.includes('uiSimulationSelector')) {
      addViolation(
        'UI Simulation',
        file,
        'Simulation adapter does not resolve targets through uiSimulationSelector.',
      );
    }
  }

  // ── 3. The generated registry is coherent ────────────────────────────────
  const generated = readGeneratedTargets();
  const contractNames = readValueContractNames();
  const byUid = new Map<string, string>();
  const bySimulationId = new Map<string, string[]>();

  for (const target of generated) {
    const where = `${target.sourceFile}:${target.sourceLine}`;
    const file = join(ROOT, target.sourceFile);
    if (!isGeneratedUid(target.uid)) {
      addViolation(
        'UI Simulation',
        file,
        `Simulation target uid "${target.uid}" at line ${target.sourceLine} is not a generated UiRegistry uid.`,
      );
    }
    const owner = byUid.get(target.uid);
    if (owner) {
      addViolation(
        'UI Simulation',
        file,
        `uid "${target.uid}" at line ${target.sourceLine} is already registered by ${owner}.`,
      );
    } else {
      byUid.set(target.uid, where);
    }

    if (target.simulationId) {
      bySimulationId.set(target.simulationId, [
        ...(bySimulationId.get(target.simulationId) ?? []),
        where,
      ]);
      // A state marker is probed for presence, never acted on, so it is the one
      // simulated descriptor that declares no interaction.
      if (target.simulationKind !== 'state' && !target.interactionType) {
        addViolation(
          'UI Simulation',
          file,
          `Simulated descriptor "${target.id}" (uid ${target.uid}) at line ${target.sourceLine} declares no interaction.`,
          'Add interaction: { type: "tap" | "type" | "select" | "toggle" | "upload" } to the descriptor.',
        );
      }
    }

    if (target.valueContract !== null && !contractNames.has(target.valueContract)) {
      addViolation(
        'UI Simulation',
        file,
        `uid "${target.uid}" at line ${target.sourceLine} declares unknown value contract "${target.valueContract}".`,
        'Value contracts are a closed list owned by @asol/ui-registry-core.',
      );
    }
  }

  for (const [simulationId, owners] of bySimulationId) {
    if (owners.length > 1) {
      addViolation(
        'UI Simulation',
        join(ROOT, owners[0]!.split(':')[0]!),
        `Simulation id "${simulationId}" is declared by ${owners.length} descriptors (${owners.join(', ')}).`,
        'One simulation id must resolve to exactly one uid; share a single descriptor constant between mutually exclusive branches.',
      );
    }
  }

  // ── 4. The generated registry matches the descriptors in source ──────────
  // Drift here means the committed catalog describes a UI that no longer
  // exists, which is exactly the failure the generator exists to stop. The
  // comparison is descriptor-by-descriptor rather than a file diff, so the
  // guard never has to run the generator it is checking.
  const descriptors = readSimulatedDescriptors();
  const generatedByUid = new Map(generated.map((target) => [target.uid, target]));
  for (const descriptor of descriptors) {
    const target = generatedByUid.get(descriptor.uid);
    if (!target) {
      addViolation(
        'UI Simulation',
        join(ROOT, descriptor.file),
        `Simulated descriptor uid "${descriptor.uid}" at line ${descriptor.line} is missing from the generated UiSimulationRegistry.`,
        'Run `npm run ui-registry:simulation:generate` and commit the result.',
      );
      continue;
    }
    if (
      target.interactionType !== descriptor.interactionType ||
      target.simulationId !== descriptor.simulationId
    ) {
      addViolation(
        'UI Simulation',
        join(ROOT, descriptor.file),
        `Generated UiSimulationRegistry drifts from uid "${descriptor.uid}" at line ${descriptor.line} (source: ${descriptor.interactionType}/${descriptor.simulationId}, generated: ${target.interactionType}/${target.simulationId}).`,
        'Run `npm run ui-registry:simulation:generate` and commit the result.',
      );
    }
  }
  const declaredUids = new Set(descriptors.map((descriptor) => descriptor.uid));
  for (const target of generated) {
    if (declaredUids.has(target.uid)) continue;
    addViolation(
      'UI Simulation',
      GENERATED_REGISTRY,
      `Generated UiSimulationRegistry still lists uid "${target.uid}", which no descriptor declares.`,
      'Run `npm run ui-registry:simulation:generate` and commit the result.',
    );
  }

  // ── 5. Every uid a scenario names is registered ──────────────────────────
  if (statSync(SCENARIO_REGISTRY, { throwIfNoEntry: false })?.isFile()) {
    const source = readFileSync(SCENARIO_REGISTRY, 'utf8');
    for (const match of source.matchAll(/targetUid:\s*["']([^"']+)["']/g)) {
      if (byUid.has(match[1]!)) continue;
      addViolation(
        'UI Simulation',
        SCENARIO_REGISTRY,
        `Scenario step at line ${lineOf(source, match.index!)} names unknown uid "${match[1]}".`,
      );
    }
  }
}
