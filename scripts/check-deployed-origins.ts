#!/usr/bin/env tsx
import { loadReleaseEnvironment } from "./load-release-env";
import {
  bodyReportsUnconfiguredPort,
  mainDeployedSmokeProbe,
  SERVICE_SMOKE_PROBES,
} from "./release-service-smoke-probes";

loadReleaseEnvironment();

/**
 * Ask each deployed origin a real data question.
 *
 * Every other smoke gate tests a locally built artifact. `smoke:production`
 * and `smoke:services` start servers on this machine. `release:check` is the
 * only gate that asks a deployed origin anything — and only `gova`, by
 * comparing manifests. Nothing verified the six service origins the Android
 * and iOS bundles bake in as `NEXT_PUBLIC_ASOL_*_URL`. If a deployed account
 * is broken or its URL is wrong, the mobile app is broken and no gate notices.
 *
 * `READY` from Vercel does not mean a request succeeds — that is the lesson
 * `smoke:services` and `release:check` already encode. Health is not the
 * probe: the outage these gates exist for left `/api/health` at 200 while
 * every data route answered 500.
 *
 * Probe definitions come from `release-service-smoke-probes.ts` — the same
 * source `smoke:services` uses — so the two cannot drift. No side effects:
 * every probe is a read or a rejected write.
 */
interface OriginProbe {
  readonly account: string;
  readonly envVar: string;
  readonly path: string;
  readonly accept: readonly number[];
  readonly method?: "GET" | "POST";
  readonly body?: unknown;
}

const ACCOUNT_ENV: Record<string, string> = {
  main: "NEXT_PUBLIC_ASOL_API_BASE_URL",
  profiles: "NEXT_PUBLIC_ASOL_PROFILES_URL",
  products: "NEXT_PUBLIC_ASOL_PRODUCTS_URL",
  orders: "NEXT_PUBLIC_ASOL_ORDERS_URL",
  notifications: "NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL",
  submain: "NEXT_PUBLIC_ASOL_SUBMAIN_URL",
  sub2main: "NEXT_PUBLIC_ASOL_SUB2MAIN_URL",
};

function buildProbes(): OriginProbe[] {
  const main = mainDeployedSmokeProbe();
  const serviceProbes = SERVICE_SMOKE_PROBES.map((probe) => {
    const envVar = ACCOUNT_ENV[probe.service];
    if (!envVar) {
      throw new Error(`No NEXT_PUBLIC_ASOL_* env mapping for service "${probe.service}".`);
    }
    return {
      account: probe.service,
      envVar,
      path: probe.path,
      accept: probe.accept,
      method: probe.method,
      body: probe.body,
    };
  });
  return [
    {
      account: main.service,
      envVar: ACCOUNT_ENV.main,
      path: main.path,
      accept: main.accept,
      method: main.method,
      body: main.body,
    },
    ...serviceProbes,
  ];
}

const PROBES = buildProbes();

function requiredOrigin(envVar: string): string {
  const value = process.env[envVar]?.trim().replace(/\/$/, "");
  if (!value) {
    throw new Error(
      `[deployed-smoke] required environment variable ${envVar} is missing or empty. ` +
        "Do not skip an account — set the same NEXT_PUBLIC_ASOL_* URL the static build bakes in.",
    );
  }
  return value;
}

async function probeOrigin(probe: OriginProbe): Promise<string | null> {
  const origin = requiredOrigin(probe.envVar);
  const url = `${origin}${probe.path}`;
  try {
    const response = await fetch(url, {
      method: probe.method ?? "GET",
      headers: probe.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: probe.body === undefined ? undefined : JSON.stringify(probe.body),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    const body = (await response.text()).slice(0, 500);

    if (!probe.accept.includes(response.status)) {
      return (
        `${probe.account} ${probe.method ?? "GET"} ${url}\n` +
        `    HTTP ${response.status} — expected one of ${probe.accept.join(", ")}\n` +
        `    body: ${body}`
      );
    }

    const unconfigured = bodyReportsUnconfiguredPort(body);
    if (unconfigured.length > 0) {
      return (
        `${probe.account}: unconfigured port(s) while answering ${url}: ` +
        `${unconfigured.join(", ")}\n    body: ${body}`
      );
    }

    console.log(
      `[deployed-smoke] ${response.status} ${probe.account} ${probe.method ?? "GET"} ${url}`,
    );
    return null;
  } catch (error) {
    return (
      `${probe.account} ${probe.method ?? "GET"} ${url}\n` +
      `    ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function main(): Promise<void> {
  const failures: string[] = [];
  for (const probe of PROBES) {
    try {
      const failure = await probeOrigin(probe);
      if (failure) failures.push(failure);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (failures.length > 0) {
    console.error(
      `\n[deployed-smoke] ${failures.length} deployed origin(s) failed.\n\n${failures.join("\n\n")}\n\n` +
        "These are the origins baked into the mobile static bundle. A local " +
        "smoke:services pass does not cover them — only a request to the real URL does. " +
        "Health is not the probe: it stays 200 while data routes 500.",
    );
    process.exit(1);
  }

  console.log(
    `[deployed-smoke] All ${PROBES.length} deployed origin(s) answered a route that reaches their own data.`,
  );
}

main().catch((error) => {
  console.error("[deployed-smoke] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
