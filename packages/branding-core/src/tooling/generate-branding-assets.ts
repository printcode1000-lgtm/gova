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

async function sourceBackgroundHex(): Promise<string> {
  const pixel = await sharp(BRANDING_SOURCE_FILE)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();
  return `#${[pixel[0] ?? 255, pixel[1] ?? 255, pixel[2] ?? 255]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
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
 * transparency. The SSOT has an opaque pale background, so alpha cannot be
 * reused; chroma separates the coloured ASOL mark from that neutral field.
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

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    const alpha = Math.max(0, Math.min(255, (chroma - 28) * 7));
    silhouette[index] = 255;
    silhouette[index + 1] = 255;
    silhouette[index + 2] = 255;
    silhouette[index + 3] = alpha;
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
    await resizedSource(1024),
  );
  writeIfChanged(
    state,
    path.join(appIconRoot, "Contents.json"),
    iosAppIconContents,
  );

  const launch = await resizedSource(2732);
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
