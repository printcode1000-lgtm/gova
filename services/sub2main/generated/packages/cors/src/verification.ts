import { ANY_ORIGIN } from './origins';
import { CORS_HEADER_NAMES } from './headers';

export interface CorsPreflightProbeInput {
  origin: string;
  method: string;
  requestedHeaders: readonly string[];
}

export interface CorsPreflightExpectation extends CorsPreflightProbeInput {
  allowWildcardOrigin?: boolean;
  requireVaryOrigin?: boolean;
}

function listHeader(value: string | null): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function createCorsPreflightProbeHeaders(input: CorsPreflightProbeInput): Record<string, string> {
  return {
    Origin: input.origin,
    [CORS_HEADER_NAMES.requestMethod]: input.method,
    [CORS_HEADER_NAMES.requestHeaders]: input.requestedHeaders.join(', '),
  };
}

export function inspectCorsPreflightResponse(
  headers: Headers,
  expected: CorsPreflightExpectation,
): string[] {
  const problems: string[] = [];
  const allowOrigin = headers.get(CORS_HEADER_NAMES.allowOrigin);
  const validOrigin = allowOrigin === expected.origin || (expected.allowWildcardOrigin && allowOrigin === ANY_ORIGIN);
  if (!validOrigin) problems.push(CORS_HEADER_NAMES.allowOrigin);

  const methods = listHeader(headers.get(CORS_HEADER_NAMES.allowMethods));
  if (!methods.has(expected.method.toLowerCase())) {
    problems.push(`${CORS_HEADER_NAMES.allowMethods}:${expected.method.toUpperCase()}`);
  }

  const allowedHeaders = listHeader(headers.get(CORS_HEADER_NAMES.allowHeaders));
  if (!allowedHeaders.has(ANY_ORIGIN)) {
    for (const header of expected.requestedHeaders) {
      if (!allowedHeaders.has(header.toLowerCase())) {
        problems.push(`${CORS_HEADER_NAMES.allowHeaders}:${header}`);
      }
    }
  }

  if (expected.requireVaryOrigin) {
    const vary = listHeader(headers.get(CORS_HEADER_NAMES.vary));
    if (!vary.has('origin')) problems.push(`${CORS_HEADER_NAMES.vary}:Origin`);
  }
  return problems;
}
