import type { NextConfig } from 'next';

const isStatic = process.env.GOVA_MODE === 'static';
const basePath = process.env.GOVA_BASE_PATH?.replace(/\/$/, '') ?? '';

const nextConfig: NextConfig = {
  ...(isStatic ? { output: 'export' as const } : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),

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
