import { readNotificationGrants } from '@/features/notifications';
import { getNotificationsPublicUrl } from '@/core/config/public-env';

const SEND_PATH = '/api/notifications/send';
const TIMEOUT_MS = 10_000;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export interface NotificationBridgeResult {
  attempted: number;
  delivered: number;
  unavailable: number;
  recipientResults: NotificationBridgeRecipientResult[];
}

export interface NotificationBridgeRecipientResult {
  uid: string;
  tokenCount: number;
  status: 'sent' | 'partial' | 'queued' | 'failed' | 'no_tokens' | 'granted' | 'muted';
  providers?: Array<{
    provider: string;
    locale?: 'ar' | 'en';
    tokenCount: number;
    status: 'sent' | 'partial' | 'queued' | 'failed';
    successCount?: number;
    failureCount?: number;
    invalidTokenIds?: string[];
    message?: string;
  }>;
}

interface NotificationServiceResponse {
  accepted?: number;
  results?: Array<{
    results?: NotificationBridgeRecipientResult[];
  } | { error?: string }>;
}

type NotificationBridgeDeliverySummary = Pick<
  NotificationBridgeResult,
  'delivered' | 'unavailable' | 'recipientResults'
>;

export function summarizeNotificationSendResponse(
  body: unknown,
): NotificationBridgeDeliverySummary {
  const response = body as NotificationServiceResponse | null;
  const recipients = Array.isArray(response?.results)
    ? response.results.flatMap((result) =>
        'results' in result && Array.isArray(result.results)
          ? result.results
          : [],
      )
    : [];
  const delivered = recipients.filter((recipient) =>
    ['sent', 'queued', 'partial'].includes(String(recipient.status ?? '')),
  ).length;
  return {
    delivered,
    unavailable: Math.max(0, recipients.length - delivered),
    recipientResults: recipients,
  };
}

async function deliverGrant(
  baseUrl: string,
  grant: string,
): Promise<NotificationBridgeDeliverySummary> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${SEND_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant }),
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
    });
    if (!response.ok) {
      return { delivered: 0, unavailable: 1, recipientResults: [] };
    }
    return summarizeNotificationSendResponse(await response.json());
  } catch {
    return { delivered: 0, unavailable: 1, recipientResults: [] };
  } finally {
    clearTimeout(timeout);
  }
}

export async function deliverNotificationGrants(
  body: unknown,
): Promise<NotificationBridgeResult> {
  if (!isBrowser()) {
    return { attempted: 0, delivered: 0, unavailable: 0, recipientResults: [] };
  }

  const grants = readNotificationGrants(body);
  if (grants.length === 0) {
    return { attempted: 0, delivered: 0, unavailable: 0, recipientResults: [] };
  }

  const baseUrl = getNotificationsPublicUrl();
  if (!baseUrl) {
    return {
      attempted: grants.length,
      delivered: 0,
      unavailable: grants.length,
      recipientResults: [],
    };
  }

  const results = await Promise.all(
    grants.map((grant) => deliverGrant(baseUrl, grant)),
  );
  return {
    attempted: grants.length,
    delivered: results.reduce((total, result) => total + result.delivered, 0),
    unavailable: results.reduce(
      (total, result) => total + result.unavailable,
      0,
    ),
    recipientResults: results.flatMap((result) => result.recipientResults),
  };
}

export function scheduleNotificationGrantDelivery(body: unknown): void {
  if (!isBrowser()) return;
  if (readNotificationGrants(body).length === 0) return;

  void deliverNotificationGrants(body).then(
    (result) => {
      if (result.unavailable > 0 || result.delivered === 0) {
        console.warn(
          `[Asol][NotificationBridge] grants=${result.attempted}, deliveredRecipients=${result.delivered}, unavailableRecipients=${result.unavailable}`,
        );
      }
    },
    (error: unknown) => {
      console.warn(
        '[Asol][NotificationBridge] grant delivery failed',
        error instanceof Error ? error.message : error,
      );
    },
  );
}
