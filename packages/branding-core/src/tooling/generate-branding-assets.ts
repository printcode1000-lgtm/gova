import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const defaultWorkspaceRoot = path.resolve(packageRoot, "../..");

export const BRANDING_SOURCE_FILE = path.join(
  packageRoot,
  "assets",
  "asol-app-icon.png",
);

const ANDROID_ADAPTIVE_CONTENT_SCALE = 0.72;
const ANDROID_NOTIFICATION_CONTENT_SCALE = 0.8;
const IOS_NATIVE_LAUNCH_MARK_SCALE = 0.2;
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
const androidNotificationSizes = {
  mdpi: 24,
  hdpi: 36,
  xhdpi: 48,
  xxhdpi: 72,
  xxxhdpi: 96,
} as const;

const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
`;

const iosAppIconContents = `{
  "images" : [
    {
      "filename" : "AppIcon-512@2x.png",
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
`;

const iosSplashContents = `{
  "images" : [
    {
      "idiom" : "universal",
      "filename" : "splash-2732x2732-2.png",
      "scale" : "1x"
    },
    {
      "idiom" : "universal",
      "filename" : "splash-2732x2732-1.png",
      "scale" : "2x"
    },
    {
      "idiom" : "universal",
      "filename" : "splash-2732x2732.png",
      "scale" : "3x"
    }
  ],
  "info" : {
    "version" : 1,
    "author" : "xcode"
  }
}
`;

interface GenerationState {
  rewrittenCount: number;
}

function writeIfChanged(
  state: GenerationState,
  filePath: string,
  bytes: Buffer | string,
): void {
  const next = typeof bytes === "string" ? Buffer.from(bytes) : bytes;
  if (existsSync(filePath)) {
    try {
      if (readFileSync(filePath).equals(next)) return;
    } catch {
      // An unreadable generated target is replaced from the package SSOT.
    }
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, next);
  state.rewrittenCount += 1;
}

function removeGeneratedFile(state: GenerationState, filePath: string): void {
  if (!existsSync(filePath)) return;
  rmSync(filePath);
  state.rewrittenCount += 1;
}

async function resizedSource(size: number): Promise<Buffer> {
  return sharp(BRANDING_SOURCE_FILE)
    .resize(size, size, { fit: "fill" })
    .png()
    .toBuffer();
}

async function sourceBackgroundRgba(): Promise<{
  red: number;
  green: number;
  blue: number;
  alpha: number;
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

  return {
    red: pixel[0] ?? 255,
    green: pixel[1] ?? 255,
    blue: pixel[2] ?? 255,
    alpha: pixel[3] ?? 255,
  };
}

async function sourceBackgroundHex(): Promise<string> {
  const { red, green, blue, alpha } = await sourceBackgroundRgba();
  const channels = alpha < 128 ? [255, 255, 255] : [red, green, blue];
  return `#${channels
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

async function resizedOpaqueSource(size: number): Promise<Buffer> {
  const background = await sourceBackgroundHex();
  return sharp(BRANDING_SOURCE_FILE)
    .resize(size, size, { fit: "fill" })
    .flatten({ background })
    .png()
    .toBuffer();
}

async function androidAdaptiveForeground(size: number): Promise<Buffer> {
  const contentSize = Math.round(size * ANDROID_ADAPTIVE_CONTENT_SCALE);
  const leadingPadding = Math.floor((size - contentSize) / 2);
  const trailingPadding = size - contentSize - leadingPadding;
  const background = await sourceBackgroundHex();

  return sharp(BRANDING_SOURCE_FILE)
    .resize(contentSize, contentSize, { fit: "fill" })
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

/**
 * Android status icons and Web Push badges must be a white silhouette on
 * transparency. Branding art can use either a neutral field with a coloured
 * mark or a chromatic field with a neutral/white mark, so the generator picks
 * the silhouette polarity from the sampled source background.
 */
async function monochromeMark(
  size: number,
  contentScale: number,
): Promise<Buffer> {
  const contentSize = Math.max(1, Math.round(size * contentScale));
  const { data, info } = await sharp(BRANDING_SOURCE_FILE)
    .resize(contentSize, contentSize, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const silhouette = Buffer.alloc(info.width * info.height * 4);
  const background = await sourceBackgroundRgba();
  const backgroundChroma =
    Math.max(background.red, background.green, background.blue) -
    Math.min(background.red, background.green, background.blue);
  const neutralMarkOnChromaticField =
    background.alpha >= 128 && backgroundChroma >= 64;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const sourceAlpha = data[index + 3] ?? 0;
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    const markAlpha = neutralMarkOnChromaticField
      ? Math.min(
          sourceAlpha,
          Math.max(0, Math.min(255, (64 - chroma) * 4)),
          Math.max(0, Math.min(255, (luminance - 180) * 4)),
        )
      : Math.min(
          sourceAlpha,
          Math.max(0, Math.min(255, (chroma - 28) * 7)),
        );
    silhouette[index] = 255;
    silhouette[index + 1] = 255;
    silhouette[index + 2] = 255;
    silhouette[index + 3] = markAlpha;
  }

  const leadingPadding = Math.floor((size - contentSize) / 2);
  const trailingPadding = size - contentSize - leadingPadding;
  return sharp(silhouette, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extend({
      top: leadingPadding,
      bottom: trailingPadding,
      left: leadingPadding,
      right: trailingPadding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function nativeLaunchImage(size: number): Promise<Buffer> {
  const background = await sourceBackgroundHex();
  const mark = await monochromeMark(size, IOS_NATIVE_LAUNCH_MARK_SCALE);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: mark }])
    .flatten({ background })
    .removeAlpha()
    .png()
    .toBuffer();
}

function colorComponent(channel: number): string {
  return (channel / 255).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

async function syncIosLaunchStoryboardBackground(
  workspaceRoot: string,
  state: GenerationState,
): Promise<void> {
  const storyboardPath = path.join(
    workspaceRoot,
    "ios",
    "App",
    "App",
    "Base.lproj",
    "LaunchScreen.storyboard",
  );
  if (!existsSync(storyboardPath)) return;

  const { red, green, blue, alpha } = await sourceBackgroundRgba();
  const channels =
    alpha < 128
      ? { red: 255, green: 255, blue: 255 }
      : { red, green, blue };
  const backgroundColor =
    `                        <color key="backgroundColor" red="${colorComponent(channels.red)}" green="${colorComponent(channels.green)}" blue="${colorComponent(channels.blue)}" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>`;
  const source = readFileSync(storyboardPath, "utf8");
  const pattern = /^\s*<color key="backgroundColor"[^>]*\/>$/m;
  if (!pattern.test(source)) {
    throw new Error(
      "iOS LaunchScreen storyboard is missing the generated background color slot",
    );
  }
  const next = source.replace(pattern, backgroundColor);
  writeIfChanged(state, storyboardPath, next);
}

async function generateWebAssets(
  workspaceRoot: string,
  state: GenerationState,
): Promise<void> {
  writeIfChanged(
    state,
    path.join(workspaceRoot, "public", "logo.png"),
    readFileSync(BRANDING_SOURCE_FILE),
  );
  writeIfChanged(
    state,
    path.join(
      workspaceRoot,
      "public",
      "icons",
      "asol-app-icon-192.png",
    ),
    await resizedSource(192),
  );
  writeIfChanged(
    state,
    path.join(
      workspaceRoot,
      "public",
      "icons",
      "asol-notification-badge-96.png",
    ),
    await monochromeMark(96, ANDROID_NOTIFICATION_CONTENT_SCALE),
  );
}

async function generateAndroidAssets(
  workspaceRoot: string,
  state: GenerationState,
): Promise<void> {
  const appRes = path.join(
    workspaceRoot,
    "android",
    "app",
    "src",
    "main",
    "res",
  );
  const nativeRes = path.join(
    workspaceRoot,
    "packages",
    "native-core",
    "android",
    "src",
    "main",
    "res",
  );

  for (const [density, size] of Object.entries(androidLegacySizes)) {
    const directory = path.join(appRes, `mipmap-${density}`);
    const icon = await resizedSource(size);
    writeIfChanged(state, path.join(directory, "ic_launcher.png"), icon);
    writeIfChanged(state, path.join(directory, "ic_launcher_round.png"), icon);
  }

  for (const [density, size] of Object.entries(androidForegroundSizes)) {
    writeIfChanged(
      state,
      path.join(appRes, `mipmap-${density}`, "ic_launcher_foreground.png"),
      await androidAdaptiveForeground(size),
    );
    const monochrome = await monochromeMark(
      size,
      ANDROID_ADAPTIVE_CONTENT_SCALE,
    );
    writeIfChanged(
      state,
      path.join(appRes, `drawable-${density}`, "ic_launcher_monochrome.png"),
      monochrome,
    );
  }

  for (const [density, size] of Object.entries(androidNotificationSizes)) {
    const icon = await monochromeMark(
      size,
      ANDROID_NOTIFICATION_CONTENT_SCALE,
    );
    for (const resRoot of [appRes, nativeRes]) {
      writeIfChanged(
        state,
        path.join(
          resRoot,
          `drawable-${density}`,
          "ic_stat_asol_notification.png",
        ),
        icon,
      );
    }
  }

  const largeIcon = await resizedSource(256);
  for (const resRoot of [appRes, nativeRes]) {
    writeIfChanged(
      state,
      path.join(
        resRoot,
        "drawable-nodpi",
        "asol_notification_large_icon.png",
      ),
      largeIcon,
    );
    removeGeneratedFile(
      state,
      path.join(resRoot, "drawable", "ic_stat_asol_notification.xml"),
    );
  }

  const background = await sourceBackgroundHex();
  writeIfChanged(
    state,
    path.join(appRes, "values", "ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${background}</color>\n</resources>\n`,
  );
  for (const fileName of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
    writeIfChanged(
      state,
      path.join(appRes, "mipmap-anydpi-v26", fileName),
      adaptiveIconXml,
    );
  }

  for (const entry of readdirSync(appRes, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("drawable")) continue;
    removeGeneratedFile(state, path.join(appRes, entry.name, "splash.png"));
  }
}

async function generateIosAssets(
  workspaceRoot: string,
  state: GenerationState,
): Promise<void> {
  const assetsRoot = path.join(
    workspaceRoot,
    "ios",
    "App",
    "App",
    "Assets.xcassets",
  );
  const appIconRoot = path.join(assetsRoot, "AppIcon.appiconset");
  const splashRoot = path.join(assetsRoot, "Splash.imageset");
  writeIfChanged(
    state,
    path.join(appIconRoot, "AppIcon-512@2x.png"),
    await resizedOpaqueSource(1024),
  );
  writeIfChanged(
    state,
    path.join(appIconRoot, "Contents.json"),
    iosAppIconContents,
  );

  const launch = await nativeLaunchImage(2732);
  for (const fileName of [
    "splash-2732x2732.png",
    "splash-2732x2732-1.png",
    "splash-2732x2732-2.png",
  ]) {
    writeIfChanged(state, path.join(splashRoot, fileName), launch);
  }
  writeIfChanged(
    state,
    path.join(splashRoot, "Contents.json"),
    iosSplashContents,
  );
  await syncIosLaunchStoryboardBackground(workspaceRoot, state);
}

export async function generateBrandingAssets(
  workspaceRoot = defaultWorkspaceRoot,
): Promise<{ rewrittenCount: number }> {
  if (!existsSync(BRANDING_SOURCE_FILE)) {
    throw new Error(`Branding SSOT not found: ${BRANDING_SOURCE_FILE}`);
  }
  const metadata = await sharp(BRANDING_SOURCE_FILE).metadata();
  if (metadata.width !== metadata.height || (metadata.width ?? 0) < 500) {
    throw new Error("Branding SSOT must be a square PNG at least 500x500");
  }

  const forbiddenLegacyBrandingPaths = [
    "assets/branding/asol-app-icon.png",
    "public/gv_app_icon.png",
    "public/VERY GOOD.png",
    "public/images/logo.png",
    "public/images/icons",
    "public/images/logos",
  ];
  const legacyPaths = forbiddenLegacyBrandingPaths.filter((relativePath) =>
    existsSync(path.join(workspaceRoot, relativePath)),
  );
  if (legacyPaths.length > 0) {
    throw new Error(
      `Legacy branding assets must be removed:\n${legacyPaths.join("\n")}`,
    );
  }

  const state: GenerationState = { rewrittenCount: 0 };
  await Promise.all([
    generateWebAssets(workspaceRoot, state),
    generateAndroidAssets(workspaceRoot, state),
    generateIosAssets(workspaceRoot, state),
  ]);
  return state;
}
