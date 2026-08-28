"use client";

import * as React from "react";
import { sellerDiscountApiService } from "../../application/services/seller-discount-api-service";
import type {
  SaveSellerDiscountInput,
  SellerDiscountRule,
} from "../../domain/seller-discount.entity";

import { useTranslation } from "@/shared/i18n";

export function useSellerDiscounts(sellerUid: string, includeInactive = true) {
  const { formatApiError } = useTranslation();
  const [discounts, setDiscounts] = React.useState<SellerDiscountRule[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    if (!sellerUid) {
      setDiscounts([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setDiscounts(
        await sellerDiscountApiService.listSellerDiscounts(
          sellerUid,
          includeInactive,
        ),
      );
    } catch (nextError) {
      setError(formatApiError(nextError));
    } finally {
      setIsLoading(false);
    }
  }, [formatApiError, includeInactive, sellerUid]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  // This loader is hand-rolled rather than a cached query, so nothing else
  // brings it back after a dropped connection. A load that failed retries the
  // moment the browser reports a network again; a load that succeeded is left
  // alone, because reconnecting is not a reason to refetch what is already here.
  React.useEffect(() => {
    if (!error || typeof window === "undefined") return;
    const handleOnline = () => void reload();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [error, reload]);

  const save = React.useCallback(
    async (next: SaveSellerDiscountInput[]) => {
      const saved = await sellerDiscountApiService.saveSellerDiscounts(
        sellerUid,
        next,
      );
      setDiscounts(saved);
      return saved;
    },
    [sellerUid],
  );

  return { discounts, setDiscounts, isLoading, error, reload, save };
}
