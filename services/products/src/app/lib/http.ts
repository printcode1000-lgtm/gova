import { createServiceHttp, type ErrorStatusRule } from '@asol/service-runtime-core';

/**
 * The products deployment's HTTP policy.
 *
 * Three mappings rather than one, because the routes they belong to raise different codes and a
 * client must see the same status the main application would have returned. The mechanism is
 * `@asol/service-runtime-core`; these lists are this deployment's own.
 */
const PRODUCT_ERROR_RULES: readonly ErrorStatusRule[] = [
  { status: 404, equals: ['productNotFound'] },
  { status: 403, equals: ['productForbidden'] },
  { status: 400, equals: ['invalidProduct'] },
];

/** Mirrors the status mapping in `src/app/api/products/reviews/route.ts`. */
const REVIEW_ERROR_RULES: readonly ErrorStatusRule[] = [
  { status: 404, equals: ['reviewNotFound'], includes: ['NotFound'] },
  { status: 403, equals: ['sellerCannotReview'], includes: ['Forbidden'] },
  {
    status: 400,
    equals: ['invalidReview', 'reviewAlreadyExists', 'reviewsDisabled', 'userNotFound'],
  },
];

/** Generic mapping for the search routes, which use `mapServiceError` upstream. */
const SEARCH_ERROR_RULES: readonly ErrorStatusRule[] = [
  { status: 400, equals: ['invalidSearchCategory'] },
];

const http = createServiceHttp({
  methods: 'GET, OPTIONS',
  headers: 'Content-Type, Accept, X-Asol-Trace-Id',
  defaultRules: PRODUCT_ERROR_RULES,
});

export const corsHeaders = http.corsHeaders;
export const preflight = http.preflight;
export const errorResponse = http.errorResponse;

export function reviewErrorResponse(request: Request, error: unknown): Response {
  return http.errorResponse(request, error, REVIEW_ERROR_RULES);
}

export function searchErrorResponse(request: Request, error: unknown): Response {
  return http.errorResponse(request, error, SEARCH_ERROR_RULES);
}
