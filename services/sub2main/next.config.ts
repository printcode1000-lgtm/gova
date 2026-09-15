import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ['@libsql/client'],
  outputFileTracingIncludes: {
  },
};

export default nextConfig;
