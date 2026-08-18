import "server-only";

interface SellerOrderRow {
  seller_id?: unknown;
  service_provider_id?: unknown;
}

export function collectOrderPartyUids(sellerOrders: SellerOrderRow[]) {
  const sellerUids = new Set<string>();
  const providerUids = new Set<string>();
  for (const sellerOrder of sellerOrders) {
    const sellerId = String(sellerOrder.seller_id ?? "").trim();
    const providerId = String(sellerOrder.service_provider_id ?? "").trim();
    if (sellerId) sellerUids.add(sellerId);
    if (providerId) providerUids.add(providerId);
  }
  return {
    sellerUids: Array.from(sellerUids),
    providerUids: Array.from(providerUids),
  };
}
