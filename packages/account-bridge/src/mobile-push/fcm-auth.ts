function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function textToBase64Url(value: string): string {
  return base64UrlEncode(new TextEncoder().encode(value));
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalized = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    binary,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function signJwt(
  credentials: { clientEmail: string; privateKey: string },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = textToBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = textToBase64Url(
    JSON.stringify({
      iss: credentials.clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const key = await importPrivateKey(credentials.privateKey);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export async function getFcmAccessToken(credentials: {
  clientEmail: string;
  privateKey: string;
}): Promise<string | null> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }
  try {
    const assertion = await signJwt(credentials);
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!body.access_token) return null;
    cachedAccessToken = {
      token: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
    };
    return body.access_token;
  } catch {
    return null;
  }
}

export interface FcmSendResult {
  success: boolean;
  errorCode?: string;
}

export async function sendFcmHttpV1Message(
  projectId: string,
  accessToken: string,
  payload: unknown,
): Promise<FcmSendResult> {
  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      },
    );
    if (response.ok) return { success: true };
    const body = (await response.json()) as {
      error?: { status?: string; details?: Array<{ errorCode?: string }> };
    };
    const errorCode =
      body.error?.details?.find((detail) => detail.errorCode)?.errorCode ||
      body.error?.status ||
      'UNKNOWN';
    return { success: false, errorCode };
  } catch {
    return { success: false, errorCode: 'TRANSPORT_ERROR' };
  }
}
