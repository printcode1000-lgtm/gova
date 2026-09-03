import { ANY_ORIGIN, corsOriginsFromEnv } from '@asol/cors';

/**
 * The R2 bucket's own CORS rules — a Cloudflare bucket configuration, not an HTTP response.
 *
 * The bucket answers browser uploads directly, so it needs its own allowed-origin list, and it is
 * the *same* list the application's API boundary uses: `@asol/cors` owns reading and parsing it.
 * What stays here is the rule shape Cloudflare's API expects, which no HTTP surface shares.
 *
 * The fallback differs from the application's on purpose. An unconfigured API boundary refuses
 * cross-origin reads; an unconfigured bucket allows any origin, because a bucket with no CORS
 * rules cannot be reached by a browser at all and a developer would see uploads fail with no
 * diagnosis. The bytes are public either way.
 */
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

/** Full browser-upload bucket rules, from the same allowed-origin configuration as every other surface. */
export function buildDefaultR2CorsRules(): R2CorsRule[] {
  return [
    {
      id: 'asol-browser-upload',
      allowed: {
        origins: corsOriginsFromEnv(process.env, [ANY_ORIGIN]),
        methods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        headers: ['*'],
      },
      exposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
      maxAgeSeconds: 3600,
    },
  ];
}
