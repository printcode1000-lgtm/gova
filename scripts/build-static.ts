import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { withoutVsCodeDebuggerEnv } from './child-process-env';
import { categoryService } from '../src/features/categories';

const rootDir = process.cwd();
const tempBuildDir = path.join(rootDir, '.tmp-static-build');
const tempSrcDir = path.join(tempBuildDir, 'src');
const tempOutDir = path.join(tempBuildDir, 'out');
const rootOutDir = path.join(rootDir, 'out');
const rootPublicDir = path.join(rootDir, 'public');
const nextBinary = path.join(rootDir, 'node_modules', '.bin', 'next.cmd');

const appInitCommand = 'npm run app:init';
const architectureCheckCommand = 'npm run architecture:check';
const localManifestFileName = 'asol-web-manifest.json';

function stopLiveServer(): void {
  try {
    // Try to kill processes using the out directory
    if (process.platform === 'win32') {
      try {
        execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq Live Server*" 2>nul', { stdio: 'ignore' });
      } catch (e) {
        // Ignore if no process found
      }
      try {
        execSync('taskkill /F /IM code.exe /FI "WINDOWTITLE eq Live Server*" 2>nul', { stdio: 'ignore' });
      } catch (e) {
        // Ignore if no process found
      }
    }
  } catch (error) {
    // Ignore errors when stopping Live Server
  }
}

// Public assets copied verbatim into every static build.
const STATIC_PUBLIC_ALLOW_FILES = [
  'asol-app-init.js',
  'asol-push-sw.js',
  'asol-theme-init.js',
  'logo.png',
  'catagory/categories.json',
  'catagory/subcategories.json',
] as const;

const STATIC_PUBLIC_ALLOW_DIRECTORIES = [
  'catagory/cars',
  'catagory/pharmacy',
  'images/mainCategories',
  'images/pharmacy_fixed',
  'images/subCategories',
  'product/style',
] as const;

// Source/development assets that must never enter out/, R2, Android, or iOS.
const STATIC_PUBLIC_IGNORE_FILES = [
  'catagory.db',
  'asol-web-manifest.json',
  'catagory/active_ingredient_forms.json',
  'catagory/active_ingredient_strengths.json',
  'catagory/active_ingredients.json',
  'catagory/forms.json',
  'catagory/pharmacy_categories.json',
  'catagory/pharmacy_subcategories.json',
  'catagory/product_brands.json',
  'catagory/setting.json',
  'catagory/sqlite_sequence.json',
  'catagory/strengths.json',
] as const;

const STATIC_PUBLIC_IGNORE_DIRECTORIES = [
  'sync_data',
] as const;

// Next.js routes removed only from the temporary production/static source tree.
const STATIC_ROUTE_IGNORELIST = [
  'app/api',
  'app/dev',
  'app/orders/[orderId]',
  'app/test1',
] as const;

function copyIfExists(source: string, destination: string): void {
  if (!existsSync(source)) {
    return;
  }

  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

function copyRequired(source: string, destination: string): void {
  if (!existsSync(source)) throw new Error(`Required static asset not found: ${source}`);
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function isInsideDirectory(filePath: string, directory: string): boolean {
  return filePath.startsWith(`${directory}/`);
}

function listFiles(root: string, current = root, result: string[] = []): string[] {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) listFiles(root, fullPath, result);
    else result.push(normalizePath(path.relative(root, fullPath)));
  }
  return result;
}

function assertPublicAssetPolicy(): void {
  const allowFiles = new Set<string>(STATIC_PUBLIC_ALLOW_FILES);
  const ignoreFiles = new Set<string>(STATIC_PUBLIC_IGNORE_FILES);

  const unclassified = listFiles(rootPublicDir).filter((filePath) => {
    if (filePath.split('/').some((segment) => segment.startsWith('.'))) return false;
    if (allowFiles.has(filePath)) return false;
    if (STATIC_PUBLIC_ALLOW_DIRECTORIES.some((directory) => isInsideDirectory(filePath, directory))) return false;
    if (ignoreFiles.has(filePath)) return false;
    if (STATIC_PUBLIC_IGNORE_DIRECTORIES.some((directory) => isInsideDirectory(filePath, directory))) return false;
    return true;
  });

  if (unclassified.length > 0) {
    throw new Error(
      `Unclassified public assets. Add each path to the static allowlist or ignorelist:\n${unclassified.join('\n')}`,
    );
  }
}

function prepareStaticPublicDir(): void {
  const tempPublicDir = path.join(tempBuildDir, 'public');
  for (const relativePath of STATIC_PUBLIC_ALLOW_FILES) {
    copyRequired(
      path.join(rootPublicDir, relativePath),
      path.join(tempPublicDir, relativePath),
    );
  }

  for (const relativePath of STATIC_PUBLIC_ALLOW_DIRECTORIES) {
    copyRequired(
      path.join(rootPublicDir, relativePath),
      path.join(tempPublicDir, relativePath),
    );
  }

  assertPublicAssetPolicy();
}

function prepareTempBuildDir(): void {
  stopLiveServer();
  rmSync(tempBuildDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  rmSync(rootOutDir, { recursive: true, force: true });

  copyIfExists(path.join(rootDir, 'src'), tempSrcDir);
  for (const relativePath of STATIC_ROUTE_IGNORELIST) {
    rmSync(path.join(tempSrcDir, relativePath), { recursive: true, force: true });
  }

  const rootFilesToCopy = [
    '.env',
    '.env.local',
    'next.config.ts',
    'next-env.d.ts',
    'package.json',
    'postcss.config.mjs',
    'components.json',
    'capacitor.config.ts',
    'drizzle.config.ts',
    'drizzle.profile.config.ts',
    'tsconfig.json',
  ];

  for (const fileName of rootFilesToCopy) {
    copyIfExists(path.join(rootDir, fileName), path.join(tempBuildDir, fileName));
  }

  prepareStaticPublicDir();
}

function copyBuildOutputBack(): void {
  if (!existsSync(tempOutDir)) {
    throw new Error(`Static build output not found: ${tempOutDir}`);
  }

  rmSync(rootOutDir, { recursive: true, force: true });
  cpSync(tempOutDir, rootOutDir, { recursive: true });
}

/**
 * Next's App Router may request flattened RSC URLs during client-side
 * navigation (for example `categories/45/__next.categories.$d$categoryId.txt`),
 * while the Windows static export can emit the same payload below nested
 * directories such as `categories/45/__next.categories/$d$categoryId.txt`.
 *
 * Plain static servers and Capacitor's local asset handler cannot rewrite
 * between those shapes, so create aliases beside each route.
 */
function createStaticRscAliases(): void {
  const rscPayloads = readdirSync(rootOutDir, { recursive: true, withFileTypes: true }).filter(
    (entry) => entry.isFile() && entry.name.endsWith('.txt'),
  );

  for (const payload of rscPayloads) {
    const sourcePath = path.join(payload.parentPath, payload.name);
    const relativeSourcePath = path.relative(rootOutDir, sourcePath);
    const marker = `${path.sep}__next.`;
    const markerIndex = relativeSourcePath.indexOf(marker);

    if (markerIndex < 0) {
      continue;
    }

    const routeDirectory = relativeSourcePath.slice(0, markerIndex);
    const payloadPath = relativeSourcePath.slice(markerIndex + 1);
    const flattenedPayloadName = payloadPath.split(path.sep).join('.');
    const aliasPath = path.join(rootOutDir, routeDirectory, flattenedPayloadName);

    if (sourcePath === aliasPath) {
      continue;
    }

    cpSync(sourcePath, aliasPath);
  }
}

function collectManifestFiles(root: string, current = root, result: Record<string, { sha256: string; size: number }> = {}) {
  const entries = readdirSync(current, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      collectManifestFiles(root, fullPath, result);
      continue;
    }

    const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');
    if (relativePath === localManifestFileName) continue;
    if (relativePath.split('/').some((segment) => segment.startsWith('.'))) continue;

    const bytes = readFileSync(fullPath);
    result[relativePath] = {
      sha256: createHash('sha256').update(bytes).digest('hex'),
      size: statSync(fullPath).size,
    };
  }

  return result;
}

function writeLocalWebManifest(): void {
  const files = collectManifestFiles(rootOutDir);
  const size = Object.values(files).reduce((total, file) => total + file.size, 0);
  const manifest = {
    schemaVersion: 2,
    delivery: 'files',
    releaseId: `${process.env.NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION ?? '0.1.0'}-local`,
    version: process.env.NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION ?? '0.1.0',
    createdAt: new Date().toISOString(),
    baseUrl: '',
    size,
    fileCount: Object.keys(files).length,
    minimumNativeVersion: process.env.NEXT_PUBLIC_ASOL_NATIVE_VERSION ?? '1.0.0',
    mandatory: false,
    notes: 'Bundled web assets',
    files,
  };

  const manifestJson = JSON.stringify(manifest, null, 2);
  writeFileSync(path.join(rootOutDir, localManifestFileName), manifestJson);
  writeFileSync(path.join(rootPublicDir, localManifestFileName), manifestJson);
  console.log(`✅ Wrote ${localManifestFileName} (${manifest.fileCount} files, ${Math.ceil(size / 1024)} KB)`);
}

try {
  const childEnv = withoutVsCodeDebuggerEnv(process.env);
  execSync(appInitCommand, { stdio: 'inherit', cwd: rootDir, env: childEnv });
  execSync(architectureCheckCommand, { stdio: 'inherit', cwd: rootDir, env: childEnv });

  prepareTempBuildDir();

  execSync(`"${nextBinary}" build`, {
    stdio: 'inherit',
    cwd: tempBuildDir,
    env: {
      ...childEnv,
      ASOL_MODE: 'static',
    },
  });

  copyBuildOutputBack();
  createStaticRscAliases();
  writeLocalWebManifest();
  auditGeneratedStaticRoutes();
} finally {
  rmSync(tempBuildDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

function auditGeneratedStaticRoutes(): void {
  console.log('🔍 Auditing generated static routes against categories registry...');
  const missingRoutes: string[] = [];

  // 1. Check Categories & Sellers
  const categoryIds = new Set<number>();
  for (const category of categoryService.getMainCategories()) {
    categoryIds.add(category.id);
  }
  for (const collection of categoryService.getCollections()) {
    for (const item of collection.items) {
      categoryIds.add(item.id);
    }
  }

  for (const categoryId of categoryIds) {
    const categoryPath = path.join(rootOutDir, 'categories', String(categoryId), 'index.html');
    if (!existsSync(categoryPath)) {
      missingRoutes.push(`/categories/${categoryId}`);
    }

    // Sellers pages for this category
    const tree = categoryService.getCategoryTree(categoryId);
    if (tree) {
      for (const subcategory of tree.subcategories) {
        const sellerPath = path.join(
          rootOutDir,
          'categories',
          String(categoryId),
          'sellers',
          String(subcategory.originalId),
          'index.html'
        );
        if (!existsSync(sellerPath)) {
          missingRoutes.push(`/categories/${categoryId}/sellers/${subcategory.originalId}`);
        }
      }
    }
  }

  // 2. Check Doctor Appointment Specialties (under Category 20)
  const medicalCategory = categoryService.getCategoryTree(20);
  if (medicalCategory && medicalCategory.doctorAppointmentItems) {
    for (const specialty of medicalCategory.doctorAppointmentItems) {
      const docPath = path.join(
        rootOutDir,
        'categories',
        '20',
        'doctor-appointment',
        String(specialty.originalId),
        'index.html'
      );
      if (!existsSync(docPath)) {
        missingRoutes.push(`/categories/20/doctor-appointment/${specialty.originalId}`);
      }
    }
  }

  // 3. Check Collections
  for (const collection of categoryService.getCollections()) {
    const collectionPath = path.join(rootOutDir, 'collections', String(collection.id), 'index.html');
    if (!existsSync(collectionPath)) {
      missingRoutes.push(`/collections/${collection.id}`);
    }
  }

  if (missingRoutes.length > 0) {
    console.error('\n❌ STATIC BUILD AUDIT FAILED!');
    console.error('The following expected static routes were not generated:');
    for (const route of missingRoutes) {
      console.error(`  - ${route}`);
    }
    console.error('\nThis happens if page.tsx components do not generate params for these routes in generateStaticParams().');
    console.error('Please check generateStaticParams() under:');
    console.error('  - src/app/categories/[categoryId]/page.tsx');
    console.error('  - src/app/categories/[categoryId]/sellers/[subcategoryId]/page.tsx');
    console.error('  - src/app/categories/[categoryId]/doctor-appointment/[specialtyId]/page.tsx');
    console.error('  - src/app/collections/[collectionId]/page.tsx\n');
    throw new Error(`Static build audit failed: ${missingRoutes.length} routes are missing.`);
  }

  console.log('✅ Static build audit passed. All registered category/sellers/doctor pages were generated successfully!');
}
