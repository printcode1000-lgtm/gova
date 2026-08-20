import { createServiceHttp, type ErrorStatusRule } from '@asol/service-runtime-core';

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
