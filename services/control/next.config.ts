import type { NextConfig } from 'next';

/**
 * Build config for the control service.
 *
 * Control is the operational runtime: Super Admin server operations, System
 * Logs, OTA administration, build and release jobs, and production deployment
 * authority. It has no pages and no client bundle to speak of, and it is the
 * only runtime holding deployment authority — which is why it is a separate
 * deployment rather than a route family inside the application.
 */
const nextConfig: NextConfig = {
  turbopack: {
    // This folder is its own deployment root. Without pinning it, Next.js walks
    // up to the repository lockfile and infers the main app's directory instead.
    root: __dirname,
  },

  // Node.js-only packages: let Node require() them at runtime instead of
  // bundling them, exactly as the main app does. `better-sqlite3` is not stubbed
  // here the way it is in the notifications service: the System Logs adapter
  // reaches the same profile-shard client the application uses, and stubbing a
  // branch this deployment can take would fail at runtime rather than at build.
  serverExternalPackages: ['@libsql/client', 'better-sqlite3', 'drizzle-orm'],
  outputFileTracingIncludes: {
    '/*': ['./node_modules/drizzle-orm/libsql/**/*'],
  },
};

export default nextConfig;
