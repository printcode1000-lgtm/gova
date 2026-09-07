import { ANY_ORIGIN, corsOriginsFromEnv } from '@asol/cors';

export interface OtaR2CorsRule {
  id?: string;
  allowed: {
    origins: string[];
    methods: string[];
    headers?: string[];
  };
  exposeHeaders?: string[];
  maxAgeSeconds?: number;
}

/** Public OTA bytes must stay fetchable from Web/Capacitor origins. */
export function buildDefaultOtaCorsRules(): OtaR2CorsRule[] {
  return [
    {
      id: 'asol-ota-browser-upload',
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
