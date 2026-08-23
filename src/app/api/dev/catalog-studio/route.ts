import { apiError, apiSuccess, readJsonBody } from "@/core/api/api-response";
import { isDevelopment } from "@/core/config";
import type { CatalogStudioValidateInput } from "@/features/catalog-studio";
import { catalogStudioService } from "@/features/catalog-studio/server";
import { assertSuperAdminRequest } from "@/features/super-admin/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function catalogStudioError(error: unknown) {
  const message = error instanceof Error ? error.message : "catalogStudioUnknownError";
  if (message === "sessionTokenInvalid" || message === "sessionTokenExpired") {
    return apiError(message, 401);
  }
  if (message === "forbidden") return apiError(message, 403);
  if (message.includes("ConcurrentChange") || message === "catalogStudioSaveBusy") {
    return apiError(message, 409);
  }
  if (message.startsWith("catalogStudio")) return apiError(message, 400);
  console.error("[CatalogStudioAPI] Operation failed.", error);
  return apiError("catalogStudioOperationFailed", 500, { skipPersistence: true });
}

function assertAvailable(request: Request) {
  if (!isDevelopment) throw new Error("catalogStudioDevelopmentOnly");
  assertSuperAdminRequest(request);
}

export async function GET(request: Request) {
  if (!isDevelopment) return apiError("Not found", 404, { skipPersistence: true });
  try {
    assertAvailable(request);
    return apiSuccess(await catalogStudioService.snapshot());
  } catch (error) {
    return catalogStudioError(error);
  }
}

export async function POST(request: Request) {
  if (!isDevelopment) return apiError("Not found", 404, { skipPersistence: true });
  try {
    assertAvailable(request);
    const input = await readJsonBody<CatalogStudioValidateInput>(request);
    if (!Array.isArray(input.files)) throw new Error("catalogStudioDraftInvalid");
    return apiSuccess(await catalogStudioService.validateDrafts(input.files));
  } catch (error) {
    return catalogStudioError(error);
  }
}

export async function PUT(request: Request) {
  if (!isDevelopment) return apiError("Not found", 404, { skipPersistence: true });
  try {
    assertAvailable(request);
    const input = await readJsonBody<CatalogStudioValidateInput>(request);
    if (!Array.isArray(input.files)) throw new Error("catalogStudioDraftInvalid");
    const result = await catalogStudioService.saveDrafts(input.files);
    return apiSuccess(result);
  } catch (error) {
    return catalogStudioError(error);
  }
}
