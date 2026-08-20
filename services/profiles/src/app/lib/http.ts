import { createServiceHttp, type ErrorStatusRule } from '@asol/service-runtime-core';

/**
 * The profiles deployment's HTTP policy. Mirrors `mapServiceError` for the branches a read path
 * can reach; the mechanism lives in `@asol/service-runtime-core`.
 */
const PROFILE_ERROR_RULES: readonly ErrorStatusRule[] = [
  { status: 403, matches: /forbidden/i },
  { status: 404, matches: /not ?found/i },
  { status: 400, matches: /required|invalid|must/i },
];

const http = createServiceHttp({
  methods: 'GET, OPTIONS',
  headers: 'Content-Type, Accept',
  defaultRules: PROFILE_ERROR_RULES,
});

export const corsHeaders = http.corsHeaders;
export const preflight = http.preflight;
export const profileErrorResponse = http.errorResponse;
