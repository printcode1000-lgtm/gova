import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import sharp from "sharp";

import {
  BRANDING_ANDROID_NOTIFICATION_COLOR,
  BRANDING_ANDROID_NOTIFICATION_LARGE_ICON,
  BRANDING_ANDROID_NOTIFICATION_SMALL_ICON,
  BRANDING_WEB_APP_ICON_PATH,
  BRANDING_WEB_BROWSER_ICON_PATH,
  BRANDING_WEB_PUSH_BADGE_PATH,
  BRANDING_WEB_PUSH_ICON_PATH,
} from "../index";
import {
  BRANDING_SOURCE_FILE,
  generateBrandingAssets,
} from "../tooling";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? filesBelow(target) : [target];
  });
}

async function assertPng(
  relativePath: string,
  width: number,
  height = width,
): Promise<void> {
  const metadata = await sharp(path.join(root, relativePath)).metadata();
  assert.equal(metadata.format, "png", `${relativePath} must be PNG`);
  assert.equal(metadata.width, width, `${relativePath} width`);
  assert.equal(metadata.height, height, `${relativePath} height`);
}

async function assertTransparentSilhouette(relativePath: string): Promise<void> {
  const imagePath = path.join(root, relativePath);
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  assert.equal(metadata.hasAlpha, true, `${relativePath} needs transparency`);
  const alpha = (await image.stats()).channels[3];
  assert.ok(alpha, `${relativePath} needs an alpha channel`);
  assert.equal(alpha.min, 0, `${relativePath} background must be transparent`);
  assert.equal(alpha.max, 255, `${relativePath} mark must be opaque`);
  const { data, info } = await sharp(imagePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let opaque = 0;
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] === 0) transparent += 1;
    if (data[index] === 255) opaque += 1;
  }
  const pixelCount = info.width * info.height;
  assert.ok(
    transparent / pixelCount > 0.7,
    `${relativePath} must not become an opaque status-bar square`,
  );
  assert.ok(
    opaque / pixelCount > 0.05,
    `${relativePath} must retain a visible ASOL silhouette`,
  );
}

async function main(): Promise<void> {
  assert.deepEqual(
    {
      web: BRANDING_WEB_APP_ICON_PATH,
      browser: BRANDING_WEB_BROWSER_ICON_PATH,
      push: BRANDING_WEB_PUSH_ICON_PATH,
      badge: BRANDING_WEB_PUSH_BADGE_PATH,
      androidSmall: BRANDING_ANDROID_NOTIFICATION_SMALL_ICON,
      androidLarge: BRANDING_ANDROID_NOTIFICATION_LARGE_ICON,
      androidColor: BRANDING_ANDROID_NOTIFICATION_COLOR,
    },
    {
      web: "/logo.png",
      browser: "/icons/asol-app-icon-192.png",
      push: "/icons/asol-app-icon-192.png",
      badge: "/icons/asol-notification-badge-96.png",
      androidSmall: "ic_stat_asol_notification",
      androidLarge: "asol_notification_large_icon",
      androidColor: "#006C4C",
    },
  );

  assert.equal(
    BRANDING_SOURCE_FILE,
    path.join(root, "packages", "branding-core", "assets", "asol-app-icon.png"),
  );
  assert.equal(
    existsSync(path.join(root, "assets", "branding", "asol-app-icon.png")),
    false,
    "the SSOT must live inside branding-core only",
  );
  assert.equal(
    existsSync(path.join(root, "scripts", "generate-branding-assets.ts")),
    false,
    "the generator must live inside branding-core only",
  );

  const generated = await generateBrandingAssets(root);
  assert.equal(
    generated.rewrittenCount,
    0,
    "committed generated assets must already match the package SSOT",
  );

  await assertPng("packages/branding-core/assets/asol-app-icon.png", 1024);
  await assertPng("public/logo.png", 1024);

  /**
   * The browser tab and `apple-touch-icon` are raw `<link>` tags: nothing
   * resizes them, so whatever `layout.tsx` names is downloaded verbatim on
   * first paint. Naming the 1024px original there shipped 593KB for a tab icon
   * on a phone-only application. The 192px asset is asserted to exist and to
   * stay small, and the layout is asserted to point at it — a constant nobody
   * reads would not have stopped the regression.
   */
  await assertPng("public/icons/asol-app-icon-192.png", 192);
  const browserIconBytes = statSync(
    path.join(root, "public", "icons", "asol-app-icon-192.png"),
  ).size;
  assert.ok(
    browserIconBytes < 120_000,
    `the browser icon must stay small; it is ${Math.round(browserIconBytes / 1024)}KB`,
  );

  const layoutSource = readFileSync(
    path.join(root, "src", "app", "layout.tsx"),
    "utf8",
  );
  assert.match(
    layoutSource,
    /icon: withBasePath\(BRANDING_WEB_BROWSER_ICON_PATH\)/,
    "the browser tab icon must not be the full-resolution original",
  );
  assert.match(
    layoutSource,
    /apple: withBasePath\(BRANDING_WEB_BROWSER_ICON_PATH\)/,
    "the apple-touch icon must not be the full-resolution original",
  );
  assert.deepEqual(
    readFileSync(BRANDING_SOURCE_FILE),
    readFileSync(path.join(root, "public", "logo.png")),
    "web logo must be a byte-for-byte SSOT copy",
  );
  await assertPng("public/icons/asol-app-icon-192.png", 192);
  await assertPng("public/icons/asol-notification-badge-96.png", 96);
  await assertTransparentSilhouette(
    "public/icons/asol-notification-badge-96.png",
  );

  for (const [density, size] of Object.entries({
    mdpi: 24,
    hdpi: 36,
    xhdpi: 48,
    xxhdpi: 72,
    xxxhdpi: 96,
  })) {
    const appIcon = `android/app/src/main/res/drawable-${density}/ic_stat_asol_notification.png`;
    const coreIcon = `packages/native-core/android/src/main/res/drawable-${density}/ic_stat_asol_notification.png`;
    await assertPng(appIcon, size);
    await assertTransparentSilhouette(appIcon);
    assert.deepEqual(
      readFileSync(path.join(root, appIcon)),
      readFileSync(path.join(root, coreIcon)),
      `${density} app and native-core notification icons must match`,
    );
  }
  for (const [density, size] of Object.entries({
    mdpi: 108,
    hdpi: 162,
    xhdpi: 216,
    xxhdpi: 324,
    xxxhdpi: 432,
  })) {
    const monochrome = `android/app/src/main/res/drawable-${density}/ic_launcher_monochrome.png`;
    await assertPng(monochrome, size);
    await assertTransparentSilhouette(monochrome);
  }

  await assertPng(
    "packages/native-core/android/src/main/res/drawable-nodpi/asol_notification_large_icon.png",
    256,
  );
  assert.match(
    read("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml"),
    /<monochrome android:drawable="@drawable\/ic_launcher_monochrome"\/>/,
  );
  assert.match(
    read("android/app/src/main/AndroidManifest.xml"),
    /default_notification_icon"[\s\S]*?@drawable\/ic_stat_asol_notification/,
  );
  const nativeReceiver = read(
    "packages/native-core/android/src/main/java/hgh/asol/app/AsolPushMessagingService.java",
  );
  assert.match(
    nativeReceiver,
    /setSmallIcon\(R\.drawable\.ic_stat_asol_notification\)/,
  );
  assert.match(
    nativeReceiver,
    /setLargeIcon\(appIcon\)/,
    "expanded Android notifications must show the full-colour app icon",
  );
  assert.match(
    read("capacitor.config.ts"),
    /smallIcon: BRANDING_ANDROID_NOTIFICATION_SMALL_ICON/,
    "Capacitor local notifications must use the generated status icon",
  );
  for (const transport of [
    "packages/notifications-core/src/services/providers/fcm-notification-provider.server.ts",
    "packages/account-bridge/src/mobile-push/fcm-message.ts",
  ]) {
    const source = read(transport);
    assert.match(source, /BRANDING_ANDROID_NOTIFICATION_SMALL_ICON/);
    assert.match(source, /BRANDING_ANDROID_NOTIFICATION_COLOR/);
    assert.doesNotMatch(
      source,
      /icon:\s*["']ic_stat_asol_notification["']/,
      `${transport} must not duplicate branding resource names`,
    );
  }

  await assertPng(
    "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
    1024,
  );
  assert.match(
    read("ios/App/App.xcodeproj/project.pbxproj"),
    /ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;/,
    "iOS notifications inherit the signed application's generated AppIcon",
  );
  const worker = read("packages/data-core/src/browser/workers/asol-push-sw.js");
  assert.match(worker, /'icons\/asol-app-icon-192\.png'/);
  assert.match(worker, /'icons\/asol-notification-badge-96\.png'/);
  assert.match(
    worker,
    /new URL\([\s\S]*?self\.registration\.scope/,
    "Web Push icons must resolve inside the active service-worker scope",
  );

  const rootPackage = JSON.parse(read("package.json")) as {
    scripts: Record<string, string>;
  };
  assert.equal(
    rootPackage.scripts.dev,
    "next dev --turbo --port 3001",
    "the fast dev command must stay unchanged",
  );
  assert.equal(
    rootPackage.scripts["branding:generate"],
    "npx tsx packages/branding-core/src/cli.ts",
  );
  assert.equal(
    JSON.parse(
      read("packages/google-play-store-assets-core/package.json"),
    ).name,
    "@asol/google-play-store-assets-core",
    "Play Store asset validation remains a separate package",
  );

  const packageSource = filesBelow(path.join(root, "packages", "branding-core", "src"))
    .filter(
      (file) =>
        /\.(ts|tsx)$/.test(file) &&
        !file.includes(`${path.sep}tests${path.sep}`),
    )
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  assert.doesNotMatch(packageSource, /@\/|@asol\/(?!branding-core)/);

  console.log("branding-core tests passed.");
}

void main();
