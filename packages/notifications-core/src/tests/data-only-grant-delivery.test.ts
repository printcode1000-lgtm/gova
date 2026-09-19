import { NotificationSendService } from '../services/notification-send-service.server';
import { NotificationProviderRegistry } from '../services/providers/notification-provider-registry.server';
import { postNotificationGrantToService } from '../services/notification-grant-courier.server';
import type { NotificationProvider } from '../services/providers/notification-provider.interface';
import type { RegisteredNotificationToken } from '../domain/entities';

/**
 * Regression guard for the verification SMS dispatch that never left the server.
 *
 * The dispatch is a data-only signal with an empty title and body. The send
 * service refused it as `notificationContentRequired`, the notifications route
 * still answered 200, and the courier read the 200 as delivered — so every
 * Egyptian challenge sat in `dispatch_pending` with no push and no error.
 */

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const TOKEN: RegisteredNotificationToken = {
  id: 'tok-1',
  uid: 'admin',
  platform: 'android',
  provider: 'fcm',
  token: 'fcm-token',
  enabled: true,
} as RegisteredNotificationToken;

async function dataOnlySendReachesTheProvider(): Promise<void> {
  const sent: unknown[] = [];
  const fcm = {
    provider: 'fcm',
    send: async (input: unknown) => {
      sent.push(input);
      return { provider: 'fcm', status: 'sent', sent: 1, failed: 0 };
    },
  } as unknown as NotificationProvider;
  const service = new NotificationSendService(new NotificationProviderRegistry([fcm]), undefined, () => ({
    tokensByUid: async () => ({ admin: [TOKEN] }),
    pushEnabledUids: async (uids: string[]) => uids,
    deleteToken: async () => undefined,
  }));

  const result = await service.sendToUsersLocally({
    uids: ['admin'],
    platforms: ['android'],
    dedupeKey: 'verification-sms-dispatch:vdp_1',
    title: '',
    body: '',
    metadata: { dataOnly: true },
  });
  assert(sent.length === 1, 'a data-only send with no text must reach the provider');
  assert(result.results[0]?.status === 'sent', 'the data-only send must report sent');

  let refused = false;
  try {
    await service.sendToUsersLocally({ uids: ['admin'], dedupeKey: 'visible', title: '', body: '' });
  } catch (error) {
    refused = error instanceof Error && error.message === 'notificationContentRequired';
  }
  assert(refused, 'a visible send without text is still refused');
}

async function courierReadsTheOutcomeNotTheStatusLine(): Promise<void> {
  const original = globalThis.fetch;
  const respond = (body: unknown) => {
    globalThis.fetch = (async () => Response.json(body, { status: 200 })) as typeof fetch;
  };
  try {
    respond({ accepted: 0, rejected: 1, results: [{ error: 'notificationContentRequired' }] });
    const refused = await postNotificationGrantToService('https://notifications.test', 'grant');
    assert(!refused.delivered && refused.failureCode === 'undelivered', 'a 200 carrying a rejection is not delivered');

    respond({ accepted: 1, rejected: 0, results: [{ requested: 1, results: [{ uid: 'admin', tokenCount: 0, status: 'no_tokens' }] }] });
    const noDevice = await postNotificationGrantToService('https://notifications.test', 'grant');
    assert(!noDevice.delivered, 'a send that reached no device is not delivered');

    respond({ accepted: 1, rejected: 0, results: [{ requested: 1, results: [{ uid: 'admin', tokenCount: 1, status: 'sent' }] }] });
    const sent = await postNotificationGrantToService('https://notifications.test', 'grant');
    assert(sent.delivered, 'a send that reached a device is delivered');
  } finally {
    globalThis.fetch = original;
  }
}

await dataOnlySendReachesTheProvider();
await courierReadsTheOutcomeNotTheStatusLine();
console.log('data-only grant delivery: ok');
