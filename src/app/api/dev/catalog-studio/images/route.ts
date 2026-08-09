import { apiError, apiSuccess } from "@/core/api/api-response";
import { isDevelopment } from "@/core/config";
import type { CatalogStudioImageRoot } from "@/features/catalog-studio/domain/catalog-studio.types";
import { catalogStudioService } from "@/features/catalog-studio/services/catalog-studio.service.server";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const imageRoots = new Set<CatalogStudioImageRoot>([
  "mainCategories",
  "subcategories",
  "pharmacy",
  "vehicles",
]);

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "catalogStudioUnknownError";
  if (message === "sessionTokenInvalid" || message === "sessionTokenExpired") {
    return apiError(message, 401);
  }
  if (message === "forbidden") return apiError(message, 403);
  if (message.startsWith("catalogStudio")) return apiError(message, 400);
  console.error("[CatalogStudioImagesAPI] Operation failed.", error);
  return apiError("catalogStudioImageOperationFailed", 500, { skipPersistence: true });
}

function assertAvailable(request: Request) {
  if (!isDevelopment) throw new Error("catalogStudioDevelopmentOnly");
  assertSuperAdminRequest(request);
}

export async function POST(request: Request) {
  if (!isDevelopment) return apiError("Not found", 404, { skipPersistence: true });
  try {
    assertAvailable(request);
    const form = await request.formData();
    const file = form.get("file");
    const root = form.get("root");
    const replace = form.get("replace") === "true";
    if (!(file instanceof File) || typeof root !== "string" || !imageRoots.has(root as CatalogStudioImageRoot)) {
      throw new Error("catalogStudioImageUploadInvalid");
    }
    const auditEntry = await catalogStudioService.uploadImage({
      root: root as CatalogStudioImageRoot,
      fileName: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
      replace,
    });
    return apiSuccess({ saved: true, auditEntry });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: Request) {
  if (!isDevelopment) return apiError("Not found", 404, { skipPersistence: true });
  try {
    assertAvailable(request);
    const relativePath = new URL(request.url).searchParams.get("path") ?? "";
    if (!relativePath) throw new Error("catalogStudioImagePathRequired");
    return apiSuccess({
      trashed: true,
      auditEntry: await catalogStudioService.trashImage(relativePath),
    });
  } catch (error) {
    return routeError(error);
  }
}
