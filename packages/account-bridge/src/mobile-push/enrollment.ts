import { getEmbeddedMobilePushCredentialBlob } from './embedded-blob';
import {
  clearMobilePushCredentials,
  loadMobilePushCredentials,
  saveMobilePushCredentials,
} from './credential-store';
import type { NotificationGrantDeliveryIdentity } from '../ports/app-bridge';
import { postSessionRoute } from './session-route';
import type { MobilePushCredentialBundle } from './types';

const UNLOCK_PATH = '/api/notifications/mobile-push/unlock';

export { clearMobilePushCredentials };

export async function ensureMobilePushCredentials(
  identity: NotificationGrantDeliveryIdentity,
): Promise<MobilePushCredentialBundle | null> {
  const cached = await loadMobilePushCredentials();
  if (cached) return cached;

  const credentialBlob = getEmbeddedMobilePushCredentialBlob();
  if (!credentialBlob) return null;

  const request = postSessionRoute(UNLOCK_PATH, identity, { credentialBlob });
  if (!request) return null;
  const response = await request;
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
