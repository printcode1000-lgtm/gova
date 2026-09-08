import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ['@libsql/client', 'drizzle-orm'],
  outputFileTracingIncludes: {
    '/*': ['./node_modules/drizzle-orm/libsql/**/*'],
  },
};

export default nextConfig;
