import { BROWSER_REQUEST_HEADERS, createCorsPolicy, reflectRequestOrigin } from '@asol/cors';
import { createServiceHttp, type ErrorStatusRule } from '@asol/service-runtime-core';

/**
 * The profiles deployment's HTTP policy. Mirrors `mapServiceError` for the branches a read path
 * can reach; the mechanism lives in `@asol/service-runtime-core`.
 *
 * The methods are this deployment's own — it reads. The accepted request headers are not: they
 * are `BROWSER_REQUEST_HEADERS`, the one list the main application also answers with, so a header
 * the client may legally send here can never be rejected at preflight as an unreachable server.
 */
const PROFILE_ERROR_RULES: readonly ErrorStatusRule[] = [
  { status: 403, matches: /forbidden/i },
  { status: 404, matches: /not ?found/i },
  { status: 400, matches: /required|invalid|must/i },
];

const http = createServiceHttp({
  cors: createCorsPolicy({
    origins: reflectRequestOrigin(),
    methods: ['GET', 'OPTIONS'],
    headers: BROWSER_REQUEST_HEADERS,
  }),
  defaultRules: PROFILE_ERROR_RULES,
});

export const corsHeaders = http.corsHeaders;
export const preflight = http.preflight;
export const profileErrorResponse = http.errorResponse;
