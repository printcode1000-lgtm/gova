import {
  appleSoundFile,
  fcmSoundResource,
  resolveAndroidChannelId,
} from '@asol/notifications-core';
import {
  BRANDING_ANDROID_NOTIFICATION_COLOR,
  BRANDING_ANDROID_NOTIFICATION_SMALL_ICON,
} from '@asol/branding-core';
import type { MobileProviderPayload } from './provider-payload';
import type { RecipientTokenRecord } from './types';

function channelId(payload: MobileProviderPayload): string {
  return resolveAndroidChannelId({
    category: payload.category as never,
    priority: payload.priority as never,
    sound: payload.sound as never,
    source: payload.metadata?.source,
  });
}

function cleanData(payload: MobileProviderPayload, uid: string): Record<string, string> {
  const data: Record<string, string> = {
    notificationId: payload.notificationId,
    dedupeKey: payload.dedupeKey,
    title: payload.title,
    body: payload.body,
    category: payload.category,
    priority: payload.priority,
    sound: payload.sound,
    createdAt: new Date().toISOString(),
    androidChannelId: channelId(payload),
    uid,
  };
  if (payload.templateId) data.templateId = payload.templateId;
  if (payload.route?.href) data.routeHref = payload.route.href;
  if (payload.route?.label) data.routeLabel = payload.route.label;
  if (payload.groupKey) data.groupKey = payload.groupKey;
  for (const [key, value] of Object.entries(payload.metadata ?? {})) {
    if (value !== null && value !== undefined) data[`meta_${key}`] = String(value);
  }
  return data;
}

function isHighPriority(payload: MobileProviderPayload): boolean {
  return payload.priority === 'high' || payload.priority === 'critical';
}

function isSilent(payload: MobileProviderPayload): boolean {
  return fcmSoundResource(payload.sound as never) === undefined;
}

function buildApnsConfig(payload: MobileProviderPayload, dataOnly: boolean) {
  if (dataOnly) {
    return {
      headers: {
        'apns-push-type': 'background',
        'apns-priority': '5',
      },
      payload: { aps: { 'content-available': 1 } },
    };
  }
  return {
    headers: {
      'apns-push-type': 'alert',
      'apns-priority': isHighPriority(payload) ? '10' : '5',
      'apns-collapse-id': payload.dedupeKey.slice(0, 64),
      'apns-expiration': String(
        Math.floor(Date.now() / 1000) + (payload.category === 'chat' ? 604_800 : 86_400),
      ),
    },
    payload: {
      aps: {
        alert: { title: payload.title, body: payload.body },
        ...(appleSoundFile(payload.sound as never)
          ? { sound: appleSoundFile(payload.sound as never) }
          : {}),
        'thread-id': payload.groupKey || payload.category,
        'interruption-level':
          payload.priority === 'critical'
            ? 'time-sensitive'
            : isSilent(payload)
              ? 'passive'
              : 'active',
      },
    },
  };
}

export function buildFcmHttpV1Message(
  payload: MobileProviderPayload,
  token: RecipientTokenRecord,
) {
  const sound = fcmSoundResource(payload.sound as never);
  const dataOnly = payload.metadata?.dataOnly === true;
  const android = token.platform === 'android';
  return {
    message: {
      token: token.token,
      notification: dataOnly || android ? undefined : {
        title: payload.title,
        body: payload.body,
      },
      data: cleanData(payload, token.uid),
      android: {
        priority: isHighPriority(payload) || (android && !dataOnly) ? 'HIGH' : 'NORMAL',
        ttl: payload.category === 'chat' ? '604800s' : '86400s',
        restricted_package_name: 'hgh.asol.app',
        collapse_key: payload.dedupeKey.slice(0, 64),
        notification: dataOnly || android ? undefined : {
          channel_id: channelId(payload),
          icon: BRANDING_ANDROID_NOTIFICATION_SMALL_ICON,
          color: BRANDING_ANDROID_NOTIFICATION_COLOR,
          ...(sound ? { sound } : {}),
          tag: payload.dedupeKey.slice(0, 64),
          visibility: 'PRIVATE',
        },
      },
      apns: buildApnsConfig(payload, dataOnly),
    },
  };
}

function isInvalidToken(code?: string): boolean {
  return code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT';
}

export async function sendProviderPayloadToTokens(
  credentials: { projectId: string; clientEmail: string; privateKey: string },
  payload: MobileProviderPayload,
  tokens: RecipientTokenRecord[],
  accessToken: string,
): Promise<{
  successCount: number;
  failureCount: number;
  invalidTokenIds: string[];
}> {
  let successCount = 0;
  let failureCount = 0;
  const invalidTokenIds: string[] = [];
  const { sendFcmHttpV1Message } = await import('./fcm-auth');

  for (const token of tokens) {
    const result = await sendFcmHttpV1Message(
      credentials.projectId,
      accessToken,
      buildFcmHttpV1Message(payload, token),
    );
    if (result.success) {
      successCount += 1;
    } else {
      failureCount += 1;
      if (isInvalidToken(result.errorCode)) invalidTokenIds.push(token.id);
    }
  }

  return { successCount, failureCount, invalidTokenIds };
}
