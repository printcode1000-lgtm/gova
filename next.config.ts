import type { NextConfig } from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repositoryName = process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}` : '';

const isStatic = process.env.GOVA_MODE === 'static';
const basePath = process.env.GOVA_BASE_PATH?.replace(/\/$/, '') || (isGithubActions ? repositoryName : '');
const assetPrefix = basePath;

const apiBaseUrl =
  process.env.NEXT_PUBLIC_GOVA_API_BASE_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_GOVA_API_URL?.replace(/\/$/, '') ||
  process.env.GOVA_API_BASE_URL?.replace(/\/$/, '') ||
  '';

const nextConfig: NextConfig = {
  ...(isStatic ? { output: 'export' as const } : {}),
  ...(isStatic ? { trailingSlash: true } : {}),
  ...(basePath ? { basePath } : {}),
  ...(assetPrefix ? { assetPrefix } : {}),

  env: {
    NEXT_PUBLIC_GOVA_BASE_PATH: basePath,
    NEXT_PUBLIC_GOVA_API_BASE_URL: apiBaseUrl,
    NEXT_PUBLIC_GOVA_MODE: process.env.GOVA_MODE ?? '',
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
};

export default nextConfig;
