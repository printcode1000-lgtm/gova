import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const PROHIBITED_FILE_NAMES = [
  ".env",
  ".env.local",
  "google-services.json",
  "firebase-admin.json",
];
const PROHIBITED_EXTENSIONS = [".db", ".sqlite", ".sqlite3"];
const PROHIBITED_DIRECTORIES = ["sync_data"];

function listFiles(root: string, current = root, result: string[] = []) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) listFiles(root, fullPath, result);
    else result.push(path.relative(root, fullPath).replace(/\\/g, "/"));
  }
  return result;
}

export function auditCapacitorDefaultBundle(
  outputDirectory = path.resolve("out"),
): void {
  const indexPath = path.join(outputDirectory, "index.html");
  const initPath = path.join(outputDirectory, "asol-app-init.js");
  if (!existsSync(indexPath) || !existsSync(initPath)) {
    throw new Error(
      "Capacitor defaults audit requires out/index.html and out/asol-app-init.js.",
    );
  }

  const index = readFileSync(indexPath, "utf8");
  const init = readFileSync(initPath, "utf8");
  const errors: string[] = [];

  if (!/<html[^>]*lang="ar"/.test(index)) {
    errors.push("index.html does not start with Arabic locale.");
  }
  if (!/<html[^>]*dir="rtl"/.test(index)) {
    errors.push("index.html does not start in RTL.");
  }
  if (!/<html[^>]*data-theme="light"/.test(index)) {
    errors.push("index.html does not start with the light theme.");
  }
  if (/<html[^>]*data-theme="dark"/.test(index)) {
    errors.push("index.html contains a dark initial theme.");
  }
  for (const required of [
    "setAttribute('data-theme','light')",
    "setAttribute('data-theme-mode','light')",
    "setAttribute('data-density','comfortable')",
    "setAttribute('data-high-contrast','false')",
  ]) {
    if (!init.includes(required)) {
      errors.push(`asol-app-init.js is missing ${required}.`);
    }
  }

  for (const relativePath of listFiles(outputDirectory)) {
    const segments = relativePath.toLowerCase().split("/");
    const fileName = segments.at(-1) ?? "";
    const extension = path.extname(fileName);
    if (PROHIBITED_FILE_NAMES.includes(fileName)) {
      errors.push(`private configuration entered the bundle: ${relativePath}`);
    }
    if (PROHIBITED_EXTENSIONS.includes(extension)) {
      errors.push(`database file entered the bundle: ${relativePath}`);
    }
    if (segments.some((segment) => PROHIBITED_DIRECTORIES.includes(segment))) {
      errors.push(`runtime data directory entered the bundle: ${relativePath}`);
    }
  }

  if (statSync(indexPath).size === 0 || statSync(initPath).size === 0) {
    errors.push("Capacitor initialization assets must not be empty.");
  }

  if (errors.length > 0) {
    throw new Error(
      `Capacitor default-state audit failed:\n${errors
        .map((error) => `- ${error}`)
        .join("\n")}`,
    );
  }

  console.log(
    "Capacitor defaults audit passed: fresh install is light, Arabic, RTL, logged out, and free of persisted data files.",
  );
}
