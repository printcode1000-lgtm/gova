/**
 * Shared data-route probes for isolated-account smoke gates.
 *
 * `smoke:services` and `smoke:deployed` must ask the same questions. Duplicating
 * the table let the two drift; this module is the single source of truth for
 * path, method, body, and accepted statuses per service account.
 *
 * Health is intentionally absent — the outage these gates exist for left
 * `/api/health` at 200 while every data route answered 500.
 */
export interface ServiceSmokeProbe {
  readonly service: string;
  /** A route that reaches this account's own repositories. */
  readonly path: string;
  /** Codes meaning the handler ran. 400/401/403/404/405 are answers. */
  readonly accept: readonly number[];
  /** Defaults to GET. Several accounts expose writes only. */
  readonly method?: "GET" | "POST";
  readonly body?: unknown;
  /**
   * When set, the probe must answer a redirect whose `location` points at this
   * account's origin. Redirects are never followed for such a probe: following
   * one would prove the owner works and say nothing about the boundary that
   * issued it.
   */
  readonly expectRedirectToAccount?: string;
}

export const SERVICE_SMOKE_PROBES: readonly ServiceSmokeProbe[] = [
  {
    service: "profiles",
    path: "/api/profile/store-details?uid=asol_smoke_probe",
    accept: [200, 400, 404],
  },
  {
    service: "products",
    path: "/api/products?limit=1",
    accept: [200, 400],
  },
  {
    service: "orders",
    path: "/api/orders?uid=asol_smoke_probe&phone=%2B200000000000&limit=1&offset=0",
    accept: [200, 400, 401, 403, 404],
  },
  {
    // This account exposes /send only — there is no /preferences here, and
    // probing it returned Next's own 404, which proved nothing about the
    // account's ports.
    //
    // 400 is accepted because this environment has no VAPID keys or grant
    // secret, and the route rightly refuses to deliver without them. What
    // separates that from an unregistered port is the reason, which the route
    // now logs instead of swallowing — the scan below reads it.
    service: "notifications",
    path: "/api/notifications/send",
    method: "POST",
    body: { grant: "asol_smoke_probe" },
    accept: [200, 400],
  },
  {
    service: "submain",
    path: "/api/search/products?q=probe&categoryId=1&limit=1",
    accept: [200, 400],
  },
  {
    // sub2main serves writes only, so a GET answered 405 — routing, which says
    // nothing about its ports. Probing /api/products instead was worse: an
    // incomplete payload crashed productService.create on a field it reads
    // before validating, and that 500 would have failed every release for a
    // fault in the probe. This route guards its input with Array.isArray, so
    // an empty cart is a real quote out of the seller-discounts repository —
    // no write, and an unconfigured port throws into mapServiceError as a 500.
    service: "sub2main",
    path: "/api/profile/discounts/quote",
    method: "POST",
    body: { items: [] },
    accept: [200],
  },
];

/**
 * Main (`gova`) no longer implements any Business API, so a data read cannot be
 * its probe. What must be true of the deployed gova artifact is exactly two
 * things, and both are asked here.
 */
export function controlDeployedSmokeProbe(): ServiceSmokeProbe {
  // Control is never one of the six workloads, so it is not in
  // SERVICE_SMOKE_PROBES and `smoke:services` does not loop over it. It is
  // still verified on every release, by its own probe.
  //
  // An unauthenticated Super Admin request is that probe: 401/403 proves the
  // runtime is up, its session port is registered, and its auth boundary
  // rejects — which /api/health cannot show. A 200 would be a worse failure
  // than a 500.
  return { service: "control", path: "/api/system-logs/summary", accept: [401, 403] };
}

export function mainDeployedSmokeProbes(): readonly ServiceSmokeProbe[] {
  const products = SERVICE_SMOKE_PROBES.find((probe) => probe.service === "products");
  if (!products) {
    throw new Error("SERVICE_SMOKE_PROBES must include products for the main deployed probe.");
  }
  return [
    // gova answers its own surface.
    { service: "main", path: "/api/health", accept: [200] },
    // ...and hands every legacy Business API request to its owner without
    // executing it. A 200 here would mean a Business API function shipped in
    // the gova artifact.
    {
      service: "main",
      path: products.path,
      accept: [307],
      expectRedirectToAccount: "products",
    },
  ];
}

/** True when a response body shows a port that never registered. */
export function bodyReportsUnconfiguredPort(body: string): string[] {
  if (!body.includes("is not configured")) return [];
  const named = [...body.matchAll(/[\w.]+ is not configured/g)].map((m) => m[0]);
  return named.length > 0 ? [...new Set(named)] : ["is not configured"];
}
