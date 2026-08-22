import { createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

/**
 * Preflight for Web Push on `http://localhost:3001`.
 *
 * `next dev` is meant to behave exactly like the deployed site: the browser
 * subscribes with the same VAPID public key, registers the token through the
 * same Business API, and carries the same signed grant to a fan-out that runs
 * the same `deliverNotificationGrants`. Only the storage differs — localhost
 * reads the local SQLite `notifications.db`, production reads Turso.
 *
 * Every way that parity breaks is a configuration value, and each one fails
 * quietly:
 *
 * - No grant secret: `NotificationGrantCollector.issue` swallows the throw and
 *   returns zero grants, so the order succeeds and nothing is ever sent.
 * - No `WEB_PUSH_VAPID_PRIVATE_KEY`: the provider answers `webPushNotConfigured`
 *   inside a delivery result nobody reads.
 * - `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL` set: the browser posts grants to the
 *   deployed service, which resolves tokens from Turso and can only ever answer
 *   `no_tokens` for a device registered on localhost.
 *
 * This script names the one that is wrong instead of leaving a silent failure.
 * It is a preflight, not a test suite: it does not send to a real device.
 */

const ROOT = process.cwd();
const DEV_ORIGIN = process.env.ASOL_LOCAL_ORIGIN?.trim() || 'http://localhost:3001';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

type Level = 'OK' | 'FAIL' | 'INFO';

interface Check {
  level: Level;
  item: string;
  detail: string;
  action?: string;
}

const checks: Check[] = [];

function add(check: Check): void {
  checks.push(check);
}

function envValue(key: string): string {
  return process.env[key]?.trim() ?? '';
}

function checkEnvLocal(): void {
  const present = existsSync(path.join(ROOT, '.env.local'));
  add({
    level: present ? 'OK' : 'FAIL',
    item: '.env.local',
    detail: present ? 'present' : 'missing',
    action: present
      ? undefined
      : 'Restore it with `npm run secrets:restore`, or copy .env.example and fill the values below.',
  });
}

function checkGrantSecret(): void {
  const grant = envValue('ASOL_NOTIFICATION_GRANT_SECRET');
  const session = envValue('ASOL_SESSION_SIGNING_SECRET');
  const used = grant.length >= 32 ? 'ASOL_NOTIFICATION_GRANT_SECRET' : session.length >= 32 ? 'ASOL_SESSION_SIGNING_SECRET' : '';
  add({
    level: used ? 'OK' : 'FAIL',
    item: 'Grant signing secret',
    detail: used ? `signing with ${used}` : 'neither secret is set to 32+ characters',
    action: used
      ? undefined
      : 'Set ASOL_NOTIFICATION_GRANT_SECRET (or ASOL_SESSION_SIGNING_SECRET) in .env.local. Without it every grant is dropped silently and no notification is ever sent.',
  });
}

function checkVapidPrivateKey(): void {
  const key = envValue('WEB_PUSH_VAPID_PRIVATE_KEY');
  add({
    level: key ? 'OK' : 'FAIL',
    item: 'WEB_PUSH_VAPID_PRIVATE_KEY',
    detail: key ? 'set' : 'missing',
    action: key
      ? undefined
      : 'Set it in .env.local. Without it the Web Push provider answers webPushNotConfigured and nothing leaves the machine.',
  });
}

function checkNotificationsUrl(): void {
  const url = envValue('NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL');
  add({
    level: url ? 'FAIL' : 'OK',
    item: 'NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL',
    detail: url ? `set to ${url}` : 'empty — grants stay on the page origin',
    action: url
      ? `Leave it empty in .env.local for localhost work. Set, the browser posts grants to ${url}, which resolves tokens from Turso and always answers no_tokens for a device registered on localhost.`
      : undefined,
  });
}

function checkLocalDatabase(): void {
  const file = path.join(ROOT, 'public', 'sync_data', 'sync_sqlite', 'notifications.db');
  const present = existsSync(file);
  add({
    level: present ? 'OK' : 'FAIL',
    item: 'Local notifications database',
    detail: present ? 'public/sync_data/sync_sqlite/notifications.db' : 'missing',
    action: present ? undefined : 'Run `npm run db:ensure` to create it. Development never touches the Turso notifications database.',
  });
}

function checkServiceWorker(): void {
  const present = existsSync(path.join(ROOT, 'public', 'asol-push-sw.js'));
  add({
    level: present ? 'OK' : 'FAIL',
    item: 'Push service worker',
    detail: present ? 'public/asol-push-sw.js' : 'missing',
    action: present ? undefined : 'The browser subscribes against /asol-push-sw.js; restore the file.',
  });
}

function grantFor(send: Record<string, unknown>, secret: string): string {
  const now = Date.now();
  const encoded = Buffer.from(
    JSON.stringify({ v: 1, actorUid: null, send, issuedAt: now, expiresAt: now + 60_000 }),
  ).toString('base64url');
  return `${encoded}.${createHmac('sha256', secret).update(encoded).digest('base64url')}`;
}

/**
 * The live half, and the only one that proves the dev fan-out route answers.
 *
 * The recipient owns no device on purpose: a 200 with `no_tokens` says the grant
 * verified and the local database was read, without pushing to a real person.
 */
async function checkDevSendRoute(): Promise<void> {
  const secret =
    envValue('ASOL_NOTIFICATION_GRANT_SECRET').length >= 32
      ? envValue('ASOL_NOTIFICATION_GRANT_SECRET')
      : envValue('ASOL_SESSION_SIGNING_SECRET');
  if (secret.length < 32) {
    add({
      level: 'INFO',
      item: `${DEV_ORIGIN}/api/notifications/send`,
      detail: 'not probed — no grant secret to sign with',
    });
    return;
  }

  let response: Response;
  try {
    response = await fetch(`${DEV_ORIGIN}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant: grantFor(
          {
            uids: ['usr_localhost_preflight_no_tokens'],
            dedupeKey: `localhost-preflight:${Date.now()}`,
            title: 'preflight',
            body: 'preflight',
          },
          secret,
        ),
      }),
    });
  } catch {
    add({
      level: 'INFO',
      item: `${DEV_ORIGIN}/api/notifications/send`,
      detail: 'no dev server answering',
      action: 'Start `npm run dev` and run this check again to verify the live fan-out route.',
    });
    return;
  }

  const text = (await response.text()).slice(0, 400);
  const verified = response.status === 200 && text.includes('no_tokens');
  add({
    level: verified ? 'OK' : 'FAIL',
    item: `${DEV_ORIGIN}/api/notifications/send`,
    detail: verified ? 'HTTP 200, grant verified against the local database' : `HTTP ${response.status}: ${text}`,
    action: verified
      ? undefined
      : 'The development fan-out route did not accept a valid grant. It answers 404 unless NODE_ENV is development.',
  });
}

async function main(): Promise<void> {
  checkEnvLocal();
  checkGrantSecret();
  checkVapidPrivateKey();
  checkNotificationsUrl();
  checkLocalDatabase();
  checkServiceWorker();
  await checkDevSendRoute();

  console.log(`Web Push preflight for ${DEV_ORIGIN}\n`);
  for (const check of checks) {
    console.log(`${check.level.padEnd(4)} ${check.item}: ${check.detail}`);
    if (check.action) console.log(`     → ${check.action}`);
  }

  const failed = checks.filter((check) => check.level === 'FAIL');
  console.log(
    failed.length
      ? `\n${failed.length} blocker(s). Notifications will not behave like the deployed site until each is resolved.`
      : '\nLocalhost matches the deployed notification behaviour. Device tokens resolve from local SQLite, which is the only intended difference.',
  );
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error('Preflight failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
