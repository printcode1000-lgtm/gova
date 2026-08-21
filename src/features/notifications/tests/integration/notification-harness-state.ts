import type { HarnessState } from "./notification-harness.types";

export function freshHarnessState(): HarnessState {
  return {
    db: new Map(),
    platform: "android",
    isNative: true,
    permission: "granted",
    online: true,
    deliveredTray: [],
    nativeInbox: [],
    nativeInboxUnavailable: false,
    nativeTap: null,
    acknowledgedRecordIds: [],
    dbWriteError: null,
    nativeInboxClearedCount: 0,
    registrationToken: "fcm-token-aaaaaaaaaaaaaaaaaaaaaaaa:APA91bTESTTESTTESTTESTTEST",
    registrationError: null,
    inboxUnavailable: false,
    channelCreationError: null,
    createdChannels: 0,
    registerCalls: 0,
    unregisterCalls: 0,
    removeAllDeliveredCalls: 0,
    localDisplays: [],
    serverRegisteredTokens: [],
    serverRemovedTokens: [],
    webPushSubscribed: false,
    loggedLines: [],
  };
}
