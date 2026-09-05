import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import type { SaveSellerDiscountInput } from "@/features/seller-discounts";
import { sellerDiscountService } from "@/features/seller-discounts/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/profile/discounts", async () => {
    try {
      const { searchParams } = new URL(request.url);
      const sellerUid = searchParams.get("sellerUid") ?? "";
      const includeInactive = searchParams.get("includeInactive") !== "0";
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
      const discounts = await sellerDiscountService.saveSellerDiscounts(
        body.sellerUid,
        Array.isArray(body.discounts) ? body.discounts : [],
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
