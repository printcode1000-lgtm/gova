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

/**
 * The native store shells are not on every machine that runs this suite.
 *
 * `.vercelignore` keeps `/android/` and `/ios/` out of the upload on purpose —
 * they are store shells rebuilt by the Capacitor pipeline, not inputs to the
 * hosted build. Reading them unconditionally failed `npm run build` on Vercel
 * with `ENOENT: android/app/src/main/AndroidManifest.xml`, which took the whole
 * production deployment of the main app down on a machine where nothing was
 * wrong.
 *
 * The generated sources under `packages/native-core/**` are always present and
 * are still asserted unconditionally; only the shell copies are conditional, and
 * the skips are printed so a shell that vanishes locally stays visible.
 */
const skippedNativeShellChecks: string[] = [];

function nativeShellPresent(relativePath: string): boolean {
  if (existsSync(path.join(root, relativePath))) return true;
  skippedNativeShellChecks.push(relativePath);
  return false;
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

async function assertOpaquePng(
  relativePath: string,
  width: number,
  height = width,
): Promise<void> {
  await assertPng(relativePath, width, height);
  const metadata = await sharp(path.join(root, relativePath)).metadata();
  assert.equal(metadata.hasAlpha, false, `${relativePath} must not contain alpha`);
}

async function sourceBackgroundRgb(): Promise<{
  red: number;
  green: number;
  blue: number;
}> {
  const metadata = await sharp(BRANDING_SOURCE_FILE).metadata();
  const width = Math.max(1, metadata.width ?? 1);
  const height = Math.max(1, metadata.height ?? 1);
  const pixel = await sharp(BRANDING_SOURCE_FILE)
    .extract({
      left: Math.min(width - 1, Math.floor(width * 0.1)),
      top: Math.min(height - 1, Math.floor(height * 0.1)),
      width: 1,
      height: 1,
    })
    .ensureAlpha()
    .raw()
    .toBuffer();
  if ((pixel[3] ?? 0) < 128) return { red: 255, green: 255, blue: 255 };
  return {
    red: pixel[0] ?? 255,
    green: pixel[1] ?? 255,
    blue: pixel[2] ?? 255,
  };
}

async function assertNativeLaunchImage(
  relativePath: string,
  size: number,
): Promise<void> {
  await assertOpaquePng(relativePath, size);
  const expectedBackground = await sourceBackgroundRgb();
  const { data, info } = await sharp(path.join(root, relativePath))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  let backgroundPixels = 0;
  let whitePixels = 0;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const alpha = data[index + 3] ?? 0;
    if (
      red === expectedBackground.red &&
      green === expectedBackground.green &&
      blue === expectedBackground.blue &&
      alpha === 255
    ) {
      backgroundPixels += 1;
    }
    if (red > 245 && green > 245 && blue > 245 && alpha === 255) {
      whitePixels += 1;
    }
  }
  const center = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * 4;
  assert.deepEqual(
    [data[0], data[1], data[2], data[3]],
    [
      expectedBackground.red,
      expectedBackground.green,
      expectedBackground.blue,
      255,
    ],
    `${relativePath} corner must match the SSOT background`,
  );
  assert.ok(
    backgroundPixels / pixelCount > 0.9,
    `${relativePath} must be the SSOT background with only the white mark visible`,
  );
  assert.ok(
    whitePixels / pixelCount > 0.005 && whitePixels / pixelCount < 0.05,
    `${relativePath} must contain a centered white launch mark without the full icon tile`,
  );
  assert.ok(
    (data[center] ?? 0) > 245 &&
      (data[center + 1] ?? 0) > 245 &&
      (data[center + 2] ?? 0) > 245,
    `${relativePath} launch mark must remain centered`,
  );
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

  const launchBackground = await sourceBackgroundRgb();
  const launchBackgroundHex = `#${[
    launchBackground.red,
    launchBackground.green,
    launchBackground.blue,
  ]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

  if (nativeShellPresent("android/app/src/main/res/values/styles.xml")) {
    const launchStyles = read("android/app/src/main/res/values/styles.xml");
    assert.match(
      launchStyles,
      /windowSplashScreenBackground">\s*@color\/ic_launcher_background/,
      "Android native launch must use the SSOT-derived background",
    );
    assert.match(
      launchStyles,
      /windowSplashScreenAnimatedIcon">\s*@drawable\/ic_launcher_monochrome/,
      "Android native launch must show only the transparent white SSOT mark",
    );
    assert.doesNotMatch(
      launchStyles,
      /windowSplashScreenAnimatedIcon">\s*@mipmap\/ic_launcher_foreground/,
      "Android native launch must not show the full adaptive icon tile",
    );
  }
  if (nativeShellPresent("android/app/src/main/res/values/ic_launcher_background.xml")) {
    assert.match(
      read("android/app/src/main/res/values/ic_launcher_background.xml"),
      new RegExp(`<color name="ic_launcher_background">${launchBackgroundHex}</color>`),
      "Android native launch background must match the icon background",
    );
  }
  if (nativeShellPresent("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml")) {
    assert.match(
      read("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml"),
      /<monochrome android:drawable="@drawable\/ic_launcher_monochrome"\/>/,
    );
  }
  if (nativeShellPresent("android/app/src/main/AndroidManifest.xml")) {
    const androidManifest = read("android/app/src/main/AndroidManifest.xml");
    assert.match(
      androidManifest,
      /<activity[\s\S]*?android:name="\.MainActivity"[\s\S]*?android:theme="@style\/AppTheme\.NoActionBarLaunch"/,
      "Android MainActivity must enter through the native launch theme before the WebView",
    );
    assert.match(
      androidManifest,
      /default_notification_icon"[\s\S]*?@drawable\/ic_stat_asol_notification/,
    );
  }
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

  if (nativeShellPresent("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")) {
    await assertOpaquePng(
      "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
      1024,
    );
  }
  if (nativeShellPresent("ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png")) {
    for (const fileName of [
      "splash-2732x2732.png",
      "splash-2732x2732-1.png",
      "splash-2732x2732-2.png",
    ]) {
      await assertNativeLaunchImage(
        `ios/App/App/Assets.xcassets/Splash.imageset/${fileName}`,
        2732,
      );
    }
  }
  if (nativeShellPresent("ios/App/App/Base.lproj/LaunchScreen.storyboard")) {
    const launchStoryboard = read("ios/App/App/Base.lproj/LaunchScreen.storyboard");
    assert.match(
      launchStoryboard,
      /<imageView[^>]*contentMode="scaleAspectFill"[^>]*image="Splash"/,
      "iOS must use the generated full-frame native launch artwork before WebView startup",
    );
    assert.doesNotMatch(
      launchStoryboard,
      /systemBackgroundColor/,
      "iOS native launch must not fall back to a white system background",
    );
    const color = /<color key="backgroundColor" red="([^"]+)" green="([^"]+)" blue="([^"]+)" alpha="1"/.exec(
      launchStoryboard,
    );
    assert.ok(color, "iOS LaunchScreen must pin the SSOT-derived background colour");
    assert.ok(
      Math.abs(Number(color[1]) - launchBackground.red / 255) < 0.000001 &&
        Math.abs(Number(color[2]) - launchBackground.green / 255) < 0.000001 &&
        Math.abs(Number(color[3]) - launchBackground.blue / 255) < 0.000001,
      "iOS LaunchScreen background must match the icon background",
    );
  }
  if (nativeShellPresent("ios/App/App/Info.plist")) {
    assert.match(
      read("ios/App/App/Info.plist"),
      /<key>UILaunchStoryboardName<\/key>\s*<string>LaunchScreen<\/string>/,
      "iOS must launch through the native LaunchScreen storyboard before the WebView",
    );
  }
  if (nativeShellPresent("ios/App/App.xcodeproj/project.pbxproj")) {
    assert.match(
      read("ios/App/App.xcodeproj/project.pbxproj"),
      /ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;/,
      "iOS notifications inherit the signed application's generated AppIcon",
    );
  }
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
    "cross-env GOVA_DEV_PORT=3001 npx tsx scripts/dev-simulation.ts",
    "the canonical dev command must keep the simulation runtime wrapper",
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

  if (skippedNativeShellChecks.length > 0) {
  console.log(
    `branding-core: skipped ${skippedNativeShellChecks.length} native shell check(s) not on disk (android/ and ios/ are excluded from hosted builds): ${skippedNativeShellChecks.join(", ")}`,
  );
}

console.log("branding-core tests passed.");
}

void main();
