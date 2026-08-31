import { createServer } from "node:http";

import {
  createDeviceDiscoveryDocument,
  deviceDiscoveryAuthorized,
  resolveDeviceDiscoveryConfig,
} from "@asol/local-agent-core";
import {
  createOtaR2Client,
  getOtaPublicBaseUrl,
  loadOtaEnvironment,
  putOtaObject,
} from "@asol/ota-core/publishing";

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
      // Try the next public-IP endpoint.
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
  await putOtaObject(
    createOtaR2Client(),
    key,
    `${JSON.stringify(document, null, 2)}\n`,
    "application/json",
    "no-store",
  );
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
      const address = server.address();
      console.log(JSON.stringify({ listening: address, auth: "x-asol-port-password", passwordFromEnv: true }, null, 2));
      resolve();
    });
  });
}

async function main(): Promise<void> {
  const config = resolveDeviceDiscoveryConfig();
  const publicIp = await readPublicIp();
  const document = createDeviceDiscoveryDocument({ port: config.port, publicIp });

  if (hasFlag("dry-run")) {
    console.log(JSON.stringify({ dryRun: true, r2Key: config.r2Key, document }, null, 2));
    return;
  }

  const url = await publish(document, config.r2Key);
  console.log(JSON.stringify({ published: true, r2Key: config.r2Key, publicUrl: url }, null, 2));

  if (hasFlag("publish-only")) return;
  await serve(document, config.password, config.port);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
