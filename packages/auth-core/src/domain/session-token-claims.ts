/**
 * Reads the public payload of a signed session token without trusting it.
 * Signature verification remains server-only; this is only for detecting a
 * locally corrupted session whose stored UID disagrees with its own token.
 */
export function readUnsignedSessionTokenUid(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0]) return null;

  try {
    const normalized = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    const uid = typeof payload.uid === 'string' ? payload.uid.trim() : '';
    return uid || null;
  } catch {
    return null;
  }
}
