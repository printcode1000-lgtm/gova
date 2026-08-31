import { createServer } from "node:http";

import {
  createDeviceDiscoveryDocument,
  deviceDiscoveryAuthorized,
  resolveDeviceDiscoveryConfig,
} from "@asol/local-agent-core";
import {
  collectDirectCandidates,
  DEFAULT_ALLOWED_CAPABILITIES,
  hostIdentifier,
  loadOrCreateHostIdentityKey,
  loadOrRotateDiscoveryChallenge,
  resolveDirectAgentPort,
} from "@asol/local-agent-core/direct";
import {
  createOtaR2Client,
  putOtaObject,
} from "../packages/ota-core/src/publishing/adapters/r2-storage.adapter";
import {
  getOtaPublicBaseUrl,
  loadOtaEnvironment,
} from "../packages/ota-core/src/publishing/config/ota-config";

async function readPublicIp(): Promise<string | null> {
  for (const url of ["https://api.ipify.org", "https://ifconfig.me/ip", "https://icanhazip.com"]) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.ok) {
        const value = (await response.text()).trim();
        if (/^[a-f0-9:.]+$/i.test(value)) return value;
      }
    } catch {
      // Try next endpoint.
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

async function publish(document: unknown, key: string): Promise<string> {
  loadOtaEnvironment();
  await putOtaObject(createOtaR2Client(), key, `${JSON.stringify(document, null, 2)}\n`, "application/json", "no-store");
  return `${getOtaPublicBaseUrl().replace(/\/$/, "")}/${key}`;
}

function serve(document: unknown, password: string, port: number): Promise<void> {
  const server = createServer((request, response) => {
    const authorized = deviceDiscoveryAuthorized(
      {
        authorization: request.headers.authorization,
        "x-asol-port-password": request.headers["x-asol-port-password"] as string | undefined,
      },
      password,
    );
    if (!authorized) {
      response.writeHead(401, {
        "content-type": "application/json; charset=utf-8",
        "www-authenticate": 'Basic realm="asol-device-discovery"',
      });
      response.end(`${JSON.stringify({ ok: false, error: "unauthorized" })}\n`);
      return;
    }
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(`${JSON.stringify({ ok: true, document }, null, 2)}\n`);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      console.log(JSON.stringify({ listening: server.address(), role: "discovery-only", execution: false }, null, 2));
      resolve();
    });
  });
}

async function main(): Promise<void> {
  const config = resolveDeviceDiscoveryConfig();
  const publicIp = await readPublicIp();
  const directPort = resolveDirectAgentPort();
  const identity = loadOrCreateHostIdentityKey();
  const challenge = loadOrRotateDiscoveryChallenge();
  const candidates = await collectDirectCandidates({ port: directPort, publicIp, stunServers: [] });
  const document = createDeviceDiscoveryDocument({
    port: config.port,
    publicIp,
    hostId: hostIdentifier(),
    directPort,
    serverKeyId: identity.serverKeyId,
    serverPublicKey: identity.publicKeyPem,
    challenge: challenge.challenge,
    challengeExpiresAt: challenge.expiresAt,
    capabilities: [...DEFAULT_ALLOWED_CAPABILITIES],
    candidates,
  });

  if (hasFlag("dry-run")) {
    console.log(JSON.stringify({ dryRun: true, r2Key: config.r2Key, document }, null, 2));
    return;
  }

  const url = await publish(document, config.r2Key);
  console.log(JSON.stringify({ published: true, schemaVersion: 2, r2Key: config.r2Key, publicUrl: url }, null, 2));
  if (hasFlag("publish-only")) return;
  await serve(document, config.password, config.port);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
