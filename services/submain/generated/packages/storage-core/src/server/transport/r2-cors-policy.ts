export interface R2CorsAllowed {
  origins: string[];
  methods: Array<'GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD'>;
  headers?: string[];
}

export interface R2CorsRule {
  id?: string;
  allowed: R2CorsAllowed;
  exposeHeaders?: string[];
  maxAgeSeconds?: number;
}

export interface R2CorsPolicy {
  rules: R2CorsRule[];
}

export function getCorsOrigins(): string[] {
  const raw = process.env.ASOL_CORS_ORIGINS;
  if (!raw) return ['*'];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

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
