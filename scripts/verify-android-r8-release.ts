import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { withoutVsCodeDebuggerEnv } from "./child-process-env";

const root = process.cwd();
const androidDirectory = path.join(root, "android");
const gradlePath = path.join(
  androidDirectory,
  process.platform === "win32" ? "gradlew.bat" : "gradlew",
);
const mappingDirectory = path.join(
  androidDirectory,
  "app",
  "build",
  "outputs",
  "mapping",
  "release",
);
const mappingPath = path.join(mappingDirectory, "mapping.txt");
const usagePath = path.join(mappingDirectory, "usage.txt");
const configurationPath = path.join(mappingDirectory, "configuration.txt");
const resourcesPath = path.join(mappingDirectory, "resources.txt");

if (process.platform === "win32") {
  execFileSync(
    process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe",
    ["/d", "/c", "gradlew.bat", ":app:minifyReleaseWithR8"],
    {
      cwd: androidDirectory,
      env: withoutVsCodeDebuggerEnv(process.env),
      stdio: "inherit",
    },
  );
} else {
  execFileSync(gradlePath, [":app:minifyReleaseWithR8"], {
    cwd: androidDirectory,
    env: withoutVsCodeDebuggerEnv(process.env),
    stdio: "inherit",
  });
}

for (const outputPath of [
  mappingPath,
  usagePath,
  configurationPath,
  resourcesPath,
]) {
  if (!existsSync(outputPath) || statSync(outputPath).size === 0) {
    throw new Error(`Expected non-empty R8 output is missing: ${outputPath}`);
  }
}

const mapping = readFileSync(mappingPath, "utf8");
const reflectionEntryPoints = [
  "hgh.asol.app.MainActivity",
  "hgh.asol.app.AppSettingsPlugin",
  "hgh.asol.app.BackgroundDownloadPlugin",
  "hgh.asol.app.ShareReceivePlugin",
  "hgh.asol.app.StorageCapacityPlugin",
  "com.capacitorjs.plugins.app.AppPlugin",
  "com.capacitorjs.plugins.camera.CameraPlugin",
  "com.capacitorjs.plugins.filesystem.FilesystemPlugin",
  "com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin",
  "app.capgo.speechrecognition.SpeechRecognitionPlugin",
];

for (const className of reflectionEntryPoints) {
  const preservedName = `${className} -> ${className}:`;
  if (!mapping.includes(preservedName)) {
    throw new Error(
      `R8 did not preserve the required reflected entry-point name: ${className}`,
    );
  }
}

console.log(
  `R8 release verification passed without packaging an APK/AAB. Mapping: ${path.relative(root, mappingPath)}; removed-code report: ${path.relative(root, usagePath)}; resource report: ${path.relative(root, resourcesPath)}.`,
);
