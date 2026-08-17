import { apiError, apiSuccess } from "@/core/api/api-response";
import { isDevelopment } from "@/core/config";
import { categoryService } from "@/features/categories";
import {
  isSafeProductStyleSelectionId,
  parseProductStyleSettings,
} from "@asol/product-style-core";
import {
  readProductStyleSettings,
  writeProductStyleSettings,
} from "@asol/product-style-core/server";

export const runtime = "nodejs";

function getSelectionIds(request: Request) {
  const url = new URL(request.url);
  return {
    mainCategoryId: url.searchParams.get("mainCategoryId") ?? "",
    subcategoryId: url.searchParams.get("subcategoryId") ?? "",
  };
}

function isValidCategorySelection(mainCategoryId: string, subcategoryId: string) {
  return categoryService.resolveProductSelection(mainCategoryId, subcategoryId).valid;
}

export async function GET(request: Request) {
  if (!isDevelopment) return apiError("Not found", 404);

  const { mainCategoryId, subcategoryId } = getSelectionIds(request);
  if (
    !isSafeProductStyleSelectionId(mainCategoryId) ||
    !isSafeProductStyleSelectionId(subcategoryId) ||
    !isValidCategorySelection(mainCategoryId, subcategoryId)
  ) {
    return apiError("Invalid category selection", 400);
  }

  try {
    const settings = await readProductStyleSettings(
      process.cwd(),
      mainCategoryId,
      subcategoryId,
    );
    if (!settings) {
      return apiSuccess({ exists: false, settings: null });
    }
    return apiSuccess({ exists: true, settings });
  } catch {
    return apiError("Failed to read product style", 500);
  }
}

export async function PUT(request: Request) {
  if (!isDevelopment) return apiError("Not found", 404);

  try {
    const settings = parseProductStyleSettings(await request.json());
    if (!settings) {
      return apiError("Invalid product style settings", 400);
    }
    if (!isValidCategorySelection(settings.mainCategoryId, settings.subcategoryId)) {
      return apiError("Invalid category relationship", 400);
    }

    await writeProductStyleSettings(process.cwd(), settings);
    return apiSuccess({ saved: true });
  } catch (error) {
    console.error("[ProductStyleAPI] Failed to save product style.", error);
    return apiError("Failed to save product style", 500);
  }
}
