import { normalizePath } from './fs-scan';

export const CORE_RUNTIME_IDS = [
  'development',
  'web',
  'static-out',
  'android',
  'ios',
] as const;

export type CoreRuntimeId = (typeof CORE_RUNTIME_IDS)[number];
export type RuntimeId = CoreRuntimeId | 'services' | 'tooling';

export interface RuntimeDefinition {
  id: RuntimeId;
  name: string;
  summary: string;
  tags: string[];
  commandNames: string[];
  configPaths: string[];
}

export interface ArtifactDefinition {
  id: string;
  name: string;
  path?: string;
  summary: string;
  runtimeConsumers: RuntimeId[];
}

export const RUNTIME_DEFINITIONS: readonly RuntimeDefinition[] = [
  {
    id: 'development',
    name: 'Development',
    summary:
      'Next.js development runtime on port 3001; Capacitor can optionally live-reload from it through CAPACITOR_SERVER_URL.',
    tags: ['development', 'dev', 'next dev', 'port 3001', 'live reload', 'capacitor live reload'],
    commandNames: ['dev', 'dev:checked'],
    configPaths: ['next.config.ts', '.cursor/environment.json', 'capacitor.config.ts'],
  },
  {
    id: 'web',
    name: 'Web',
    summary:
      'Server-capable Next.js web application. Production builds produce .next and deployment may run on Vercel/serverless infrastructure.',
    tags: ['web', 'next.js', 'server', 'vercel', '.next', 'production web'],
    commandNames: ['build', 'start'],
    configPaths: ['next.config.ts', 'package.json', '.vercelignore'],
  },
  {
    id: 'static-out',
    name: 'Static out',
    summary:
      'Static Next.js export in out/. It has no bundled src/app/api handlers and must use a remote API base URL; it is the web payload copied into native shells.',
    tags: ['static', 'out', 'output export', 'ASOL_MODE=static', 'capacitor webDir', 'ota'],
    commandNames: ['build:static', 'build:static:local', 'preview:static', 'serve:out', 'serve:static'],
    configPaths: ['next.config.ts', 'capacitor.config.ts'],
  },
  {
    id: 'android',
    name: 'Android',
    summary:
      'Capacitor Android shell. Production consumes out/ as webDir and adds Android-native plugins, policies, resources, signing and store artifacts.',
    tags: ['android', 'capacitor', 'webview', 'apk', 'aab', 'google play', 'native'],
    commandNames: ['cap:prepare:android', 'cap:open:android', 'release:android', 'android:build:debug', 'android:build:signed'],
    configPaths: ['capacitor.config.ts', 'android/app/src/main/AndroidManifest.xml', 'android/gradle.properties'],
  },
  {
    id: 'ios',
    name: 'iOS',
    summary:
      'Capacitor iOS shell. Production consumes out/ as webDir and adds iOS-native plugins, entitlements, signing, archive and TestFlight/App Store behavior.',
    tags: ['ios', 'capacitor', 'wkwebview', 'xcode', 'testflight', 'app store', 'native'],
    commandNames: ['cap:open:ios', 'fastlane:ios:build', 'fastlane:ios:testflight'],
    configPaths: ['capacitor.config.ts', 'ios/App/App/Info.plist', 'ios/App/App/App.entitlements'],
  },
  {
    id: 'services',
    name: 'Independent services',
    summary:
      'Separately deployed service runtimes under services/*; they are not exercised by the root next start process.',
    tags: ['services', 'vercel services', 'serverless', 'notifications', 'products', 'orders', 'profiles', 'submain', 'sub2main'],
    commandNames: [],
    configPaths: [],
  },
  {
    id: 'tooling',
    name: 'Tooling',
    summary: 'Repository scripts, generators, validation, deployment orchestration and release tooling executed by Node/npm.',
    tags: ['tooling', 'scripts', 'node', 'npm', 'generation', 'validation'],
    commandNames: [],
    configPaths: ['package.json', 'tsconfig.json', 'eslint.config.js'],
  },
] as const;

export const ARTIFACT_DEFINITIONS: readonly ArtifactDefinition[] = [
  {
    id: 'next-server-build',
    name: 'Next server build (.next)',
    path: '.next',
    summary: 'Server-capable Next.js build output produced by npm run build and consumed by the web runtime.',
    runtimeConsumers: ['web'],
  },
  {
    id: 'static-out',
    name: 'Static export (out/)',
    path: 'out',
    summary: 'Release static web bundle produced by npm run build:static and consumed by static preview, Android and iOS.',
    runtimeConsumers: ['static-out', 'android', 'ios'],
  },
  {
    id: 'android-release',
    name: 'Android release package (APK/AAB)',
    summary: 'Android package/store artifact created from the Capacitor Android project after the static web payload is prepared.',
    runtimeConsumers: ['android'],
  },
  {
    id: 'ios-release',
    name: 'iOS archive/store artifact',
    summary: 'iOS archive/TestFlight/App Store artifact created from the Capacitor iOS project after the static web payload is prepared.',
    runtimeConsumers: ['ios'],
  },
] as const;

const CLIENT_RUNTIMES: RuntimeId[] = ['development', 'web', 'static-out', 'android', 'ios'];
const SERVER_RUNTIMES: RuntimeId[] = ['development', 'web'];

export function runtimeIdsForPath(pathInput: string, content = ''): RuntimeId[] {
  const path = normalizePath(pathInput);
  const ids = new Set<RuntimeId>();

  if (path.startsWith('android/')) ids.add('android');
  if (path.startsWith('ios/')) ids.add('ios');
  if (path.startsWith('fastlane/')) {
    ids.add('tooling');
    if (/android/i.test(path)) ids.add('android');
    else if (/ios/i.test(path)) ids.add('ios');
    else {
      ids.add('android');
      ids.add('ios');
    }
  }
  if (path.startsWith('services/')) ids.add('services');
  if (path.startsWith('scripts/')) ids.add('tooling');

  if (path === 'next.config.ts') {
    for (const id of CLIENT_RUNTIMES) ids.add(id);
  }
  if (path === 'capacitor.config.ts') {
    ids.add('development');
    ids.add('static-out');
    ids.add('android');
    ids.add('ios');
  }
  if (path === 'package.json') {
    for (const definition of RUNTIME_DEFINITIONS) ids.add(definition.id);
  }

  const isRouteHandler = /^src\/app\/(?:.*\/)?route\.[cm]?[jt]sx?$/.test(path) || path.startsWith('src/app/api/');
  const serverMarked =
    /(?:^|\/)(?:server|server-only)(?:\.|\/)/.test(path) ||
    /\.server\.[cm]?[jt]sx?$/.test(path) ||
    /(?:^|\n)\s*import\s+['"]server-only['"]/.test(content);

  if (isRouteHandler || serverMarked) {
    for (const id of SERVER_RUNTIMES) ids.add(id);
  } else if (path.startsWith('src/') || path.startsWith('packages/')) {
    for (const id of CLIENT_RUNTIMES) ids.add(id);
  }

  if (path.startsWith('packages/') && /\/scripts\//.test(path)) ids.add('tooling');
  return [...ids].sort();
}

export function runtimeIdsForCommand(commandName: string): RuntimeId[] {
  const ids = new Set<RuntimeId>();
  const name = commandName.toLowerCase();

  if (name === 'dev' || name === 'dev:checked') ids.add('development');
  if (name === 'build' || name === 'start' || name.startsWith('deploy:') || name.includes('vercel')) ids.add('web');
  if (name.includes('static') || name.includes('serve:out') || name.startsWith('ota:')) ids.add('static-out');
  if (name.startsWith('android:') || name.startsWith('fastlane:android:') || name === 'release:android' || name.endsWith(':android')) ids.add('android');
  if (name.startsWith('ios:') || name.startsWith('fastlane:ios:') || name.endsWith(':ios')) ids.add('ios');
  if (name.startsWith('cap:')) {
    ids.add('static-out');
    if (name.includes('android')) ids.add('android');
    else if (name.includes('ios')) ids.add('ios');
    else {
      ids.add('android');
      ids.add('ios');
    }
  }
  if (/^(notifications|products|orders|profiles|submain|sub2main):deploy$/.test(name)) ids.add('services');
  ids.add('tooling');
  return [...ids].sort();
}

export function artifactIdsProducedByCommand(commandName: string): string[] {
  const name = commandName.toLowerCase();
  const ids = new Set<string>();
  if (name === 'build') ids.add('next-server-build');
  if (name === 'build:static' || name === 'build:static:local') ids.add('static-out');
  if (
    name === 'release:android' ||
    name.startsWith('android:build:') ||
    name.startsWith('fastlane:android:aab') ||
    name.startsWith('fastlane:android:apk') ||
    name === 'fastlane:android:internal' ||
    name === 'fastlane:android:production'
  ) ids.add('android-release');
  if (name === 'fastlane:ios:build' || name === 'fastlane:ios:testflight') ids.add('ios-release');
  return [...ids].sort();
}
