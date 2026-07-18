import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { contactService } from "@/features/contact/services/contact-service.server";
import type { ContactMessageInput } from "@/features/contact/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactMessageInput;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    return apiSuccess(await contactService.send(body, ip));
  } catch (error) { return mapServiceError(error); }
}
export async function OPTIONS() { return new Response(null, { status: 204 }); }
