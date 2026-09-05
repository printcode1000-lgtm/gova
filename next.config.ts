import type { NextConfig } from 'next';

import { API_BASE_URL } from '@asol/native-core';
import {
  BROWSER_REQUEST_HEADERS,
  anyOrigin,
  createCorsPolicy,
  resolveCorsHeaders,
} from '@asol/cors';
import {
  CURRENT_NATIVE_APP_VERSION,
  CURRENT_WEB_CONTENT_VERSION,
} from './src/core/config/app-version';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repositoryName = process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}` : '';

const isStatic = process.env.ASOL_MODE === 'static';
const isGovaUploadView = process.env.ASOL_GOVA_UPLOAD_VIEW === '1';
const basePath = process.env.ASOL_BASE_PATH?.replace(/\/$/, '') || (isGithubActions && isStatic ? repositoryName : '');
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
  // The gova upload has no database capability, and adding these files to every
  // frontend route would make its minimal artifact carry a backend driver.
  ...(isGovaUploadView
    ? {}
    : {
        serverExternalPackages: ['@libsql/client', 'better-sqlite3', 'drizzle-orm'],
        outputFileTracingIncludes: {
          '/*': ['./node_modules/drizzle-orm/libsql/**/*'],
        },
      }),

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
    // `next/image` remains the rendering component, but ASOL never routes images
    // through the Next.js Image Optimizer (`/_next/image`) in any runtime.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.1.2'],
  /**
   * The static CORS envelope for the public bytes this deployment serves.
   *
   * `@asol/cors` owns the header names and the values; this table only states the policy — public
   * bytes, no credentials, and the one request-header list every ASOL surface answers with, so a
   * client cannot be preflight-rejected here for a header another origin accepts.
   *
   * `/api/*` is excluded, and the exclusion is the whole point of the pattern. This table is
   * static: it cannot see the request's origin, so it can only ever answer `*`. When it covered
   * every path, an API request from an origin the boundary had *refused* still went out carrying
   * `Access-Control-Allow-Origin: *` — the middleware declined to name the origin, and this entry
   * granted it anyway. The refusal never reached the browser, and the exact allow-list in
   * `src/proxy.ts` was decorative for as long as the two overlapped.
   *
   * So the API surface is governed by `src/proxy.ts` alone, which reads the request and answers
   * from the same `@asol/cors` policy. Pages and assets keep the wildcard: they are public bytes
   * with no session and no credentials, and a native shell on `capacitor://localhost` has to be
   * able to read them.
   */
  async headers() {
    const policy = createCorsPolicy({
      origins: anyOrigin(),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: BROWSER_REQUEST_HEADERS,
      maxAgeSeconds: null,
    });
    return [
      {
        source: '/((?!api/).*)',
        headers: Object.entries(resolveCorsHeaders(policy)).map(([key, value]) => ({ key, value })),
      },
    ];
  },
};

export default nextConfig;
