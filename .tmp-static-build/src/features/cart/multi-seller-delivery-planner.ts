export interface DeliverySellerDraft {
  sellerId: string;
  carrierUids: string[];
  fallbackShippingMinor: number;
  fallbackSpecialVehicleFeeMinor: number;
  requiresLocationQuote: boolean;
  requiresSpecialVehicle: boolean;
}

export interface DeliveryProviderCandidate {
  providerId: string;
  source: "linked" | "qualified_network";
  coverageScore: number;
  sellerIds: string[];
}

export interface MultiSellerDeliveryDraft {
  enabled: boolean;
  strategy: "unified" | "separate";
  candidates: DeliveryProviderCandidate[];
  fallbackConfirmedPriceMinor: number;
  fallbackHasPendingQuotes: boolean;
  specialVehicleRequired: boolean;
  sellerCount: number;
}

export function createMultiSellerDeliveryDraft(
  sellers: DeliverySellerDraft[],
  qualifiedProviderUids: string[],
  candidateLimit = 12,
): MultiSellerDeliveryDraft {
  const uniqueSellers = Array.from(
    new Map(sellers.map((seller) => [seller.sellerId, seller])).values(),
  );
  const linkedCoverage = new Map<string, number>();
  const linkedSellers = new Map<string, Set<string>>();
  for (const seller of uniqueSellers) {
    for (const providerId of new Set(seller.carrierUids.filter(Boolean))) {
      linkedCoverage.set(providerId, (linkedCoverage.get(providerId) ?? 0) + 1);
      const covered = linkedSellers.get(providerId) ?? new Set<string>();
      covered.add(seller.sellerId);
      linkedSellers.set(providerId, covered);
    }
  }

  const qualified = new Set(qualifiedProviderUids.filter(Boolean));
  for (const providerId of linkedCoverage.keys()) qualified.add(providerId);

  const candidates = Array.from(qualified)
    .map((providerId): DeliveryProviderCandidate => {
      const coverageScore = linkedCoverage.get(providerId) ?? 0;
      return {
        providerId,
        source: coverageScore > 0 ? "linked" : "qualified_network",
        coverageScore,
        sellerIds:
          coverageScore > 0
            ? Array.from(linkedSellers.get(providerId) ?? []).sort()
            : uniqueSellers.map((seller) => seller.sellerId),
      };
    })
    .sort(
      (left, right) =>
        right.coverageScore - left.coverageScore ||
        left.providerId.localeCompare(right.providerId),
    )
    .slice(0, Math.max(1, candidateLimit));

  const enabled = uniqueSellers.length > 1 && candidates.length > 0;
  return {
    enabled,
    strategy: enabled ? "unified" : "separate",
    candidates,
    fallbackConfirmedPriceMinor: uniqueSellers.reduce(
      (total, seller) => total + seller.fallbackShippingMinor,
      0,
    ),
    fallbackHasPendingQuotes: uniqueSellers.some(
      (seller) => seller.requiresLocationQuote,
    ),
    specialVehicleRequired: uniqueSellers.some(
      (seller) => seller.requiresSpecialVehicle,
    ),
    sellerCount: uniqueSellers.length,
  };
}
