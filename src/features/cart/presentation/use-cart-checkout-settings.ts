"use client";

import * as React from "react";
import {
  EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  normalizeProfileFulfillmentSettings,
  type ProfileFulfillmentSettings,
} from "../domain/profile-fulfillment.entity";
import { reportSystemIssue } from "@asol/system-logs-core";
import { getProfileCheckoutPort } from "../ports/profile-checkout.port";

export function useCartCheckoutSettings(sellerIds: string[]) {
  const [sellerSettings, setSellerSettings] = React.useState<
    Record<string, ProfileFulfillmentSettings>
  >({});
  const [qualifiedDeliveryAvailable, setQualifiedDeliveryAvailable] =
    React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const port = getProfileCheckoutPort();
      const entries = await Promise.all(
        sellerIds.map(async (sellerId) => {
          try {
            const settings = await port.getFulfillmentSettings(sellerId);
            return [
              sellerId,
              normalizeProfileFulfillmentSettings(settings),
            ] as const;
          } catch (error) {
            reportSystemIssue({
              feature: "Cart",
              operation: "load-seller-fulfillment-settings",
              error,
            });
            return [sellerId, EMPTY_PROFILE_FULFILLMENT_SETTINGS] as const;
          }
        }),
      );
      if (!cancelled) setSellerSettings(Object.fromEntries(entries));
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [sellerIds]);

  React.useEffect(() => {
    let cancelled = false;
    if (sellerIds.length < 2) {
      setQualifiedDeliveryAvailable(false);
      return;
    }
    void getProfileCheckoutPort()
      .getUsersBySpecialty(46, 132, 0, 1)
      .then((users) => {
        if (!cancelled) setQualifiedDeliveryAvailable(users.length > 0);
      })
      .catch((error) => {
        reportSystemIssue({
          feature: "Cart",
          operation: "load-qualified-delivery-availability",
          error,
        });
        if (!cancelled) setQualifiedDeliveryAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sellerIds.length]);

  return { sellerSettings, qualifiedDeliveryAvailable };
}
