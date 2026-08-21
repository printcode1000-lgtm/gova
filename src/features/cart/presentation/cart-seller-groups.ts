import { getCartTotalMinor, type CartItem } from "@/features/cart/cart-store";
import { calculateSellerShipping } from "@/features/cart/shipping-pricing";
import {
  EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  type ProfileFulfillmentSettings,
} from "@/features/profile/entities/profile-fulfillment-settings.entity";

export function sellerIdsFromCartItems(items: CartItem[]) {
  return Array.from(new Set(items.map((item) => item.sellerId))).filter(Boolean);
}

export function buildCartSellerGroups({
  items,
  sellerIds,
  sellerSettings,
}: {
  items: CartItem[];
  sellerIds: string[];
  sellerSettings: Record<string, ProfileFulfillmentSettings>;
}) {
  return sellerIds.map((sellerId) => {
    const sellerItems = items.filter((item) => item.sellerId === sellerId);
    const subtotalMinor = getCartTotalMinor(sellerItems);
    const settings =
      sellerSettings[sellerId] ?? EMPTY_PROFILE_FULFILLMENT_SETTINGS;
    const hasSpecialVehicle = sellerItems.some(
      (item) => item.requiresSpecialVehicle,
    );
    const shipping = calculateSellerShipping(
      settings.shippingPricing,
      subtotalMinor,
      hasSpecialVehicle,
    );

    return {
      sellerId,
      items: sellerItems,
      settings,
      subtotalMinor,
      shippingMinor: shipping.confirmedShippingMinor,
      specialVehicleFeeMinor: shipping.specialVehicleFeeMinor,
      quoteRequired: shipping.quoteRequired,
      eligibleForFree: shipping.freeThresholdApplied,
      hasSpecialVehicle,
    };
  });
}
