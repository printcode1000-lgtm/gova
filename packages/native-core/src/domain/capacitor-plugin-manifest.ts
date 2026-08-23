import nativeCorePackage from "../../package.json";

/**
 * The Capacitor plugins this package owns.
 *
 * Capacitor discovers plugins by walking the root `package.json`. This project
 * declares them on `@asol/native-core` instead — rule 9 — so discovery finds
 * none, and `npx cap sync` regenerates `capacitor.settings.gradle` without them,
 * dropping every registration and failing the native compile.
 * `includePlugins` is Capacitor's own answer: an explicit allowlist.
 *
 * The list is derived here rather than in `capacitor.config.ts`, because the
 * knowledge of which plugins exist belongs to the package that declares them.
 * The config file previously reached in by relative path — a traversal the
 * package seal forbids everywhere else, and the only reason it survived is that
 * repository-root files were never scanned.
 */
const PLUGIN_SCOPES = /^(@capacitor|@capacitor-mlkit|@capawesome|@capgo)\//;

/** Platforms, the CLI and the runtime ship under a plugin scope but are not plugins. */
const NOT_PLUGINS = new Set([
  "@capacitor/android",
  "@capacitor/ios",
  "@capacitor/cli",
  "@capacitor/core",
]);

export const CAPACITOR_INCLUDE_PLUGINS: readonly string[] = Object.keys(
  nativeCorePackage.dependencies,
).filter((name) => PLUGIN_SCOPES.test(name) && !NOT_PLUGINS.has(name));
