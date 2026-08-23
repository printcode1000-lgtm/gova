import { apiError, apiSuccess } from "@/core/api/api-response";
import { featureFlagService } from "@/features/feature-flags/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

/**
 * The live control plane for capability-backed features.
 *
 * Public by design: the response says which features are switched on, nothing
 * about who is asking. Keeping it unauthenticated means a guest, a logged-out
 * device, and the splash screen all see the same switches, so a feature can be
 * withdrawn from every client at once.
 */
export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/feature-flags", async () => {
    const query = new URL(request.url).searchParams;
    const uid = query.get("uid");
    const phone = query.get("phone");
    if (!uid || !phone) {
      return apiSuccess(await featureFlagService.getPublicValues());
    }
    try {
      return apiSuccess(
        await featureFlagService.listForAdmin({ uid, phone }),
      );
    } catch (error) {
      if (error instanceof Error && error.message === "forbidden") {
        return apiError("forbidden", 403);
      }
      throw error;
    }
  });
}

export async function PUT(request: Request) {
  return runTracedBusinessRoute("PUT /api/feature-flags", async () => {
    const body = (await request.json()) as {
      identity?: { uid: string; phone: string };
      key?: string;
      enabled?: boolean;
      notes?: string;
    };
    if (!body.identity || typeof body.key !== "string" || typeof body.enabled !== "boolean") {
      return apiError("invalidRequest", 400);
    }
    try {
      return apiSuccess(
        await featureFlagService.setFlag({
          identity: body.identity,
          key: body.key,
          enabled: body.enabled,
          notes: body.notes,
        }),
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      if (reason === "forbidden") return apiError("forbidden", 403);
      if (reason === "featureFlagUnknown") return apiError("featureFlagUnknown", 400);
      throw error;
    }
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204 });
}
