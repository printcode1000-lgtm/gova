import {
  ROUTE_OWNERSHIP,
  type ApiOwner,
  type BusinessHttpMethod,
} from "@asol/account-bridge/routes";
import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";

/**
 * The routing catalog the Cloud Accounts page renders, per account.
 *
 * Built from `ROUTE_OWNERSHIP` — the same pure registry the client router and
 * the gova compatibility boundary consume — so the page cannot show a
 * destination that differs from the one a request actually takes. Nothing is
 * generated and nothing is fetched: a static export and a native bundle render
 * exactly what the web app renders.
 *
 * Origins are deliberately absent: this is a client component, and the page it
 * feeds does not name environment variables. The account and its Vercel project
 * are what an operator needs here.
 *
 * The full per-method inventory, including which handlers each account ships
 * today, is the generated
 * `docs/09-agent-knowledge/generated/catalogs/account-routing-catalog.md`.
 * This is the operator's view of the same fact.
 */
export interface CloudAccountRouteGroup {
  readonly owner: ApiOwner;
  readonly project: string;
  readonly patterns: readonly {
    readonly pattern: string;
    readonly methods: readonly BusinessHttpMethod[];
  }[];
}

/** Route patterns grouped by the account that answers them, in registry order. */
export function cloudAccountRouteGroups(): readonly CloudAccountRouteGroup[] {
  const byOwner = new Map<ApiOwner, CloudAccountRouteGroup["patterns"][number][]>();

  for (const entry of ROUTE_OWNERSHIP) {
    const list = byOwner.get(entry.owner) ?? [];
    list.push({ pattern: entry.pattern, methods: entry.methods });
    byOwner.set(entry.owner, list);
  }

  return [...byOwner.entries()].map(([owner, patterns]) => ({
    owner,
    project: ACCOUNT_DECLARATIONS[owner]?.project ?? owner,
    patterns,
  }));
}
