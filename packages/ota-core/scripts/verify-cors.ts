import { loadReleaseToolEnvironment } from '@asol/env-core/process';
import { getOtaR2CloudflareCredentials, getOtaR2S3Credentials } from '../src/publishing/config/ota-r2-target';
import { buildDefaultOtaCorsRules, type OtaR2CorsRule } from './lib/ota-cors-policy';

loadReleaseToolEnvironment();
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

function normalize(values: readonly string[] | undefined, lower = false): string[] {
  return (values ?? []).map((value) => lower ? value.toLowerCase() : value).sort();
}
function canonical(rules: readonly OtaR2CorsRule[]) {
  return rules.map((rule) => ({
    id: rule.id ?? '',
    origins: normalize(rule.allowed.origins),
    methods: normalize(rule.allowed.methods.map((method) => method.toUpperCase())),
    headers: normalize(rule.allowed.headers, true),
    exposeHeaders: normalize(rule.exposeHeaders, true),
    maxAgeSeconds: rule.maxAgeSeconds ?? 0,
  })).sort((a, b) => a.id.localeCompare(b.id));
}

async function main(): Promise<void> {
  const cloudflare = getOtaR2CloudflareCredentials();
  const bucket = getOtaR2S3Credentials().bucketName;
  const verify = await fetch(`${CF_API_BASE}/accounts/${cloudflare.accountId}/tokens/verify`, {
    headers: { Authorization: `Bearer ${cloudflare.apiToken}` },
  });
  const verifyBody = await verify.json() as { success?: boolean; result?: { status?: string } };
  if (!verify.ok || !verifyBody.success || verifyBody.result?.status !== 'active') throw new Error('OTA Cloudflare API token is not active');

  const response = await fetch(`${CF_API_BASE}/accounts/${cloudflare.accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`, {
    headers: { Authorization: `Bearer ${cloudflare.apiToken}`, 'Content-Type': 'application/json' },
  });
  const body = await response.json() as { success?: boolean; result?: { rules?: OtaR2CorsRule[] }; errors?: Array<{ message?: string }> };
  if (!response.ok || !body.success) throw new Error(`OTA bucket CORS could not be read: HTTP ${response.status} ${body.errors?.map((item) => item.message).filter(Boolean).join('; ') ?? ''}`.trim());
  if (JSON.stringify(canonical(body.result?.rules ?? [])) !== JSON.stringify(canonical(buildDefaultOtaCorsRules()))) {
    throw new Error('OTA bucket CORS differs from the project policy. Run npm run ota:sync:cors.');
  }
  console.log(`✅ OTA R2 CORS verified: ${bucket}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
