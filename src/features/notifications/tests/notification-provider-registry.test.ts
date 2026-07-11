import assert from 'node:assert/strict';
import { FcmNotificationProvider } from '../services/providers/fcm-notification-provider.server';
import { NoopNotificationProvider } from '../services/providers/noop-notification-provider.server';
import type { RegisteredNotificationToken } from '../domain/entities';
import { NotificationPlatforms } from '../domain/enums';

const token: RegisteredNotificationToken = {
  id: 'ntok_1',
  uid: 'usr_1',
  platform: NotificationPlatforms.Web,
  provider: 'web_push',
  deviceId: 'browser_1',
  token: 'token_1',
  enabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function main() {
  const provider = new FcmNotificationProvider();

  const result = await provider.send({
    tokens: [token],
    payload: {
      locale: 'ar',
      templateId: 'system.info',
      dedupeKey: 'system.info:test',
      variables: { message: 'Hello' },
    },
  });

  assert.equal(result.provider, 'fcm');
  assert.equal(result.status, 'queued');
  assert.equal(result.tokenCount, 1);

  const fallback = await new NoopNotificationProvider().send({
    tokens: [token],
    payload: {
      locale: 'ar',
      dedupeKey: 'noop:test',
      title: 'Test',
      body: 'Body',
    },
  });
  assert.equal(fallback.provider, 'noop');
  assert.equal(fallback.status, 'queued');

  console.log('Notification provider registry tests passed.');
}

void main();
