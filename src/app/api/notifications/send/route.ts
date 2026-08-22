import { runTracedBusinessRoute } from "@/core/api/traced-route";
import {
  handleDevNotificationSendOptions,
  handleDevNotificationSendPost,
} from "@/features/notifications/server/dev-notification-send-handler.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Development-only local fan-out. Production web uses the notifications service.
 *
 * Traced like every other business route. The handler answers a malformed body
 * itself, but `deliverNotificationGrants` throws on a grant that fails to
 * verify — without the wrapper that became an untraced 500 that no system log
 * ever recorded, which is what `validate:error-logging` refuses to ship.
 */
export async function POST(request: Request): Promise<Response> {
  return runTracedBusinessRoute("POST /api/notifications/send", () =>
    handleDevNotificationSendPost(request),
  );
}

export async function OPTIONS(request: Request): Promise<Response> {
  return handleDevNotificationSendOptions(request);
}
