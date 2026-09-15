import "server-only";

import { apiError, apiSuccess, mapServiceError } from "@/core/api/api-response";
import { runTracedBusinessRoute } from "@/core/api/traced-route";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { deleteAllMarketplaceOrders } from "@asol/data-core/marketplace-orders";

export async function DELETE(request: Request) {
  return runTracedBusinessRoute("DELETE /api/super-admin/orders/clear", async () => {
    try {
      assertSuperAdminRequest(request);
      await deleteAllMarketplaceOrders();
      return apiSuccess({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "forbidden") return apiError("forbidden", 403);
      if (message === "sessionTokenInvalid" || message === "sessionTokenExpired") return apiError(message, 401);
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
