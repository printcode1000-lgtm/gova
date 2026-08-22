import {
  handleDevNotificationSendOptions,
  handleDevNotificationSendPost,
} from "@/features/notifications/server/dev-notification-send-handler.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Development-only local fan-out. Production web uses the notifications service. */
export async function POST(request: Request): Promise<Response> {
  return handleDevNotificationSendPost(request);
}

export async function OPTIONS(request: Request): Promise<Response> {
  return handleDevNotificationSendOptions(request);
}
