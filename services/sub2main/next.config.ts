import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
    resolveAlias: {
      'better-sqlite3': './stubs/better-sqlite3.js',
    },
  },
  serverExternalPackages: ['@libsql/client'],
};

export default nextConfig;
