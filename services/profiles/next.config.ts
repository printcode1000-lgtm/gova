import type { NextConfig } from 'next';

/**
 * Build config for the profiles service.
 *
 * Deliberately minimal: this app serves read-only product APIs and no pages, so
 * its build touches no database at all. That is what lets the products Vercel
 * account hold the profile shards credentials and nothing else.
 */
const nextConfig: NextConfig = {
  turbopack: {
    // This folder is its own deployment root. Without pinning it, Next.js walks
    // up to the repository lockfile and infers the main app's directory instead.
    root: __dirname,

    resolveAlias: {
      // The shared data-access code keeps a local-SQLite branch for main-app
      // development. This deployment is Turso-only, so that branch is
      // unreachable — aliasing it avoids shipping a native module for code that
      // cannot run. See stubs/better-sqlite3.js.
      'better-sqlite3': './stubs/better-sqlite3.js',
    },
  },

  // Node.js-only package: let Node require() it at runtime instead of bundling
  // it, exactly as the main app does.
  serverExternalPackages: ['@libsql/client', 'drizzle-orm'],
  outputFileTracingIncludes: {
    '/*': ['./node_modules/drizzle-orm/libsql/**/*'],
  },
};

export default nextConfig;
