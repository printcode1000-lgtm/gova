import { NextResponse } from 'next/server';

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function mapServiceError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const knownCodes = ['userNotFound', 'invalidPassword', 'phoneAlreadyRegistered'];

  if (knownCodes.includes(message)) {
    return apiError(message, 400);
  }

  return apiError(message, 500);
}
