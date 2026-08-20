import type { ClientActorInput } from "./actor-from-input";
import type { ActorRole } from "./enums";

/**
 * The wire shape of `GET /api/orders`, parsed once.
 *
 * Two deployments answer this route — the main application and the orders mirror — and both were
 * reading the same six query parameters by hand. A page size that defaults differently on one of
 * them is a paging bug that only appears for whichever deployment the bridge reached, so the
 * defaults belong to the domain rather than to either route file.
 */
export interface OrderListQuery {
  actorInput: ClientActorInput;
  limit: number;
  offset: number;
}

export const ORDER_LIST_DEFAULT_LIMIT = 5;

export function parseOrderListQuery(params: URLSearchParams): OrderListQuery {
  return {
    actorInput: {
      uid: params.get("uid") ?? "",
      phone: params.get("phone") ?? "",
      role: (params.get("role") as ActorRole | null) ?? undefined,
    },
    limit: Number(params.get("limit") ?? String(ORDER_LIST_DEFAULT_LIMIT)),
    offset: Number(params.get("offset") ?? "0"),
  };
}
