import { existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const sourcePath = path.join(root, 'assets', 'branding', 'asol-app-icon.png');
const white = { r: 255, g: 255, b: 255, alpha: 1 };
const ICON_ARTWORK_SCALE = 0.86;
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

async function normalizedArtwork(size: number): Promise<Buffer> {
  return sharp(sourcePath)
    .trim({ threshold: 10 })
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();
}

async function transparentIcon(size: number): Promise<Buffer> {
  const artworkSize = Math.round(size * ICON_ARTWORK_SCALE);
  const artwork = await normalizedArtwork(artworkSize);
  const offset = Math.floor((size - artworkSize) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: artwork, left: offset, top: offset }])
    .png()
    .toBuffer();
}

async function flatIcon(size: number): Promise<Buffer> {
  return sharp(await transparentIcon(size)).flatten({ background: white }).png().toBuffer();
}

async function adaptiveForeground(size: number): Promise<Buffer> {
  return transparentIcon(size);
}

async function launchCanvas(size: number, iconSize: number): Promise<Buffer> {
  const icon = await normalizedArtwork(iconSize);
  const offset = Math.floor((size - iconSize) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: white } })
    .composite([{ input: icon, left: offset, top: offset }])
    .png()
    .toBuffer();
}

async function generateWebAssets(): Promise<void> {
  await sharp(await transparentIcon(512)).toFile(path.join(root, 'public', 'logo.png'));
}

async function generateAndroidAssets(): Promise<void> {
  const resRoot = path.join(root, 'android', 'app', 'src', 'main', 'res');
  for (const [density, size] of Object.entries(androidLegacySizes)) {
    const directory = path.join(resRoot, `mipmap-${density}`);
    await sharp(await flatIcon(size)).toFile(path.join(directory, 'ic_launcher.png'));
    await sharp(await flatIcon(size)).toFile(path.join(directory, 'ic_launcher_round.png'));
  }
  for (const [density, size] of Object.entries(androidForegroundSizes)) {
    await sharp(await adaptiveForeground(size)).toFile(
      path.join(resRoot, `mipmap-${density}`, 'ic_launcher_foreground.png'),
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
  await sharp(await flatIcon(1024)).toFile(
    path.join(assetsRoot, 'AppIcon.appiconset', 'AppIcon-512@2x.png'),
  );

  const launch = await launchCanvas(2732, 420);
  for (const fileName of [
    'splash-2732x2732.png',
    'splash-2732x2732-1.png',
    'splash-2732x2732-2.png',
  ]) {
    await sharp(launch).toFile(path.join(assetsRoot, 'Splash.imageset', fileName));
  }
}

async function main(): Promise<void> {
  if (!existsSync(sourcePath)) throw new Error(`Branding SSOT not found: ${sourcePath}`);
  const metadata = await sharp(sourcePath).metadata();
  if (metadata.width !== metadata.height || (metadata.width ?? 0) < 500) {
    throw new Error('Branding SSOT must be a square PNG at least 500x500');
  }
  const stats = await sharp(sourcePath).ensureAlpha().stats();
  if (!metadata.hasAlpha || stats.isOpaque) {
    throw new Error('Branding SSOT must contain real transparent pixels');
  }
  const legacyPaths = forbiddenLegacyBrandingPaths.filter((relativePath) =>
    existsSync(path.join(root, relativePath)),
  );
  if (legacyPaths.length > 0) {
    throw new Error(`Legacy branding assets must be removed:\n${legacyPaths.join('\n')}`);
  }

  await Promise.all([generateWebAssets(), generateAndroidAssets(), generateIosAssets()]);
  console.log(`Branding assets generated from ${path.relative(root, sourcePath)}`);
}

main().catch((error) => {
  console.error(`Branding generation failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
