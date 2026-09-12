import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import type { DiscountBuyerContext, DiscountCartItem } from "@/features/seller-discounts";
import { sellerDiscountService } from "@/features/seller-discounts/server";
import { resolveCartPrices } from "@/features/cart/server";
import { followService } from "@/features/follow/server";
import { assertSignedInRequest } from "@/features/auth/server";
import { getMarketplaceOrderQueries } from "@asol/data-core/marketplace-orders";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

const NATIVE_ORIGINS = new Set(["capacitor://localhost", "https://localhost", "ionic://localhost"]);

function isNativeRequest(request: Request): boolean {
  return NATIVE_ORIGINS.has(request.headers.get("origin")?.trim() ?? "");
}

async function authoritativeBuyerContext(
  request: Request,
  sellerUids: string[],
  couponCodes: string[],
): Promise<DiscountBuyerContext> {
  const sessionToken = request.headers.get("x-asol-session-token")?.trim() ?? "";
  if (!sessionToken) return { couponCodes, isApp: isNativeRequest(request) };

  const claims = assertSignedInRequest(request);
  const [hasPreviousOrders, followStatuses] = await Promise.all([
    getMarketplaceOrderQueries().hasBuyerOrders(claims.uid),
    Promise.all(
      sellerUids.map((sellerUid) =>
        followService.getStatus({
          targetType: "store",
          targetId: sellerUid,
          targetOwnerUid: sellerUid,
          viewerUid: claims.uid,
        }),
      ),
    ),
  ]);

  return {
    buyerUid: claims.uid,
    couponCodes,
    isApp: isNativeRequest(request),
    isFirstOrder: !hasPreviousOrders,
    isFollowerBySeller: Object.fromEntries(
      sellerUids.map((sellerUid, index) => [sellerUid, followStatuses[index]?.isFollowing === true]),
    ),
  };
}

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/profile/discounts/quote", async () => {
    try {
      const body = (await readJsonBody<unknown>(request)) as {
        items: DiscountCartItem[];
        context?: DiscountBuyerContext;
      };
      const requestedItems = Array.isArray(body.items) ? body.items : [];
      const catalogue = await resolveCartPrices(requestedItems.map((item) => item.productId));
      const items = requestedItems.map((item) => {
        const productId = item.productId.trim();
        const authoritative = catalogue.get(productId);
        if (!authoritative) throw new Error("productUnavailable");
        if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
          throw new Error("invalidCartQuantity");
        }
        return {
          id: `${productId}:${authoritative.sellerId}`,
          productId,
          sellerId: authoritative.sellerId,
          name: authoritative.name,
          quantity: item.quantity,
          unitPriceMinor: authoritative.unitPriceMinor,
          mainCategoryId: authoritative.mainCategoryId,
        } satisfies DiscountCartItem;
      });
      const sellerUids = Array.from(new Set(items.map((item) => item.sellerId)));
      const context = await authoritativeBuyerContext(
        request,
        sellerUids,
        Array.isArray(body.context?.couponCodes) ? body.context.couponCodes : [],
      );
      return apiSuccess(await sellerDiscountService.quoteCart({ items, context }));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
