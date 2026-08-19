import type {
  NotificationProvider,
  NotificationProviderSendInput,
  NotificationProviderSendResult,
} from './notification-provider.interface';
import webpush from 'web-push';
import { getWebPushServerConfig } from '@/core/config/server-env/server-env.values.turso-env';
import {
  WEB_PUSH_VAPID_PUBLIC_KEY,
  WEB_PUSH_VAPID_SUBJECT,
} from '../../domain/web-push-config';
import type { RegisteredNotificationToken } from '../../domain/entities';

function buildPayload(input: NotificationProviderSendInput, token: RegisteredNotificationToken): string {
  const href = input.payload.route?.href ?? String(input.payload.metadata?.href ?? '/notifications');
  const metadata = Object.fromEntries(
    Object.entries(input.payload.metadata ?? {}).filter(([, value]) => value !== null && value !== undefined),
  );
  return JSON.stringify({
    uid: token.uid,
    notificationId: input.payload.notificationId,
    templateId: input.payload.templateId,
    dedupeKey: input.payload.dedupeKey,
    title: input.payload.title ?? input.payload.templateId ?? 'ASOL',
    body: input.payload.body ?? String(input.payload.variables?.message ?? ''),
    category: input.payload.category,
    priority: input.payload.priority,
    sound: input.payload.sound,
    groupKey: input.payload.groupKey,
    href,
    routeHref: href,
    routeLabel: input.payload.route?.label,
    createdAt: new Date().toISOString(),
    metadata,
  });
}

/**
 * A subscription the push service no longer knows about.
 *
 * `404 Not Found` and `410 Gone` are the two responses the Web Push protocol
 * defines for a subscription that was revoked or expired. Anything else — a
 * network error, a 429, a 5xx — is a transient failure and must not cost the
 * user their registration.
 */
function isExpiredSubscription(reason: unknown): boolean {
  const status = (reason as { statusCode?: number } | null)?.statusCode;
  return status === 404 || status === 410;
}

export class WebPushNotificationProvider implements NotificationProvider {
  readonly provider = 'web_push';

  /**
   * The transport is injected, defaulting to the real `web-push` client.
   *
   * It used to be reached through the module import alone, and the contract test replaced
   * it by monkey-patching `Module.prototype.require`. That worked while this file was
   * compiled to CommonJS under `src/`; once it moved into a package declaring
   * `"type": "module"`, the import became a real ESM binding and the patch stopped
   * applying — the test started opening `setVapidDetails` against the live library.
   *
   * Injection removes the dependency on how the module system happens to load this file.
   */
  constructor(
    private readonly readConfig = getWebPushServerConfig,
    private readonly client: Pick<typeof webpush, 'setVapidDetails' | 'sendNotification'> = webpush,
  ) {}

  async send(input: NotificationProviderSendInput): Promise<NotificationProviderSendResult> {
    const config = this.readConfig();
    if (!config) {
      // The tokens are kept: a missing server credential is not a dead
      // subscription, and de-registering here would cost real devices.
      return {
        provider: this.provider,
        tokenCount: input.tokens.length,
        status: 'failed',
        message: 'webPushNotConfigured: set WEB_PUSH_VAPID_PRIVATE_KEY.',
      };
    }

    this.client.setVapidDetails(
      WEB_PUSH_VAPID_SUBJECT,
      WEB_PUSH_VAPID_PUBLIC_KEY,
      config.privateKey,
    );
    const results = await Promise.allSettled(
      input.tokens.map((token) => this.client.sendNotification(JSON.parse(token.token), buildPayload(input, token))),
    );
    const failureCount = results.filter((result) => result.status === 'rejected').length;
    const successCount = results.length - failureCount;
    const invalidTokenIds = input.tokens
      .filter((_, index) => {
        const result = results[index];
        return result?.status === 'rejected' && isExpiredSubscription(result.reason);
      })
      .map((token) => token.id);
    return {
      provider: this.provider,
      tokenCount: input.tokens.length,
      status: failureCount === 0 ? 'queued' : successCount > 0 ? 'partial' : 'failed',
      successCount,
      failureCount,
      invalidTokenIds,
      message: failureCount > 0 ? `${failureCount} web push deliveries failed.` : undefined,
    };
  }
}
