import { createCorsPolicy, reflectRequestOrigin } from '@asol/cors';
import { createServiceHttp, type ErrorStatusRule } from '@asol/service-runtime-core';

/**
 * The orders deployment's HTTP policy.
 *
 * The mechanism — headers, message fallback, rule order — is `@asol/service-runtime-core`. What
 * stays here is what only this deployment knows: it answers reads, and the status mapping mirrors
 * `mapOrderError` in `src/app/api/orders/order-api-helpers.ts` so a client cannot tell which
 * deployment answered. Only the branches a read path can reach are kept — conflict codes belong
 * to writes, which never run here.
 */
const ORDER_ERROR_RULES: readonly ErrorStatusRule[] = [
  { status: 401, equals: ['userNotFound'] },
  { status: 403, equals: ['Forbidden'], includes: ['only'] },
  { status: 404, includes: ['not found', 'notFound'] },
  { status: 400, includes: ['required', 'invalid', 'must', 'does not'] },
];

const http = createServiceHttp({
  cors: createCorsPolicy({
    origins: reflectRequestOrigin(),
    methods: ['GET', 'OPTIONS'],
    headers: ['Content-Type', 'Accept'],
  }),
  defaultRules: ORDER_ERROR_RULES,
});

export const corsHeaders = http.corsHeaders;
export const preflight = http.preflight;
export const jsonResponse = http.jsonResponse;
export const readJsonBody = http.readJsonBody;
export const orderErrorResponse = http.errorResponse;
