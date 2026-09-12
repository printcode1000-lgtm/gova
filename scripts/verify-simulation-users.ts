import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';

const actors = [
  'BUYER_01', 'BUYER_02', 'BUYER_03',
  'SELLER_01', 'SELLER_02', 'SELLER_03',
  'PROVIDER_01', 'PROVIDER_02', 'PROVIDER_03',
] as const;

type Result = {
  actor: string;
  http: number;
  uid: string | null;
  providerAccountEnabled: boolean | null;
  specialties: unknown;
};

async function main(): Promise<void> {
  const env = dotenv.parse(readFileSync('.env.local', 'utf8'));
  const results: Result[] = [];
  for (const actor of actors) {
    const prefix = `SIM_${actor}`;
    const response = await fetch('http://127.0.0.1:3001/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        phone: env[`${prefix}_PHONE`],
        password: env[`${prefix}_PASSWORD`],
      }),
    });    const payload = await response.json().catch(() => ({}));
    const data = (payload as { data?: Record<string, unknown> }).data ?? payload as Record<string, unknown>;
    results.push({
      actor,
      http: response.status,
      uid: typeof data.uid === 'string' ? data.uid : null,
      providerAccountEnabled:
        typeof data.providerAccountEnabled === 'boolean'
          ? data.providerAccountEnabled
          : null,
      specialties: data.specialties ?? null,
    });
  }

  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => result.http !== 200 || !result.uid)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});