import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import type { SaveSellerDiscountInput } from "@/features/seller-discounts";
import { sellerDiscountService } from "@/features/seller-discounts/server";
import { assertSignedInRequest } from "@/features/auth/server";
import { resolveCartPrices } from "@/features/cart/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/profile/discounts", async () => {
    try {
      const { searchParams } = new URL(request.url);
      const sellerUid = searchParams.get("sellerUid") ?? "";
      const includeInactive = searchParams.get("includeInactive") !== "0";
      if (includeInactive) {
        const claims = assertSignedInRequest(request);
        if (!sellerUid || claims.uid !== sellerUid) throw new Error("forbidden");
      }
      const discounts = await sellerDiscountService.listSellerDiscounts(
        sellerUid,
        includeInactive,
      );
      return apiSuccess(discounts);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function PUT(request: Request) {
  return runTracedBusinessRoute("PUT /api/profile/discounts", async () => {
    try {
      const body = (await readJsonBody<unknown>(request)) as {
        sellerUid: string;
        discounts: SaveSellerDiscountInput[];
      };
      const claims = assertSignedInRequest(request);
      if (body.sellerUid && body.sellerUid !== claims.uid) throw new Error("forbidden");
      const requestedDiscounts = Array.isArray(body.discounts) ? body.discounts : [];
      const referencedProductIds = Array.from(
        new Set(
          requestedDiscounts.flatMap((discount) => [
            ...(discount.scope?.productIds ?? []),
            ...(discount.scope?.excludedProductIds ?? []),
            ...(discount.scope?.bundleProductIds ?? []),
            ...(discount.scope?.giftProductId ? [discount.scope.giftProductId] : []),
          ]).map((id) => id.trim()).filter(Boolean),
        ),
      );
      if (referencedProductIds.length > 0) {
        const products = await resolveCartPrices(referencedProductIds);
        for (const productId of referencedProductIds) {
          const product = products.get(productId);
          if (!product || product.sellerId !== claims.uid) throw new Error("invalidDiscountProductScope");
        }
      }
      const discounts = await sellerDiscountService.saveSellerDiscounts(
        claims.uid,
        requestedDiscounts,
      );
      return apiSuccess(discounts);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
