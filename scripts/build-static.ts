import { execSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const tempBuildDir = path.join(rootDir, '.tmp-static-build');
const tempSrcDir = path.join(tempBuildDir, 'src');
const tempOutDir = path.join(tempBuildDir, 'out');
const rootOutDir = path.join(rootDir, 'out');
const nextBinary = path.join(rootDir, 'node_modules', '.bin', 'next.cmd');

const appInitCommand = 'npm run app:init';
const architectureCheckCommand = 'npm run architecture:check';

function copyIfExists(source: string, destination: string): void {
  if (!existsSync(source)) {
    return;
  }

  cpSync(source, destination, { recursive: true });
}

function prepareTempBuildDir(): void {
  rmSync(tempBuildDir, { recursive: true, force: true });
  rmSync(rootOutDir, { recursive: true, force: true });

  copyIfExists(path.join(rootDir, 'src'), tempSrcDir);
  rmSync(path.join(tempSrcDir, 'app', 'api'), { recursive: true, force: true });

  const rootFilesToCopy = [
    'public',
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
} finally {
  rmSync(tempBuildDir, { recursive: true, force: true });
}
