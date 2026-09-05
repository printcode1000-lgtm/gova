interface SellerOrderRow {
  sellerId?: unknown;
  serviceProviderId?: unknown;
}

interface ShipmentRow {
  carrierId?: unknown;
}

interface DeliveryPlanCandidateRow {
  providerId?: unknown;
}

export interface OrderPartySnapshot {
  buyerId?: unknown;
  sellerOrders: SellerOrderRow[];
  shipments?: ShipmentRow[];
  deliveryPlanCandidates?: DeliveryPlanCandidateRow[];
}

export function collectOrderPartyUids(sellerOrders: SellerOrderRow[]) {
  const sellerUids = new Set<string>();
  const providerUids = new Set<string>();
  for (const sellerOrder of sellerOrders) {
    const sellerId = String(sellerOrder.sellerId ?? "").trim();
    const providerId = String(sellerOrder.serviceProviderId ?? "").trim();
    if (sellerId) sellerUids.add(sellerId);
    if (providerId) providerUids.add(providerId);
  }
  return {
    sellerUids: Array.from(sellerUids),
    providerUids: Array.from(providerUids),
  };
}

/** Every uid that participates in an order: buyer, sellers, providers, carriers. */
export function collectAllOrderPartyUids(snapshot: OrderPartySnapshot): string[] {
  const buyerUid = String(snapshot.buyerId ?? "").trim();
  const { sellerUids, providerUids } = collectOrderPartyUids(snapshot.sellerOrders);
  const carrierUids = (snapshot.shipments ?? [])
    .map((row) => String(row.carrierId ?? "").trim())
    .filter(Boolean);
  const planProviderUids = (snapshot.deliveryPlanCandidates ?? [])
    .map((row) => String(row.providerId ?? "").trim())
    .filter(Boolean);
  return [
    ...new Set(
      [buyerUid, ...sellerUids, ...providerUids, ...carrierUids, ...planProviderUids].filter(
        Boolean,
      ),
    ),
  ];
}

/** Drop the acting user so they do not receive a push for their own mutation. */
export function excludeActorFromPartyUids(
  uids: readonly string[],
  actorUid?: string | null,
): string[] {
  const actor = String(actorUid ?? "").trim();
  return [
    ...new Set(
      uids
        .map((uid) => String(uid ?? "").trim())
        .filter((uid) => uid && uid !== actor),
    ),
  ];
}

export function resolveOrderUpdateRecipients(
  snapshot: OrderPartySnapshot,
  actorUid?: string | null,
  extraUids: readonly string[] = [],
): string[] {
  return excludeActorFromPartyUids(
    [...collectAllOrderPartyUids(snapshot), ...extraUids],
    actorUid,
  );
}
