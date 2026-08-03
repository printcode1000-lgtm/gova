import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const sourcePath = path.join(root, 'assets', 'branding', 'asol-app-icon.png');
const ANDROID_ADAPTIVE_CONTENT_SCALE = 0.72;
const forbiddenLegacyBrandingPaths = [
  'public/gv_app_icon.png',
  'public/VERY GOOD.png',
  'public/images/logo.png',
  'public/images/icons',
  'public/images/logos',
] as const;

const androidLegacySizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
} as const;

const androidForegroundSizes = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
} as const;

let rewrittenCount = 0;

/**
 * Write only when the bytes actually change.
 *
 * `build:static` regenerates branding on every run, including every OTA
 * publication, and it writes into `android/` and `ios/`. An unconditional write
 * would dirty the native tree on each publish; once committed, the OTA
 * native-compatibility gate would then refuse the *next* publication because
 * "the native shell changed" — for nothing but a re-encode of the same icon.
 * Keeping the write conditional keeps a pure web release a pure web release.
 */
function writeIfChanged(filePath: string, bytes: Buffer): void {
  if (existsSync(filePath)) {
    try {
      if (readFileSync(filePath).equals(bytes)) return;
    } catch {
      // Unreadable target: fall through and rewrite it.
    }
  }
  writeFileSync(filePath, bytes);
  rewrittenCount += 1;
}

async function resizedSource(size: number): Promise<Buffer> {
  return sharp(sourcePath)
    .resize(size, size, { fit: 'fill' })
    .png()
    .toBuffer();
}

async function androidAdaptiveForeground(size: number): Promise<Buffer> {
  const contentSize = Math.round(size * ANDROID_ADAPTIVE_CONTENT_SCALE);
  const leadingPadding = Math.floor((size - contentSize) / 2);
  const trailingPadding = size - contentSize - leadingPadding;
  const cornerPixel = await sharp(sourcePath)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();
  const background = {
    r: cornerPixel[0] ?? 255,
    g: cornerPixel[1] ?? 255,
    b: cornerPixel[2] ?? 255,
    alpha: 1,
  };

  return sharp(sourcePath)
    .resize(contentSize, contentSize, { fit: 'fill' })
    .extend({
      top: leadingPadding,
      bottom: trailingPadding,
      left: leadingPadding,
      right: trailingPadding,
      background,
    })
    .png()
    .toBuffer();
}

async function generateWebAssets(): Promise<void> {
  writeIfChanged(path.join(root, 'public', 'logo.png'), readFileSync(sourcePath));
}

async function generateAndroidAssets(): Promise<void> {
  const resRoot = path.join(root, 'android', 'app', 'src', 'main', 'res');
  for (const [density, size] of Object.entries(androidLegacySizes)) {
    const directory = path.join(resRoot, `mipmap-${density}`);
    mkdirSync(directory, { recursive: true });
    const icon = await sharp(await resizedSource(size)).png().toBuffer();
    writeIfChanged(path.join(directory, 'ic_launcher.png'), icon);
    writeIfChanged(path.join(directory, 'ic_launcher_round.png'), icon);
  }
  for (const [density, size] of Object.entries(androidForegroundSizes)) {
    const directory = path.join(resRoot, `mipmap-${density}`);
    mkdirSync(directory, { recursive: true });
    writeIfChanged(
      path.join(directory, 'ic_launcher_foreground.png'),
      await sharp(await androidAdaptiveForeground(size)).png().toBuffer(),
    );
  }

  for (const entry of readdirSync(resRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('drawable')) continue;
    const legacySplash = path.join(resRoot, entry.name, 'splash.png');
    if (existsSync(legacySplash)) rmSync(legacySplash);
  }
}

async function generateIosAssets(): Promise<void> {
  const assetsRoot = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets');
  const appIconRoot = path.join(assetsRoot, 'AppIcon.appiconset');
  const splashRoot = path.join(assetsRoot, 'Splash.imageset');
  mkdirSync(appIconRoot, { recursive: true });
  mkdirSync(splashRoot, { recursive: true });
  writeIfChanged(
    path.join(appIconRoot, 'AppIcon-512@2x.png'),
    await sharp(await resizedSource(1024)).png().toBuffer(),
  );

  const launch = await sharp(await resizedSource(2732)).png().toBuffer();
  for (const fileName of [
    'splash-2732x2732.png',
    'splash-2732x2732-1.png',
    'splash-2732x2732-2.png',
  ]) {
    writeIfChanged(path.join(splashRoot, fileName), launch);
  }
}

async function main(): Promise<void> {
  if (!existsSync(sourcePath)) throw new Error(`Branding SSOT not found: ${sourcePath}`);
  const metadata = await sharp(sourcePath).metadata();
  if (metadata.width !== metadata.height || (metadata.width ?? 0) < 500) {
    throw new Error('Branding SSOT must be a square PNG at least 500x500');
  }
  const legacyPaths = forbiddenLegacyBrandingPaths.filter((relativePath) =>
    existsSync(path.join(root, relativePath)),
  );
  if (legacyPaths.length > 0) {
    throw new Error(`Legacy branding assets must be removed:\n${legacyPaths.join('\n')}`);
  }

  await Promise.all([generateWebAssets(), generateAndroidAssets(), generateIosAssets()]);
  console.log(
    rewrittenCount === 0
      ? `Branding assets already match ${path.relative(root, sourcePath)}; nothing rewritten.`
      : `Branding assets generated from ${path.relative(root, sourcePath)} (${rewrittenCount} file(s) rewritten).`,
  );
}

main().catch((error) => {
  console.error(`Branding generation failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
