import assert from 'node:assert/strict';

/**
 * Behaviour test: the native sender's two session-bound calls.
 *
 * Runs the real `postSessionRoute`, `ensureMobilePushCredentials` and
 * `deliverNotificationGrantsFromNative` against a recorded `fetch`, and pins
 * what production depends on:
 *
 * - the call goes straight to the notifications owner, never a `307` hop;
 * - the signed session travels as `x-asol-session-token`;
 * - no identity travels in the body — uid and phone are guessable, and unlock
 *   answers with a Firebase Admin key;
 * - with no session nothing is sent at all, and delivery reports `unavailable`
 *   instead of throwing into the business action that issued the grant.
 */

type Recorded = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

const NOTIFICATIONS_ORIGIN = 'https://notifications.test';
const MAIN_ORIGIN = 'https://main.test';
const BLOB = 'b'.repeat(64);
const BUNDLE = {
  projectId: 'asol-test',
  clientEmail: 'push@asol-test.iam.gserviceaccount.com',
  privateKey: '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----',
};

const recorded: Recorded[] = [];
let unlockStatus = 200;

function installFetch(): void {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    recorded.push({
      url,
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: init?.body ? JSON.parse(String(init.body)) : {},
    });
    if (url.endsWith('/api/notifications/mobile-push/unlock')) {
      return new Response(JSON.stringify(BUNDLE), { status: unlockStatus });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
}

async function installPreferences(): Promise<Map<string, string>> {
  const prefs = new Map<string, string>();
  const { NativeCore } = await import('@asol/native-core');
  NativeCore.getPreference = async (key: string) =>
    ({ ok: true, value: { value: prefs.get(key) ?? '' } }) as never;
  NativeCore.setPreference = async (key: string, value: string) => {
    prefs.set(key, value);
    return { ok: true, value: undefined } as never;
  };
  NativeCore.removePreference = async (key: string) => {
    prefs.delete(key);
    return { ok: true, value: undefined } as never;
  };
  return prefs;
}

async function run(): Promise<void> {
  // A browser runtime, so owner resolution runs exactly as it does in the WebView.
  (globalThis as { window?: unknown }).window ??= {
    location: { origin: 'https://localhost' },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  installFetch();
  const prefs = await installPreferences();

  const { configureAccountBridge } = await import('../ports/app-bridge');
  const { postSessionRoute } = await import('../mobile-push/session-route');
  const { ensureMobilePushCredentials, clearMobilePushCredentials } = await import(
    '../mobile-push/enrollment'
  );
  const { deliverNotificationGrantsFromNative } = await import('../mobile-push/deliver');

  let identity: { uid: string; phone: string; sessionToken: string } | null = null;
  configureAccountBridge({
    publicEnv: {
      developmentBuild: false,
      basePath: '',
      mode: 'static',
      apiBaseUrl: MAIN_ORIGIN,
      controlUrl: 'https://control.test',
      notificationsUrl: NOTIFICATIONS_ORIGIN,
      productsUrl: 'https://products.test',
      ordersUrl: 'https://orders.test',
      profilesUrl: 'https://profiles.test',
      submainUrl: 'https://submain.test',
      sub2mainUrl: 'https://sub2main.test',
      mobilePushCredentialBlob: BLOB,
    },
    getNotificationGrantDeliveryIdentity: () => identity,
  });

  const signedIn = { uid: 'usr_1', phone: '+201000000001', sessionToken: 'signed.session.token' };

  // ── no session: nothing leaves the device ──────────────────────────────────
  assert.equal(
    postSessionRoute('/api/notifications/recipient-tokens', { ...signedIn, sessionToken: '  ' }, {}),
    null,
  );
  assert.equal(await ensureMobilePushCredentials({ ...signedIn, sessionToken: '' }), null);
  assert.equal(recorded.length, 0, 'a call without a session must never be sent');

  // ── unlock: owner origin, session header, blob only ────────────────────────
  const bundle = await ensureMobilePushCredentials(signedIn);
  assert.deepEqual(bundle, BUNDLE);
  assert.equal(recorded.length, 1);
  const unlock = recorded[0]!;
  assert.equal(
    unlock.url,
    `${NOTIFICATIONS_ORIGIN}/api/notifications/mobile-push/unlock`,
    'unlock must go straight to the notifications owner',
  );
  assert.equal(unlock.headers['x-asol-session-token'], signedIn.sessionToken);
  assert.deepEqual(Object.keys(unlock.body), ['credentialBlob'], 'no identity in the body');
  assert.equal(unlock.body.credentialBlob, BLOB);
  assert.ok(
    [...prefs.values()].every((value) => !value.includes('BEGIN PRIVATE KEY')),
    'the unlocked key is stored encrypted',
  );

  // ── the cache answers the next call without the server ─────────────────────
  await ensureMobilePushCredentials(signedIn);
  assert.equal(recorded.length, 1, 'a cached bundle must not unlock again');

  // ── delivery without an identity reports, never throws ─────────────────────
  identity = null;
  const withoutSession = await deliverNotificationGrantsFromNative(['g1', 'g2']);
  assert.deepEqual(
    { delivered: withoutSession.delivered, unavailable: withoutSession.unavailable },
    { delivered: 0, unavailable: 2 },
  );
  assert.equal(recorded.length, 1, 'no identity → no network');

  // ── a refused unlock stops before any token is fetched ─────────────────────
  await clearMobilePushCredentials();
  unlockStatus = 404;
  identity = signedIn;
  const refused = await deliverNotificationGrantsFromNative(['g1']);
  assert.equal(refused.unavailable, 1);
  assert.equal(refused.delivered, 0);
  assert.ok(
    !recorded.some((call) => call.url.endsWith('/api/notifications/recipient-tokens')),
    'without credentials no recipient tokens are requested',
  );
  assert.equal(recorded.at(-1)!.url, `${NOTIFICATIONS_ORIGIN}/api/notifications/mobile-push/unlock`);

  console.log('account-bridge mobile-push session tests passed.');
}

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
