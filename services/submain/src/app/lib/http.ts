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

/**
 * The home surfaces' own mapping, ported exactly.
 *
 * The application never answers `500` here. An admin read refuses with `403`,
 * and a rejected configuration is a `400` — `invalidHeroSliderConfig` and its
 * siblings are the caller's mistake, not a server fault. The shared mapping does
 * not know those codes and would answer `500` for every one of them, which is a
 * different answer to the same request.
 */
export function advertisementsAdminErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'forbidden';
  return Response.json({ error: message }, { status: 403, headers: corsHeaders(request) });
}

export function advertisementsSaveErrorResponse(
  request: Request,
  error: unknown,
  fallbackCode: string,
): Response {
  const message = error instanceof Error ? error.message : fallbackCode;
  return Response.json(
    { error: message },
    { status: message === 'forbidden' ? 403 : 400, headers: corsHeaders(request) },
  );
}

/**
 * Feature flags: `forbidden` is a `403`, an unknown flag key and a malformed
 * body are `400`. Anything else is a genuine server fault.
 */
export function featureFlagErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'internalServerError';
  const status =
    message === 'forbidden' ? 403 : message === 'featureFlagUnknown' ? 400 : 500;
  if (status >= 500) {
    console.error(
      `[${new URL(request.url).pathname}] unmapped failure:`,
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
  }
  return Response.json({ error: message }, { status, headers: corsHeaders(request) });
}
