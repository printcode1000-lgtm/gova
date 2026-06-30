import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const tempBuildDir = path.join(rootDir, '.tmp-static-build');
const tempSrcDir = path.join(tempBuildDir, 'src');
const tempOutDir = path.join(tempBuildDir, 'out');
const rootOutDir = path.join(rootDir, 'out');
const rootPublicDir = path.join(rootDir, 'public');
const nextBinary = path.join(rootDir, 'node_modules', '.bin', 'next.cmd');

const appInitCommand = 'npm run app:init';
const architectureCheckCommand = 'npm run architecture:check';
const localManifestFileName = 'gova-web-manifest.json';

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

function prepareStaticPublicDir(): void {
  const tempPublicDir = path.join(tempBuildDir, 'public');
  const staticFiles = [
    'gova-app-init.js',
    'gova-theme-init.js',
    'logo.png',
    path.join('catagory', 'categories.json'),
  ];

  for (const relativePath of staticFiles) {
    copyRequired(
      path.join(rootPublicDir, relativePath),
      path.join(tempPublicDir, relativePath),
    );
  }

  const categoriesPath = path.join(rootPublicDir, 'catagory', 'categories.json');
  const categories = JSON.parse(readFileSync(categoriesPath, 'utf8')) as Array<{ image?: unknown }>;
  const categoryImages = new Set(
    categories
      .map((category) => category.image)
      .filter((image): image is string => typeof image === 'string' && image.length > 0),
  );

  for (const image of categoryImages) {
    if (path.basename(image) !== image) {
      throw new Error(`Unsafe category image path: ${image}`);
    }
    copyRequired(
      path.join(rootPublicDir, 'images', 'mainCategories', image),
      path.join(tempPublicDir, 'images', 'mainCategories', image),
    );
  }
}

function prepareTempBuildDir(): void {
  rmSync(tempBuildDir, { recursive: true, force: true });
  rmSync(rootOutDir, { recursive: true, force: true });

  copyIfExists(path.join(rootDir, 'src'), tempSrcDir);
  rmSync(path.join(tempSrcDir, 'app', 'api'), { recursive: true, force: true });
  rmSync(path.join(tempSrcDir, 'app', 'dev'), { recursive: true, force: true });
  rmSync(path.join(tempSrcDir, 'app', 'test1'), { recursive: true, force: true });

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
 * Next's App Router requests a flattened RSC page URL during client-side
 * navigation (for example `orders/__next.orders.__PAGE__.txt`), while the
 * Windows static export currently emits that payload as
 * `orders/__next.orders/__PAGE__.txt`.
 *
 * Plain static servers cannot rewrite between those two shapes, so create a
 * small alias beside each route. This keeps navigation working on Live Server,
 * GitHub Pages, and other file-only hosts.
 */
function createStaticRscPageAliases(): void {
  const pagePayloads = readdirSync(rootOutDir, { recursive: true, withFileTypes: true }).filter(
    (entry) => entry.isFile() && entry.name === '__PAGE__.txt',
  );

  for (const payload of pagePayloads) {
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
    releaseId: `${process.env.NEXT_PUBLIC_GOVA_WEB_BUNDLE_VERSION ?? '0.1.0'}-local`,
    version: process.env.NEXT_PUBLIC_GOVA_WEB_BUNDLE_VERSION ?? '0.1.0',
    createdAt: new Date().toISOString(),
    baseUrl: '',
    size,
    fileCount: Object.keys(files).length,
    minimumNativeVersion: process.env.NEXT_PUBLIC_GOVA_NATIVE_VERSION ?? '1.0.0',
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
  execSync(appInitCommand, { stdio: 'inherit', cwd: rootDir });
  execSync(architectureCheckCommand, { stdio: 'inherit', cwd: rootDir });

  prepareTempBuildDir();

  execSync(`"${nextBinary}" build`, {
    stdio: 'inherit',
    cwd: tempBuildDir,
    env: {
      ...process.env,
      GOVA_MODE: 'static',
    },
  });

  copyBuildOutputBack();
  createStaticRscPageAliases();
  writeLocalWebManifest();
} finally {
  rmSync(tempBuildDir, { recursive: true, force: true });
}
