import type { NextConfig } from 'next';

import { CAPACITOR_API_BASE_URL } from './platform/capacitor.defaults';
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
  (isStatic ? CAPACITOR_API_BASE_URL.replace(/\/$/, '') : '');

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

  // These are Node.js-only packages. Prevent Next.js from bundling them
  // through the client-side (or edge) bundler — let Node require() them at runtime.
  serverExternalPackages: ['@libsql/client', 'better-sqlite3'],

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
            // Keep in sync with ALLOWED_REQUEST_HEADERS in src/proxy.ts,
            // which overrides this for /api/*.
            key: 'Access-Control-Allow-Headers',
            value:
              'Content-Type, Authorization, Accept, X-Asol-Session-Token, X-Asol-Trace-Id',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
