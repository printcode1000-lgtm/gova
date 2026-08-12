import { getCorsOrigins } from '@/core/config/server-env.values';
import type { R2CorsRule } from './r2.types';

/** Full browser upload CORS policy derived from ASOL_CORS_ORIGINS (or dev defaults). */
export function buildDefaultR2CorsRules(): R2CorsRule[] {
  return [
    {
      id: 'asol-browser-upload',
      allowed: {
        origins: getCorsOrigins(),
        methods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        headers: ['*'],
      },
      exposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
      maxAgeSeconds: 3600,
    },
  ];
}

/** Build a public URL for an object key using the configured R2 public dev URL. */
export function buildR2PublicObjectUrl(publicBaseUrl: string, key: string): string {
  const base = publicBaseUrl.replace(/\/$/, '');
  const normalizedKey = key.replace(/^\//, '');
  return `${base}/${normalizedKey}`;
}
