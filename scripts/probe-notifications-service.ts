import { createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';

/**
 * End-to-end probe for the notifications service.
 *
 * A grant is the only way into that service, so a probe has to sign one. It
 * deliberately targets a uid that owns no device: the response proves the
 * signature verified, the notifications database was reachable, and tokens were
 * resolved — without delivering anything to a real person.
 *
 * The second call posts a tampered grant. That check matters more than the first
 * after any change to the grant format: if a forged payload were ever accepted,
 * anyone could push anything to anyone.
 */

if (existsSync('.env.local')) dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const baseUrl = (
  process.env.NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL ?? ''
).replace(/\/+$/, '');
const secret =
  process.env.ASOL_NOTIFICATION_GRANT_SECRET?.trim() ||
  process.env.ASOL_SESSION_SIGNING_SECRET?.trim() ||
  '';

if (!baseUrl) {
  console.error('NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL is not set.');
  process.exit(1);
}
if (secret.length < 32) {
  console.error('ASOL_NOTIFICATION_GRANT_SECRET is missing or too short.');
  process.exit(1);
}

function sign(encoded: string): string {
  return createHmac('sha256', secret).update(encoded).digest('base64url');
}

function grantFor(send: Record<string, unknown>): string {
  const now = Date.now();
  const encoded = Buffer.from(
    JSON.stringify({ v: 1, actorUid: null, send, issuedAt: now, expiresAt: now + 60_000 }),
  ).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

async function post(body: unknown): Promise<{ status: number; text: string }> {
  const response = await fetch(`${baseUrl}/api/notifications/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: (await response.text()).slice(0, 400) };
}

async function main(): Promise<void> {
  console.log(`Probing ${baseUrl}`);

  const health = await fetch(`${baseUrl}/api/health`);
  console.log(`\nhealth: HTTP ${health.status}`);
  console.log(`  ${(await health.text()).slice(0, 300)}`);

  const valid = grantFor({
    uids: ['usr_probe_no_tokens'],
    dedupeKey: `probe:${Date.now()}`,
    title: 'probe',
    body: 'probe',
  });
  const accepted = await post({ grants: [valid] });
  console.log(`\nvalid grant: HTTP ${accepted.status}`);
  console.log(`  ${accepted.text}`);

  // Same signature, widened recipients — must be refused.
  const [encoded, signature] = valid.split('.');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  payload.send.uids.push('usr_victim');
  const forged = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${signature}`;
  const refused = await post({ grants: [forged] });
  console.log(`\ntampered grant: HTTP ${refused.status}`);
  console.log(`  ${refused.text}`);

  const tamperRejected = refused.text.includes('notificationGrantInvalid');
  console.log(
    `\ntamper rejected: ${tamperRejected ? 'YES' : 'NO — INVESTIGATE IMMEDIATELY'}`,
  );
  if (!tamperRejected) process.exit(1);

  const unsigned = await post({ grants: ['not-a-grant'] });
  console.log(`unsigned body rejected: ${unsigned.text.includes('notificationGrant') ? 'YES' : 'NO'}`);
}

main().catch((error) => {
  console.error('Probe failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
