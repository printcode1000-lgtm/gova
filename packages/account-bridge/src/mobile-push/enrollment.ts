import { getEmbeddedMobilePushCredentialBlob } from './embedded-blob';
import {
  clearMobilePushCredentials,
  loadMobilePushCredentials,
  saveMobilePushCredentials,
} from './credential-store';
import { resolveMainApiBaseUrl, type MobilePushCredentialBundle } from './types';

const UNLOCK_PATH = '/api/notifications/mobile-push/unlock';

export { clearMobilePushCredentials };

export async function ensureMobilePushCredentials(input: {
  uid: string;
  phone: string;
}): Promise<MobilePushCredentialBundle | null> {
  const cached = await loadMobilePushCredentials();
  if (cached) return cached;

  const credentialBlob = getEmbeddedMobilePushCredentialBlob();
  if (!credentialBlob) return null;

  const baseUrl = resolveMainApiBaseUrl();
  if (!baseUrl) return null;

  const response = await fetch(`${baseUrl}${UNLOCK_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...input, credentialBlob }),
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!response.ok) return null;

  const body = (await response.json()) as MobilePushCredentialBundle;
  const projectId = String(body.projectId ?? '').trim();
  const clientEmail = String(body.clientEmail ?? '').trim();
  const privateKey = String(body.privateKey ?? '').trim();
  if (!projectId || !clientEmail || !privateKey) return null;

  const bundle = { projectId, clientEmail, privateKey };
  await saveMobilePushCredentials(bundle);
  return bundle;
}
