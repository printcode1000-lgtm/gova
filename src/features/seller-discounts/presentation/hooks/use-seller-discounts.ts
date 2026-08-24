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
