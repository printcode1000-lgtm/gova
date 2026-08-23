import 'server-only';

import type { NextResponse } from 'next/server';
import {
  apiSuccess,
  mapServiceError,
  readJsonBody,
} from '@/core/api/api-response';
import { runTracedBusinessRoute } from '@/core/api/traced-route';
import {
  assertSuperAdminRequest,
} from '@/features/super-admin/services/super-admin-auth.server';
import type { SignedSessionClaims } from '@asol/auth-core/server';

type SuperAdminRouteResult<T> = T | Response | NextResponse;
type Awaitable<T> = T | Promise<T>;

export interface SuperAdminRouteContext {
  admin: SignedSessionClaims;
}

export interface SuperAdminJsonRouteContext<TBody>
  extends SuperAdminRouteContext {
  body: TBody;
}

function toSuperAdminResponse<T>(result: SuperAdminRouteResult<T>): NextResponse {
  if (result instanceof Response) {
    return result as NextResponse;
  }
  return apiSuccess(result);
}

export function runSuperAdminRoute<T>(
  routeName: string,
  request: Request,
  handler: (context: SuperAdminRouteContext) => Awaitable<SuperAdminRouteResult<T>>,
): Promise<NextResponse> {
  return runTracedBusinessRoute(routeName, async () => {
    try {
      const admin = assertSuperAdminRequest(request);
      return toSuperAdminResponse(await handler({ admin }));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export function runSuperAdminJsonRoute<TBody, TResult>(
  routeName: string,
  request: Request,
  handler: (
    context: SuperAdminJsonRouteContext<TBody>,
  ) => Awaitable<SuperAdminRouteResult<TResult>>,
): Promise<NextResponse> {
  return runSuperAdminRoute(routeName, request, async ({ admin }) => {
    const body = await readJsonBody<TBody>(request);
    return handler({ admin, body });
  });
}
