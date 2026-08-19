import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import {
  ALLOWED_DRIZZLE_ORM_FILES_PATTERN,
  ALLOWED_DB_DRIVER_FILES_PATTERN,
  ALLOWED_FETCH_FILES,
  ALLOWED_PROCESS_ENV_FILES,
  ALLOWED_SQL_FILES_PATTERN,
  DIRECT_DATABASE_CALL_PATTERNS,
  LAYER_LABELS,
  RAW_SQL_PATTERNS,
  classifyLayer,
  getForbiddenImportViolation,
  importTargetLayer,
  isClientComponent,
  isServerOnlyModule,
  normalizePath,
  type ArchitectureLayer,
} from "../../src/core/architecture/contract";

export const ROOT = process.cwd();
export const SRC = join(ROOT, 'src');
export const SCRIPTS = join(ROOT, 'scripts');
export const PUBLIC_PUSH_WORKER = join(ROOT, 'public', 'asol-push-sw.js');
export const PUSH_WORKER_SOURCE = join(
  ROOT,
  'packages',
  'data-core',
  'src',
  'browser',
  'workers',
  'asol-push-sw.js',
);

export interface Violation {
  layer: string;
  file: string;
  violation: string;
  allowed?: string;
}

export const violations: Violation[] = [];

export const STRUCTURED_CATEGORY_COLUMN_FILES = new Set([
  'packages/data-core/src/core/database/profile/profile.schema.ts',
  'packages/data-core/src/core/database/product/product.schema.ts',
  'packages/data-core/src/domains/profile/repositories/profile-repository.ts',
  'packages/data-core/src/domains/product/repositories/product-repository.ts',
]);

export function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry)) files.push(full);
  }
  return files;
}

export function rel(filePath: string): string {
  return normalizePath(relative(ROOT, filePath));
}

export function addViolation(layer: ArchitectureLayer | string, file: string, message: string, allowed?: string) {
  violations.push({
    layer: typeof layer === 'string' ? layer : LAYER_LABELS[layer],
    file: rel(file),
    violation: message,
    allowed,
  });
}

export const NATIVE_PLATFORM_ROOT = 'packages/native-core/src/adapters/';

export const CAPACITOR_IMPORT_ALLOWED_FILES = new Set<string>();

export const CAPACITOR_IMPORT_PATTERN =
  /from\s+['"]@(?:capacitor|capacitor-mlkit|capawesome|capgo)\//;

export const NATIVE_CAPABILITY_PATTERNS: Array<{
  pattern: RegExp;
  api: string;
  use: string;
  /** Files that may still use the raw API, with the reason. */
  allowed: Set<string>;
}> = [
  {
    pattern: /\bnavigator\s*\.\s*(?:share|canShare)\s*[({]/,
    api: 'navigator.share',
    use: 'NativeCore.share',
    allowed: new Set<string>(),
  },
  {
    pattern: /\bnavigator\s*\.\s*geolocation\b/,
    api: 'navigator.geolocation',
    use: 'NativeCore.getCurrentPosition',
    allowed: new Set([
      // Explicit opt-out provider kept for tests and deliberate raw access.
      'packages/map-core/src/gps.ts',
    ]),
  },
  {
    pattern: /\bNotification\s*\.\s*requestPermission\s*\(/,
    api: 'Notification.requestPermission',
    use: 'NativeCore.requestPermissionIfNeeded("notifications")',
    allowed: new Set<string>(),
  },
  {
    pattern: /\bnavigator\s*\.\s*clipboard\b/,
    api: 'navigator.clipboard',
    use: 'NativeCore.readClipboard / NativeCore.writeClipboard',
    allowed: new Set<string>(),
  },
];

export function checkNativePlatformContract(fileRel: string, content: string, filePath: string): void {
  if (fileRel.startsWith(NATIVE_PLATFORM_ROOT)) return;

  if (
    !CAPACITOR_IMPORT_ALLOWED_FILES.has(fileRel) &&
    CAPACITOR_IMPORT_PATTERN.test(content)
  ) {
    addViolation(
      'Native Core Contract',
      filePath,
      'Capacitor plugin imported outside packages/native-core/src/adapters/.',
      'Use the public API exported from @asol/native-core.',
    );
  }

  // Comments and doc blocks reference these API names legitimately.
  const code = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  for (const { pattern, api, use, allowed } of NATIVE_CAPABILITY_PATTERNS) {
    if (allowed.has(fileRel)) continue;
    if (!pattern.test(code)) continue;
    addViolation(
      'Native Core Contract',
      filePath,
      `${api} used outside the Native Core layer.`,
      `Use ${use} instead.`,
    );
  }
}

export function matchesAny(path: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(path));
}

export function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  const dynamicRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content))) imports.push(match[1]);
  while ((match = requireRegex.exec(content))) imports.push(match[1]);
  while ((match = dynamicRegex.exec(content))) imports.push(match[1]);

  return imports;
}
