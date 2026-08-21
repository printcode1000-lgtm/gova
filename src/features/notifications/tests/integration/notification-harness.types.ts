export interface InboundPayload {
  id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  tag?: string;
  channelId?: string;
}

export type FakePermissionState = "granted" | "denied" | "prompt" | "blocked" | "unsupported";

export interface NativeInboxRecordFixture {
  recordId: string;
  uid: string;
  notificationId: string;
  dedupeKey: string;
  channelId: string;
  createdAt: string;
  receivedAt: number;
  payload: InboundPayload;
}

export interface HarnessState {
  db: Map<string, unknown>;
  platform: "android" | "ios" | "web";
  isNative: boolean;
  permission: FakePermissionState;
  online: boolean;
  deliveredTray: InboundPayload[];
  nativeInbox: NativeInboxRecordFixture[];
  nativeInboxUnavailable: boolean;
  nativeTap: { recordId: string; uid: string; notificationId: string } | null;
  acknowledgedRecordIds: string[];
  dbWriteError: Error | null;
  nativeInboxClearedCount: number;
  registrationToken: string;
  registrationError: Error | null;
  inboxUnavailable: boolean;
  channelCreationError: Error | null;
  createdChannels: number;
  registerCalls: number;
  unregisterCalls: number;
  removeAllDeliveredCalls: number;
  localDisplays: Array<{ id: string; title: string; channelId?: string; sound?: string }>;
  serverRegisteredTokens: Array<Record<string, unknown>>;
  serverRemovedTokens: Array<Record<string, unknown>>;
  webPushSubscribed: boolean;
  loggedLines: Array<{ level: string; message: string; details: unknown }>;
}

export type Listener<T> = (payload: T) => void;
