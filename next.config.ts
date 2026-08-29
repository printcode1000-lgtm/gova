import type { NextConfig } from 'next';

import { API_BASE_URL } from '@asol/native-core';
import { BROWSER_REQUEST_HEADERS } from '@asol/service-runtime-core';
import {
  CURRENT_NATIVE_APP_VERSION,
  CURRENT_WEB_CONTENT_VERSION,
} from './src/core/config/app-version';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repositoryName = process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}` : '';

const isStatic = process.env.ASOL_MODE === 'static';
const basePath = process.env.ASOL_BASE_PATH?.replace(/\/$/, '') || (isGithubActions ? repositoryName : '');
const assetPrefix = basePath;
const deterministicBuildId = process.env.ASOL_NEXT_BUILD_ID;

/**
 * A static export never ships the `app/api` routes (`build-static.ts` strips
 * them), so an empty base URL makes the client fall back to its own origin —
 * `https://localhost` inside the Android WebView — and every API call, login
 * included, is answered by the bundled assets instead of the server. Static
 * builds therefore fall back to the same host the native shell defaults to.
 */
const apiBaseUrl =
  process.env.NEXT_PUBLIC_ASOL_API_BASE_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_ASOL_API_URL?.replace(/\/$/, '') ||
  process.env.ASOL_API_BASE_URL?.replace(/\/$/, '') ||
  (isStatic ? API_BASE_URL.replace(/\/$/, '') : '');

const nextConfig: NextConfig = {
  ...(isStatic ? { output: 'export' as const } : {}),
  ...(isStatic ? { trailingSlash: true } : {}),
  ...(basePath ? { basePath } : {}),
  ...(assetPrefix ? { assetPrefix } : {}),
  ...(deterministicBuildId
    ? { generateBuildId: async () => deterministicBuildId }
    : {}),

  env: {
    NEXT_PUBLIC_ASOL_BASE_PATH: basePath,
    NEXT_PUBLIC_ASOL_API_BASE_URL: apiBaseUrl,
    NEXT_PUBLIC_ASOL_MODE: process.env.ASOL_MODE ?? '',
    NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL: process.env.NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL ?? '',
    NEXT_PUBLIC_ASOL_OTA_PUBLIC_KEY: process.env.NEXT_PUBLIC_ASOL_OTA_PUBLIC_KEY ?? '',
    NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION:
      process.env.NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION ?? CURRENT_WEB_CONTENT_VERSION,
    NEXT_PUBLIC_ASOL_NATIVE_VERSION:
      process.env.NEXT_PUBLIC_ASOL_NATIVE_VERSION ?? CURRENT_NATIVE_APP_VERSION,
  },

  // Node.js-only packages. Prevent Next.js from bundling them — let Node require()
  // them at runtime. `drizzle-orm` stays external; Turso adapters import through
  // `drizzle-libsql.server.ts` so Next file tracing ships `drizzle-orm/libsql`.
  serverExternalPackages: ['@libsql/client', 'better-sqlite3', 'drizzle-orm'],
  outputFileTracingIncludes: {
    '/*': ['./node_modules/drizzle-orm/libsql/**/*'],
  },

  /**
   * The release console reads build artifacts off the local filesystem, so Next
   * traces it as "might read anything" and sweeps the repository into the
   * function: 362MB across 8804 files, against Vercel's 250MB limit. It failed
   * every production deployment of the main app with
   * `BUILD_UTILS_SPAWN_1` on
   * `api/super-admin/build-jobs/[jobId]/artifacts/[name]/analysis`.
   *
   * Nothing here is needed at runtime. Every one of these routes calls
   * `assertGooglePlayConsoleAllowed()`, which throws
   * `googlePlayConsoleDevelopmentOnly` outside a local development runtime — a
   * deployment has no Android build artifacts to analyse in the first place.
   * Excluding the payload keeps the guard's honest refusal and drops the weight.
   *
   * Static assets are excluded, never code: `out/` and `public/` are served by
   * the CDN, `ios/` and `android/` are native shells, and `test_profile/` is a
   * gitignored local Chrome profile that has no business in a build at all.
   */
  outputFileTracingExcludes: {
    // Same reasoning for the Play store-asset routes: they read and write files
    // under `assets/google-play/`, so the tracer cannot bound them either and
    // swept the same 362MB in. Neither family can need a browser profile, a
    // static export, or a native shell at runtime.
    '/api/super-admin/google-play-store-assets/**': [
      './test_profile/**',
      './out/**',
      './ios/**',
      './android/**',
      './public/**',
    ],
    '/api/super-admin/build-jobs/**': [
      './test_profile/**',
      './out/**',
      './ios/**',
      './android/**',
      './public/**',
    ],
  },

  images: {
    unoptimized: isStatic,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  allowedDevOrigins: ['localhost', '127.0.0.1'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          {
            // The one list every ASOL surface answers with; src/proxy.ts overrides
            // this entry for /api/* with the same constant.
            key: 'Access-Control-Allow-Headers',
            value: BROWSER_REQUEST_HEADERS,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
