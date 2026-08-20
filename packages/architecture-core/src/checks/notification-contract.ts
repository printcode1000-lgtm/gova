import { dirname, join, relative } from 'path';
import { normalizePath } from '../contracts/contract';
import {
  NOTIFICATION_ENTRY_POINTS_BY_TREE,
  NOTIFICATION_GUARDED_TREES,
  NOTIFICATION_INTERNAL_IMPORT_EXEMPT,
  NOTIFICATION_INTERNAL_SEGMENTS,
  NOTIFICATION_LAYER_DEPENDENCIES,
  NOTIFICATION_MODULE_ROOT,
  NOTIFICATION_PUBLIC_ENTRY_POINTS,
  NOTIFICATION_PUBLIC_SPECIFIERS,
  NOTIFICATION_TRANSPORT_RULES,
  type NotificationLayer,
} from '../contracts/notification-contract';
import { ROOT, addViolation, rel } from './architecture-types';

/**
 * Enforces the notification module's boundary.
 *
 * Four checks, matching the four rules in `notification-contract.ts`: nobody
 * outside reaches in, nobody inside reaches up, no transport is touched outside
 * the adapter that owns it, and the module never imports a consumer.
 *
 * Every violation carries a file, a line, and what to do instead, so the message
 * is actionable without opening the contract.
 */

const LAYER_LABEL = 'Notification Module Contract';

/** An import with the line it appeared on, for an actionable message. */
interface ImportSite {
  specifier: string;
  line: number;
}

/**
 * Imports and their line numbers.
 *
 * Deliberately not the shared `extractImports`: that one loses positions, and a
 * violation without a line is a violation someone has to hunt for.
 */
export function extractImportSites(content: string): ImportSite[] {
  const sites: ImportSite[] = [];
  const patterns = [
    /import\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      sites.push({
        specifier: match[1],
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }
  return sites;
}

/** The line a pattern first matches on, for transport violations. */
function lineOf(content: string, pattern: RegExp): number {
  const search = new RegExp(pattern.source, pattern.flags.replace('g', ''));
  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (search.test(lines[index])) return index + 1;
  }
  return 1;
}

function isEntryPoint(fileRel: string): boolean {
  return (NOTIFICATION_PUBLIC_ENTRY_POINTS as readonly string[]).includes(fileRel);
}

function layerOf(fileRel: string): NotificationLayer | null {
  if (!fileRel.startsWith(NOTIFICATION_MODULE_ROOT)) return null;
  if (isEntryPoint(fileRel)) return 'entry';
  const segment = fileRel.slice(NOTIFICATION_MODULE_ROOT.length).split('/')[0];
  switch (segment) {
    case 'domain':
    case 'application':
    case 'infrastructure':
    case 'services':
    case 'presentation':
    case 'public':
    case 'shared':
    case 'config':
      return segment;
    default:
      // `tests/` may reach anywhere: a contract test's job is to look inside.
      return null;
  }
}

/**
 * The repo-relative path an import points at, or null for a package.
 *
 * Extension-less, because the contract is expressed in folders. `@/` resolves to
 * `src/` in both tsconfigs — the main app's and the microservice's — which is
 * why one resolver serves both trees.
 */
function resolveImport(fileRel: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) return `src/${specifier.slice(2)}`;
  if (!specifier.startsWith('.')) return null;
  return normalizePath(relative(ROOT, join(ROOT, dirname(fileRel), specifier)));
}

/** Which internal folder an import reaches, if any. */
function internalTargetLayer(target: string): NotificationLayer | 'tests' | null {
  if (!target.startsWith(NOTIFICATION_MODULE_ROOT)) return null;
  const segment = target.slice(NOTIFICATION_MODULE_ROOT.length).split('/')[0];
  return (NOTIFICATION_INTERNAL_SEGMENTS as readonly string[]).includes(segment)
    ? (segment as NotificationLayer | 'tests')
    : null;
}

/** Which guarded tree a file belongs to, if any. */
function treeOf(fileRel: string): string | null {
  return NOTIFICATION_GUARDED_TREES.find((tree) => fileRel.startsWith(tree)) ?? null;
}

function checkOutsideImports(
  fileRel: string,
  filePath: string,
  imports: ImportSite[],
): void {
  if (fileRel.startsWith(NOTIFICATION_MODULE_ROOT)) return;
  if (NOTIFICATION_INTERNAL_IMPORT_EXEMPT.has(fileRel)) return;
  const tree = treeOf(fileRel);
  if (!tree) return;

  const allowed = NOTIFICATION_ENTRY_POINTS_BY_TREE[tree] ?? NOTIFICATION_PUBLIC_SPECIFIERS;

  for (const { specifier, line } of imports) {
    const target = resolveImport(fileRel, specifier);

    // Reaching an internal folder, by alias or by relative path.
    if (target && internalTargetLayer(target)) {
      addViolation(
        LAYER_LABEL,
        filePath,
        `line ${line}: imports notification internals — "${specifier}".`,
        `Import from ${allowed.join(', ')}.`,
      );
      continue;
    }

    // Reaching an entry point this tree is not allowed to use.
    const isNotificationEntry = (NOTIFICATION_PUBLIC_SPECIFIERS as readonly string[]).includes(
      specifier,
    );
    if (isNotificationEntry && !allowed.includes(specifier)) {
      addViolation(
        LAYER_LABEL,
        filePath,
        `line ${line}: "${specifier}" is not importable from ${tree}.`,
        `This tree may import: ${allowed.join(', ')}.`,
      );
    }
  }
}

function checkLayering(fileRel: string, filePath: string, imports: ImportSite[]): void {
  const layer = layerOf(fileRel);
  if (!layer) return;
  const allowed = NOTIFICATION_LAYER_DEPENDENCIES[layer];

  for (const { specifier, line } of imports) {
    const target = resolveImport(fileRel, specifier);
    if (!target) continue;

    // A file inside the module importing its own entry point is a cycle: the
    // entry point re-exports the file that is asking for it.
    if (isEntryPoint(target)) {
      addViolation(
        LAYER_LABEL,
        filePath,
        `line ${line}: imports the module's own entry point ("${specifier}"), which is a cycle.`,
        'Import the internal module directly.',
      );
      continue;
    }

    const targetLayer = internalTargetLayer(target);
    if (!targetLayer || targetLayer === layer || targetLayer === 'tests') continue;
    if (!(allowed as readonly string[]).includes(targetLayer)) {
      addViolation(
        LAYER_LABEL,
        filePath,
        `line ${line}: ${layer} imports ${targetLayer} — "${specifier}".`,
        `${layer} may import: ${allowed.join(', ') || 'nothing'}. Move the shared code down a layer, or invert the dependency with a port.`,
      );
    }
  }
}

function checkTransportOwnership(fileRel: string, filePath: string, content: string): void {
  if (!fileRel.startsWith(NOTIFICATION_MODULE_ROOT)) return;
  if (fileRel.startsWith(`${NOTIFICATION_MODULE_ROOT}tests/`)) return;

  const code = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const rule of NOTIFICATION_TRANSPORT_RULES) {
    if (rule.owners.some((owner) => fileRel === owner || fileRel.startsWith(owner))) continue;
    if (!rule.pattern.test(code)) continue;
    addViolation(
      LAYER_LABEL,
      filePath,
      `line ${lineOf(code, rule.pattern)}: reaches ${rule.transport} outside its adapter.`,
      `Use ${rule.use}.`,
    );
  }
}

/**
 * Anything inside the module that imports a feature which imports it back.
 *
 * Checked by name rather than by walking the graph: a notification file has no
 * business importing another feature's entry point at all, because that entry
 * point is free to import notifications.
 */
function checkFeatureCycles(fileRel: string, filePath: string, imports: ImportSite[]): void {
  if (!fileRel.startsWith(NOTIFICATION_MODULE_ROOT)) return;
  if (fileRel.startsWith(`${NOTIFICATION_MODULE_ROOT}tests/`)) return;

  for (const { specifier, line } of imports) {
    const match = /^@\/features\/([^/]+)(?:\/(ui|server|contracts|service-runtime))?$/.exec(
      specifier,
    );
    if (!match || match[1] === 'notifications') continue;
    addViolation(
      LAYER_LABEL,
      filePath,
      `line ${line}: imports the "${match[1]}" feature's entry point, which may import notifications back.`,
      'Invert it: expose a port and let that feature register through the public API.',
    );
  }
}

export function checkNotificationModuleContract(filePath: string, content: string): void {
  const fileRel = rel(filePath);
  const imports = extractImportSites(content);
  checkOutsideImports(fileRel, filePath, imports);
  checkLayering(fileRel, filePath, imports);
  checkTransportOwnership(fileRel, filePath, content);
  checkFeatureCycles(fileRel, filePath, imports);
}
