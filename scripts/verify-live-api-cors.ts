import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import {
  BROWSER_REQUEST_HEADERS,
  createCorsPreflightProbeHeaders,
  inspectCorsPreflightResponse,
} from '@asol/cors';
import { ACCOUNT_DECLARATIONS } from '@asol/account-declarations';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local' });

const PROBE_ORIGIN = 'capacitor://localhost';
const MAIN_ORIGIN = process.env.NEXT_PUBLIC_ASOL_PUBLIC_WEB_ORIGIN?.trim()
  || process.env.NEXT_PUBLIC_ASOL_API_BASE_URL?.trim()
  || 'https://gova-swart.vercel.app';

const ENV_KEYS: Partial<Record<keyof typeof ACCOUNT_DECLARATIONS, string>> = {
  control: 'NEXT_PUBLIC_ASOL_CONTROL_URL',
  notifications: 'NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL',
  products: 'NEXT_PUBLIC_ASOL_PRODUCTS_URL',
  orders: 'NEXT_PUBLIC_ASOL_ORDERS_URL',
  profiles: 'NEXT_PUBLIC_ASOL_PROFILES_URL',
  submain: 'NEXT_PUBLIC_ASOL_SUBMAIN_URL',
  sub2main: 'NEXT_PUBLIC_ASOL_SUB2MAIN_URL',
};

function endpoint(target: keyof typeof ACCOUNT_DECLARATIONS): string {
  if (target === 'gova') return MAIN_ORIGIN.replace(/\/+$/, '');
  const declaration = ACCOUNT_DECLARATIONS[target];
  const envKey = ENV_KEYS[target];
  return (envKey ? process.env[envKey]?.trim() : '') || `https://${declaration.project}.vercel.app`;
}

async function verifyTarget(target: keyof typeof ACCOUNT_DECLARATIONS): Promise<string[]> {
  const base = endpoint(target);
  const response = await fetch(`${base}/api/health`, {
    method: 'OPTIONS',
    headers: createCorsPreflightProbeHeaders({
      origin: PROBE_ORIGIN,
      method: 'GET',
      requestedHeaders: BROWSER_REQUEST_HEADERS,
    }),
    redirect: 'manual',
  });
  const problems = inspectCorsPreflightResponse(response.headers, {
    origin: PROBE_ORIGIN,
    method: 'GET',
    requestedHeaders: BROWSER_REQUEST_HEADERS,
    requireVaryOrigin: true,
  });
  if (response.status !== 204) problems.unshift(`HTTP ${response.status}`);
  return problems;
}

async function main(): Promise<void> {
  const targets = Object.keys(ACCOUNT_DECLARATIONS) as Array<keyof typeof ACCOUNT_DECLARATIONS>;
  const failures: string[] = [];
  for (const target of targets) {
    try {
      const problems = await verifyTarget(target);
      if (problems.length === 0) console.log(`✅ API CORS verified: ${target} (${endpoint(target)})`);
      else failures.push(`${target} (${endpoint(target)}): ${problems.join(', ')}`);
    } catch (error) {
      failures.push(`${target} (${endpoint(target)}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length > 0) throw new Error(`Live API CORS verification failed:\n- ${failures.join('\n- ')}`);
  console.log('✅ All eight production origins satisfy the current browser CORS contract.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
