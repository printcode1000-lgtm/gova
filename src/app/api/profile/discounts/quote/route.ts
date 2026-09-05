import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import type {
  DiscountBuyerContext,
  DiscountCartItem,
} from "@/features/seller-discounts";
import { sellerDiscountService } from "@/features/seller-discounts/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/profile/discounts/quote", async () => {
    try {
      const body = (await readJsonBody<unknown>(request)) as {
        items: DiscountCartItem[];
        context?: DiscountBuyerContext;
      };
      const quote = await sellerDiscountService.quoteCart({
        items: Array.isArray(body.items) ? body.items : [],
        context: body.context,
      });
      return apiSuccess(quote);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
