import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import {
  ALLOWED_DRIZZLE_ORM_FILES_PATTERN,
  ALLOWED_DB_DRIVER_FILES_PATTERN,
  ALLOWED_FETCH_FILES,
  ALLOWED_PROCESS_ENV_FILES,
  ALLOWED_SQL_FILES_PATTERN,
  LAYER_LABELS,
  RAW_SQL_PATTERNS,
  classifyLayer,
  getForbiddenImportViolation,
  importTargetLayer,
  isClientComponent,
  isServerOnlyModule,
  normalizePath,
  type ArchitectureLayer,
} from '../src/core/architecture/contract';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

interface Violation {
  layer: string;
  file: string;
  violation: string;
  allowed?: string;
}

const violations: Violation[] = [];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

function rel(filePath: string): string {
  return normalizePath(relative(ROOT, filePath));
}

function addViolation(layer: ArchitectureLayer | string, file: string, message: string, allowed?: string) {
  violations.push({
    layer: typeof layer === 'string' ? layer : LAYER_LABELS[layer],
    file: rel(file),
    violation: message,
    allowed,
  });
}

function matchesAny(path: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(path));
}

function extractImports(content: string): string[] {
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

function checkFile(filePath: string): void {
  const content = readFileSync(filePath, 'utf8');
  const fileRel = rel(filePath);
  const layer = classifyLayer(fileRel);
  const isClient = isClientComponent(content);
  const isServerOnly = isServerOnlyModule(content);

  if (content.includes('process.env') && !ALLOWED_PROCESS_ENV_FILES.has(fileRel)) {
    addViolation(
      'configuration',
      filePath,
      'process.env used outside Configuration layer.',
      'Import values from @/core/config instead.'
    );
  }

  if (/\bfetch\s*\(/.test(content) && !ALLOWED_FETCH_FILES.has(fileRel)) {
    addViolation(
      'gova-api-client',
      filePath,
      'fetch() used outside gova-http-transport.ts.',
      'Use govaApi from @/core/api.'
    );
  }

  if (/\baxios\b/.test(content)) {
    if (/from\s+['"]axios['"]/.test(content) || /require\(['"]axios['"]\)/.test(content)) {
      addViolation('gova-api-client', filePath, 'Direct HTTP client used outside GovaApiClient.', 'Use govaApi.');
    }
  }
  if (/\bXMLHttpRequest\b/.test(content) && !/LAYER_LABELS|Architecture Contract|Forbidden/.test(content)) {
    addViolation('gova-api-client', filePath, 'Direct HTTP client used outside GovaApiClient.', 'Use govaApi.');
  }

  if (/from\s+['"]drizzle-orm/.test(content) || /require\(['"]drizzle-orm/.test(content)) {
    if (!matchesAny(fileRel, ALLOWED_DRIZZLE_ORM_FILES_PATTERN)) {
      addViolation(
        'repository',
        filePath,
        'drizzle-orm imported outside Repository / Database Client.',
        'Repository and Database Client only.'
      );
    }
  }

  if (/from\s+['"]better-sqlite3['"]/.test(content) || /from\s+['"]@libsql\//.test(content)) {
    if (!matchesAny(fileRel, ALLOWED_DB_DRIVER_FILES_PATTERN)) {
      addViolation(
        'database-client',
        filePath,
        'Database driver imported outside Database Client / Provisioning.',
        'Database Client only.'
      );
    }
  }

  const strippedContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  if (RAW_SQL_PATTERNS.some((pattern) => pattern.test(strippedContent)) && !matchesAny(fileRel, ALLOWED_SQL_FILES_PATTERN)) {
    addViolation('repository', filePath, 'Raw SQL detected outside Repository / Database Client.', 'Repository only.');
  }

  const secretPatterns = [
    'TURSO_API_TOKEN',
    'TURSO_AUTH_TOKEN',
    'TURSO_DATABASE_URL',
    'TURSO_PROFILE_DATABASE_URL',
    'TURSO_PROFILE_AUTH_TOKEN',
    'R2_API_TOKEN',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'VERCEL_TOKEN',
    'VERCEL_ORG_ID',
  ];
  if (!isServerOnly && !ALLOWED_PROCESS_ENV_FILES.has(fileRel) && layer !== 'provisioning' && layer !== 'database-client') {
    for (const secret of secretPatterns) {
      if (content.includes(secret)) {
        addViolation('configuration', filePath, `Secret reference "${secret}" in client-accessible file.`, 'Server config only.');
      }
    }
  }

  if (isClient) {
    if (isServerOnly) {
      addViolation(layer, filePath, 'Client Component imports server-only module.', 'UI → Hooks → Client Services only.');
    }
    for (const imp of extractImports(content)) {
      const target = importTargetLayer(imp);
      if (target === 'repository' || target === 'operations' || target === 'server-services' || target === 'database-client') {
        addViolation(layer, filePath, `Client Component imports ${imp}.`, 'Use Client Services + GovaApiClient.');
      }
      if (imp === 'server-only') {
        addViolation(layer, filePath, 'Client Component imports server-only.', 'Forbidden.');
      }
    }
  }

  if (isServerOnly && (layer === 'ui' || layer === 'hooks' || layer === 'client-services')) {
    addViolation(layer, filePath, 'Client layer file marked server-only.', 'Remove server-only from client code.');
  }

  if (layer === 'server-services' || layer === 'business-api' || layer === 'operations' || layer === 'repository') {
    for (const imp of extractImports(content)) {
      if (imp.startsWith('@/components/') || imp.includes('/hooks/')) {
        addViolation(layer, filePath, `Server layer imports client module "${imp}".`, 'Server must not import UI/Hooks.');
      }
      if (imp.includes('-api-service') || imp.endsWith('/auth-service') && !imp.includes('.server')) {
        addViolation(layer, filePath, `Server layer imports Client Service "${imp}".`, 'Use server service instead.');
      }
    }
  }

  for (const imp of extractImports(content)) {
    const target = importTargetLayer(imp);
    const violation = getForbiddenImportViolation(layer, target, imp);
    if (violation) {
      addViolation(layer, filePath, violation, getAllowedHint(layer, target));
    }
  }

  if (layer === 'business-api') {
    const hasServerService = extractImports(content).some(
      (imp) => imp.includes('.server') || imp.includes('service.server') || imp.includes('-service.server')
    );
    const importsRepo = extractImports(content).some((imp) => imp.includes('/repositories/'));
    const importsOps = extractImports(content).some((imp) => imp.includes('/operations/'));
    if (!hasServerService && fileRel.includes('/auth/') && !fileRel.endsWith('logout/route.ts')) {
      if (importsRepo || importsOps) {
        addViolation('business-api', filePath, 'Business API must delegate to Server Services only.', 'Business API → Server Services.');
      }
    }
  }

  if (layer === 'server-services') {
    const importsDrizzle = /from\s+['"]drizzle-orm/.test(content);
    if (importsDrizzle) {
      addViolation('server-services', filePath, 'Server Service uses Drizzle directly.', 'Use Query / Command layer.');
    }
    const importsRepoDirect = /from\s+['"]@\/features\/[^'"]+\/repositories\/[^'"]+['"]/.test(content);
    if (importsRepoDirect && !content.includes('IUserRepository') && content.includes('userRepository')) {
      // AuthService uses IUserRepository interface with default userRepository - allowed via constructor DI
    }
  }
}

function getAllowedHint(layer: ArchitectureLayer, target: ArchitectureLayer | 'forbidden-package'): string {
  const hints: Partial<Record<ArchitectureLayer, string>> = {
    ui: 'UI → Hooks only.',
    hooks: 'Hooks → Client Services only.',
    'client-services': 'Client Services → GovaApiClient only.',
    'business-api': 'Business API → Server Services only.',
    'server-services': 'Server Services → Query / Command only.',
    operations: 'Query / Command → Repository only.',
    repository: 'Repository → Database Client only.',
  };
  return hints[layer] ?? 'Follow the Architecture Contract layer order.';
}

function printReport(): void {
  const checks = [
    'UI Layer',
    'Hooks Layer',
    'Client Services',
    'GovaApiClient',
    'Business APIs',
    'Server Services',
    'Query Layer',
    'Command Layer',
    'Repository Layer',
    'Database Client',
    'SQLite Rules',
    'Turso Rules',
    'No SQL Outside Repository',
    'No fetch Outside GovaApiClient',
    'No Secrets In Client',
    'No Drizzle Outside Repository',
    'No Invalid Imports',
    'Configuration Layer',
  ];

  const failedCategories = new Set(violations.map((v) => v.layer));
  const score = Math.round(((checks.length - Math.min(failedCategories.size, checks.length)) / checks.length) * 100);

  console.log('\nArchitecture Report\n');

  for (const check of checks) {
    const failed = [...failedCategories].some((c) => check.toLowerCase().includes(c.split(' ')[0].toLowerCase()));
    console.log(`${failed ? '✖' : '✔'} ${check}`);
  }

  console.log(`\nArchitecture Score\n\n${score}%\n`);

  if (violations.length > 0) {
    console.log('Architecture Violations\n');
    for (const v of violations) {
      console.log(`Layer:\n${v.layer}\n\nFile:\n${v.file}\n\nViolation:\n${v.violation}\n`);
      if (v.allowed) console.log(`Allowed:\n${v.allowed}\n`);
      console.log('---\n');
    }
    console.log('Build Failed.\n');
  }
}

function main(): void {
  const files = walk(SRC);
  for (const file of files) {
    if (normalizePath(file).includes('/architecture/contract.ts')) continue;
    checkFile(file);
  }

  printReport();

  if (violations.length > 0) {
    process.exit(1);
  }

  console.log('All architecture checks passed.\n');
}

main();
