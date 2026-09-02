import { apiSuccess } from "@/core/api/api-response";
import { loadOrderDetailForActor } from "@/features/orders/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';
import { mapOrderError } from "../order-api-helpers";

/**
 * The HTTP edge only. The join — order shards, a profile snapshot per
 * participant, and the system logging for reads allowed to fail — lives in
 * `loadOrderDetailForActor`, which the `asol-submain` mirror calls too. One
 * implementation, so the two origins cannot answer differently.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  return runTracedBusinessRoute("GET /api/orders/:orderId", async () => {
    try {
      const { orderId } = await params;
      const { searchParams } = new URL(request.url);
      return apiSuccess(await loadOrderDetailForActor(orderId, searchParams));
    } catch (error) {
      return mapOrderError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
