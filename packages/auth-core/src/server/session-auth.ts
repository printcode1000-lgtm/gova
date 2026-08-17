import { verifySignedSessionToken } from './session-token';

export function extractSessionToken(
  request: Request,
  body?: { sessionToken?: string | null },
): string {
  const header = request.headers.get('x-asol-session-token')?.trim();
  if (header) return header;
  return body?.sessionToken?.trim() ?? '';
}

export function assertSessionMatchesUid(sessionToken: string, uid: string): void {
  if (!sessionToken) throw new Error('sessionTokenInvalid');
  const claims = verifySignedSessionToken(sessionToken);
  if (claims.uid !== uid) throw new Error('sessionTokenInvalid');
}
