import { asolApi } from "@/core/api/asol-api-client";
import { ASOL_API_ROUTES } from "@/core/api/asol-api-routes";
import type { UserSession } from "@/features/auth/entities/session.entity";
import type { CartItem } from "@/features/cart/cart-store";
import { notifications } from "@/features/notifications";

export async function submitCartOrder({
  session,
  couponCodes,
  items,
}: {
  session: UserSession;
  couponCodes: string[];
  items: CartItem[];
}) {
  const result = await asolApi.post<{ orderId: string }>(
    ASOL_API_ROUTES.orders.fromCart,
    {
      uid: session.uid,
      phone: session.phone,
      couponCodes,
      items: items.map((item) => ({
        productId: item.productId,
        sellerId: item.sellerId,
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        priceLabel: item.priceLabel,
        requiresSpecialVehicle: item.requiresSpecialVehicle,
        mainCategoryId: item.mainCategoryId,
      })),
    },
    { suppressErrorLog: true },
  );
  await notifications.publishEvent({
    event: {
      name: "orders.created",
      uid: session.uid,
      dedupeKey: `orders.created:${result.orderId}:buyer:${session.uid}`,
      variables: {
        orderId: result.orderId,
        orderNumber: result.orderId,
      },
    },
    locale: "ar",
  });

  return result.orderId;
}
