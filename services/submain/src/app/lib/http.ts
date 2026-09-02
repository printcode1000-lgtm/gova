import { createServiceHttp, type ErrorStatusRule } from '@asol/service-runtime-core';
import { businessApiErrorStatus } from '@/core/api/business-api-error-status';

/**
 * The submain deployment's HTTP policy: search reads plus order creation. Error codes match the
 * main app so clients cannot tell which deployment answered; the mechanism is
 * `@asol/service-runtime-core`.
 */
const SEARCH_ERROR_RULES: readonly ErrorStatusRule[] = [
  { status: 400, equals: ['invalidSearchCategory'] },
];

const ORDER_ERROR_RULES: readonly ErrorStatusRule[] = [
  { status: 404, equals: ['orderNotFound'] },
  { status: 403, equals: ['orderForbidden'] },
  {
    status: 400,
    equals: ['invalidOrder'],
    includes: [
      'Cart items are required',
      'Buyer phone is required',
      'sellerUid is required',
      'Description or image is required',
    ],
  },
];

const http = createServiceHttp({
  methods: 'GET, POST, OPTIONS',
  headers: 'Content-Type, Accept, X-Asol-Trace-Id',
  defaultRules: SEARCH_ERROR_RULES,
});

export const corsHeaders = http.corsHeaders;
export const preflight = http.preflight;
export const withCors = http.withCors;
export const searchErrorResponse = http.errorResponse;

export function orderErrorResponse(request: Request, error: unknown): Response {
  return http.errorResponse(request, error, ORDER_ERROR_RULES);
}

/**
 * The shared application status mapping, for the routes that moved here whole.
 *
 * Auth, account, advertisements, follow, feature flags, contact and specialty
 * chat answer many more error codes than a hand-written rule list can track,
 * and a client cannot be moved to an origin that answers the same failure with
 * a different status. `businessApiErrorStatus` is the same pure function the
 * application and the control runtime use, so the three cannot drift.
 */
export function businessErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'internalServerError';
  const mapped = businessApiErrorStatus(message);
  // An unmapped failure is a server fault, and the client is told nothing about
  // it on purpose. It is logged here because a swallowed 500 is invisible: the
  // same silence hid an unregistered port on the control runtime until a
  // release callback happened to hit it, and it is what the account smoke gate
  // scans for. See docs/08-troubleshooting/problems/owned-route-not-shipped.md.
  if (mapped.status >= 500) {
    console.error(
      `[${new URL(request.url).pathname}] unmapped failure:`,
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
  }
  return Response.json(
    { error: mapped.code },
    { status: mapped.status, headers: corsHeaders(request) },
  );
}
