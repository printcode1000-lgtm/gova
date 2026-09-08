import type { NextConfig } from 'next';

/**
 * Build config for the notifications service.
 *
 * Deliberately minimal: this app has exactly two routes and no pages, so it
 * never needs the users, product, advertisements, or shard databases at build
 * time. That is what lets the notifications Vercel account hold nothing but its
 * own credentials.
 */
const nextConfig: NextConfig = {
  turbopack: {
    // This folder is its own deployment root. Without pinning it, Next.js walks
    // up to the repository lockfile and infers the main app's directory instead.
    root: __dirname,

  },

  // Node.js-only package: let Node require() it at runtime instead of bundling
  // it, exactly as the main app does.
  serverExternalPackages: ['@libsql/client', 'drizzle-orm'],
  outputFileTracingIncludes: {
    '/*': ['./node_modules/drizzle-orm/libsql/**/*'],
  },
};

export default nextConfig;
