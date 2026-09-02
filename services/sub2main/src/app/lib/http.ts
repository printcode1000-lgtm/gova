import { businessApiErrorStatus } from '@/core/api/business-api-error-status';
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

/**
 * The shared application status mapping, for the route families that moved here
 * whole. Reviews answer many more error codes than a hand-written rule list can
 * track, and a client cannot be moved to an origin that answers the same failure
 * with a different status.
 */
export function businessErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'internalServerError';
  const mapped = businessApiErrorStatus(message);
  return Response.json(
    { error: mapped.code },
    { status: mapped.status, headers: corsHeaders(request) },
  );
}
