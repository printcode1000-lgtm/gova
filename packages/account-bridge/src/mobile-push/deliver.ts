import { getNotificationGrantDeliveryIdentity } from '@/features/notifications/domain/notification-grant-delivery-context';
import { isAndroid, NativeCore } from '@asol/native-core';
import type { NotificationBridgeRecipientResult } from '../notifications';
import { ensureMobilePushCredentials } from './enrollment';
import { getFcmAccessToken } from './fcm-auth';
import { sendProviderPayloadToTokens } from './fcm-message';
import { buildMobileProviderPayload } from './provider-payload';
import {
  resolveMainApiBaseUrl,
  type RecipientTokensApiResponse,
  type RecipientTokenRecord,
} from './types';

const RECIPIENT_TOKENS_PATH = '/api/notifications/recipient-tokens';
const MAX_PARALLEL_GRANTS = 100;

function recipientStatus(
  successCount: number,
  failureCount: number,
  tokenCount: number,
): NotificationBridgeRecipientResult['status'] {
  if (tokenCount === 0) return 'no_tokens';
  if (successCount === 0) return 'failed';
  if (failureCount > 0) return 'partial';
  return 'sent';
}

async function fetchRecipientTokens(
  identity: { uid: string; phone: string },
  grants: string[],
): Promise<RecipientTokensApiResponse | null> {
  const baseUrl = resolveMainApiBaseUrl();
  if (!baseUrl) return null;
  const response = await fetch(`${baseUrl}${RECIPIENT_TOKENS_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...identity, grants }),
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const body = (await response.json()) as RecipientTokensApiResponse;
  return body;
}

export async function deliverNotificationGrantsFromNative(
  grants: readonly string[],
): Promise<{
  delivered: number;
  unavailable: number;
  recipientResults: NotificationBridgeRecipientResult[];
}> {
  const identity = getNotificationGrantDeliveryIdentity();
  if (!identity) {
    return { delivered: 0, unavailable: grants.length, recipientResults: [] };
  }

  if (isAndroid()) {
    const channels = await NativeCore.ensureNotificationChannels();
    if (!channels.ok) {
      return { delivered: 0, unavailable: grants.length, recipientResults: [] };
    }
  }

  const credentials = await ensureMobilePushCredentials(identity);
  if (!credentials) {
    return { delivered: 0, unavailable: grants.length, recipientResults: [] };
  }

  const accessToken = await getFcmAccessToken(credentials);
  if (!accessToken) {
    return { delivered: 0, unavailable: grants.length, recipientResults: [] };
  }

  const resolved = await fetchRecipientTokens(identity, grants.slice(0, MAX_PARALLEL_GRANTS));
  if (!resolved) {
    return { delivered: 0, unavailable: grants.length, recipientResults: [] };
  }

  const recipientResults: NotificationBridgeRecipientResult[] = [];
  let delivered = 0;
  let unavailable = 0;

  for (const grant of resolved.grants) {
    const groups = new Map<string, { locale: 'ar' | 'en'; tokens: RecipientTokenRecord[] }>();
    for (const recipient of grant.recipients) {
      if (recipient.status === 'muted') {
        recipientResults.push({ uid: recipient.uid, tokenCount: 0, status: 'muted' });
        unavailable += 1;
        continue;
      }
      if (recipient.status === 'no_tokens') {
        recipientResults.push({ uid: recipient.uid, tokenCount: 0, status: 'no_tokens' });
        unavailable += 1;
        continue;
      }

      for (const token of recipient.tokens) {
        const locale = token.locale === 'en' ? 'en' : 'ar';
        const key = `${recipient.uid}:${locale}`;
        const group = groups.get(key) ?? { locale, tokens: [] };
        group.tokens.push(token);
        groups.set(key, group);
      }
    }

    for (const [uidLocale, group] of groups) {
      const uid = uidLocale.split(':')[0] ?? '';
      const payload = buildMobileProviderPayload(grant.send, group.locale);
      const outcome = await sendProviderPayloadToTokens(
        credentials,
        payload,
        group.tokens,
        accessToken,
      );
      const deliveryStatus = recipientStatus(
        outcome.successCount,
        outcome.failureCount,
        group.tokens.length,
      );
      const providerStatus: 'sent' | 'partial' | 'failed' =
        deliveryStatus === 'partial'
          ? 'partial'
          : deliveryStatus === 'sent'
            ? 'sent'
            : 'failed';
      recipientResults.push({
        uid,
        tokenCount: group.tokens.length,
        status: deliveryStatus,
        providers: [
          {
            provider: 'fcm',
            locale: group.locale,
            tokenCount: group.tokens.length,
            status: providerStatus,
            successCount: outcome.successCount,
            failureCount: outcome.failureCount,
            invalidTokenIds: outcome.invalidTokenIds,
          },
        ],
      });
      if (deliveryStatus === 'sent' || deliveryStatus === 'partial') delivered += 1;
      else unavailable += 1;
    }
  }

  return { delivered, unavailable, recipientResults };
}
