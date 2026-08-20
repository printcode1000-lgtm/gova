import { createServiceHttp, type ErrorStatusRule } from '@asol/service-runtime-core';

/**
 * The sub2main deployment's HTTP policy: seller-facing profile and product writes, so it answers
 * more methods than the read-only mirrors. The mechanism is `@asol/service-runtime-core`.
 */
const SELLER_ERROR_RULES: readonly ErrorStatusRule[] = [
  { status: 404, equals: ['productNotFound'], includes: ['NotFound'] },
  { status: 403, equals: ['productForbidden'], includes: ['Forbidden'] },
  { status: 400, equals: ['invalidProduct'], includes: ['required'] },
];

const http = createServiceHttp({
  methods: 'GET, POST, PUT, DELETE, OPTIONS',
  headers: 'Content-Type, Accept, X-Asol-Trace-Id',
  defaultRules: SELLER_ERROR_RULES,
});

export const corsHeaders = http.corsHeaders;
export const preflight = http.preflight;
export const withCors = http.withCors;
export const sellerErrorResponse = http.errorResponse;
