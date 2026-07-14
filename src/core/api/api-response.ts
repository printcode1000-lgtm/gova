import { NextResponse } from 'next/server';
import { isDevelopment } from '@/core/config';
import { DEV_TRACE_HEADER } from '@/core/monitor/dev-trace-types';
import { getDevTrace, serializeDevTrace } from '@/core/monitor/server-trace';

function attachDevTraceHeaders(response: NextResponse): NextResponse {
  if (!isDevelopment) return response;
  const trace = getDevTrace();
  if (trace.length > 0) {
    response.headers.set(DEV_TRACE_HEADER, serializeDevTrace(trace));
  }
  return response;
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return attachDevTraceHeaders(NextResponse.json(data, { status }));
}

export function apiError(message: string, status = 400): NextResponse {
  return attachDevTraceHeaders(
    NextResponse.json({ error: message }, { status }),
  );
}

export function mapServiceError(error: unknown): NextResponse {
  const message =
    error instanceof Error ? error.message : 'Internal Server Error';
  const knownCodes = [
    'userNotFound',
    'invalidPassword',
    'phoneAlreadyRegistered',
    'invalidCurrentPassword',
    'currentPasswordRequired',
    'invalidStoreDetails',
    'invalidProfileContacts',
    'invalidProfileEditor',
    'invalidDeliveryCarrier',
    'phoneVerificationRequired',
    'invalidNotificationToken',
    'notificationTokenSaveFailed',
    'notificationTokenIdentifierRequired',
    'notificationRecipientsRequired',
    'notificationDedupeKeyRequired',
    'notificationContentRequired',
    'notificationBroadcastForbidden',
    'vapidSaveFailed',
    'vapidNotConfigured',
    'webPushNotConfigured',
    'invalidFollowTarget',
    'followLoginRequired',
    'followSelfNotAllowed',
  ];

  if (knownCodes.includes(message)) {
    return apiError(message, 400);
  }

  if (message === 'forbidden') {
    return apiError(message, 403);
  }

  return apiError(message, 500);
}
