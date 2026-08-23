import { apiSuccess } from "@/core/api/api-response";
import { runTracedBusinessRoute } from "@/core/api/traced-route";
import type { ActionInput } from "@/features/orders/server";
import { executeOrderAction } from "@/features/orders/server";

import { mapOrderError } from "../../order-api-helpers";

/**
 * The HTTP edge of an order action: read the body, name the trace, map a thrown domain error to a
 * status. The action itself lives in `@/features/orders/application`.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  return runTracedBusinessRoute("POST /api/orders/:orderId/actions", async () => {
    try {
      const { orderId } = await params;
      const body = (await request.json()) as ActionInput;
      return apiSuccess(await executeOrderAction(orderId, body));
    } catch (error) {
      return mapOrderError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
