import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { apiError, apiSuccess } from "@/core/api/api-response";
import { isDevelopment } from "@/core/config";

export const runtime = "nodejs";

const SAFE_SELECTION_ID = /^[a-z0-9-]+$/i;
const STYLE_DIRECTORY = path.join(process.cwd(), "public", "product", "style");
const STYLE_INDEX_PATH = path.join(STYLE_DIRECTORY, "index.json");
const STYLE_FILE_PATTERN = /^([a-z0-9-]+)__([a-z0-9-]+)\.json$/i;

interface ProductStyleSettings {
  mainCategoryId: string;
  subcategoryId: string;
  components: {
    images: {
      visible: boolean;
      count: number;
      order: number;
    };
    rating: {
      visible: boolean;
      type: "stars" | "stars-comments";
      order: number;
    };
    price: {
      visible: boolean;
      current: boolean;
      beforeDiscount: boolean;
      needsCar: boolean;
      order: number;
    };
    order: {
      visible: boolean;
      cart: boolean;
      favorite: boolean;
      contact: boolean;
      order: number;
    };
    mainData: {
      visible: boolean;
      name: boolean;
      brand: boolean;
      manufacturer: boolean;
      available: boolean;
      description: boolean;
      order: number;
    };
    specifications: {
      visible: boolean;
      color: boolean;
      dimensions: boolean;
      condition: boolean;
      size: boolean;
      weight: boolean;
      year: boolean;
      order: number;
    };
    vehicleSpecs: {
      visible: boolean;
      brand: boolean;
      bodyType: boolean;
      fuel: boolean;
      transmission: boolean;
      order: number;
    };
    propertySpecs: {
      visible: boolean;
      area: boolean;
      rooms: boolean;
      bathrooms: boolean;
      type: boolean;
      address: boolean;
      location: boolean;
      finishing: boolean;
      order: number;
    };
    pharmacySpecs: {
      visible: boolean;
      nameAr: boolean;
      nameEn: boolean;
      form: boolean;
      concentration: boolean;
      activeIngredient: boolean;
      order: number;
    };
  };
}

function getSelectionIds(request: Request) {
  const url = new URL(request.url);
  return {
    mainCategoryId: url.searchParams.get("mainCategoryId") ?? "",
    subcategoryId: url.searchParams.get("subcategoryId") ?? "",
  };
}

function isSafeSelectionId(value: string) {
  return value.length > 0 && SAFE_SELECTION_ID.test(value);
}

function getStylePath(mainCategoryId: string, subcategoryId: string) {
  return path.join(STYLE_DIRECTORY, `${mainCategoryId}__${subcategoryId}.json`);
}

async function rebuildPublicStyleIndex() {
  const fileNames = await readdir(STYLE_DIRECTORY);
  const files = fileNames
    .map((file) => {
      const match = STYLE_FILE_PATTERN.exec(file);
      if (!match || file === "index.json") return null;
      return {
        mainCategoryId: match[1],
        subcategoryId: match[2],
        file,
        path: `/product/style/${file}`,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => left.file.localeCompare(right.file, "en"));

  const temporaryIndexPath = `${STYLE_INDEX_PATH}.${Date.now()}.tmp`;
  await writeFile(
    temporaryIndexPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2)}\n`,
    "utf8",
  );
  await rename(temporaryIndexPath, STYLE_INDEX_PATH);
}

function isValidSettings(value: unknown): value is ProductStyleSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as ProductStyleSettings;
  return (
    isSafeSelectionId(settings.mainCategoryId) &&
    isSafeSelectionId(settings.subcategoryId) &&
    typeof settings.components?.images?.visible === "boolean" &&
    Number.isInteger(settings.components.images.count) &&
    settings.components.images.count >= 0 &&
    // Make order optional for backward compatibility
    (settings.components.images.order === undefined ||
      (Number.isInteger(settings.components.images.order) &&
        settings.components.images.order >= 1)) &&
    typeof settings.components?.rating?.visible === "boolean" &&
    (settings.components.rating.type === "stars" ||
      settings.components.rating.type === "stars-comments") &&
    // Make order optional for backward compatibility
    (settings.components.rating.order === undefined ||
      (Number.isInteger(settings.components.rating.order) &&
        settings.components.rating.order >= 1)) &&
    // Make price optional for backward compatibility
    (settings.components.price === undefined ||
      (typeof settings.components.price.visible === "boolean" &&
        typeof settings.components.price.current === "boolean" &&
        typeof settings.components.price.beforeDiscount === "boolean" &&
        typeof settings.components.price.needsCar === "boolean" &&
        (settings.components.price.order === undefined ||
          (Number.isInteger(settings.components.price.order) &&
            settings.components.price.order >= 1)))) &&
    // Make order optional for backward compatibility
    (settings.components.order === undefined ||
      (typeof settings.components.order.visible === "boolean" &&
        typeof settings.components.order.cart === "boolean" &&
        typeof settings.components.order.favorite === "boolean" &&
        typeof settings.components.order.contact === "boolean" &&
        (settings.components.order.order === undefined ||
          (Number.isInteger(settings.components.order.order) &&
            settings.components.order.order >= 1)))) &&
    // Make mainData optional for backward compatibility
    (settings.components.mainData === undefined ||
      (typeof settings.components.mainData.visible === "boolean" &&
        typeof settings.components.mainData.name === "boolean" &&
        typeof settings.components.mainData.brand === "boolean" &&
        typeof settings.components.mainData.manufacturer === "boolean" &&
        typeof settings.components.mainData.available === "boolean" &&
        typeof settings.components.mainData.description === "boolean" &&
        (settings.components.mainData.order === undefined ||
          (Number.isInteger(settings.components.mainData.order) &&
            settings.components.mainData.order >= 1)))) &&
    // Make specifications optional for backward compatibility
    (settings.components.specifications === undefined ||
      (typeof settings.components.specifications.visible === "boolean" &&
        typeof settings.components.specifications.color === "boolean" &&
        typeof settings.components.specifications.dimensions === "boolean" &&
        typeof settings.components.specifications.condition === "boolean" &&
        typeof settings.components.specifications.size === "boolean" &&
        typeof settings.components.specifications.weight === "boolean" &&
        typeof settings.components.specifications.year === "boolean" &&
        (settings.components.specifications.order === undefined ||
          (Number.isInteger(settings.components.specifications.order) &&
            settings.components.specifications.order >= 1)))) &&
    // Make vehicleSpecs optional for backward compatibility
    (settings.components.vehicleSpecs === undefined ||
      (typeof settings.components.vehicleSpecs.visible === "boolean" &&
        typeof settings.components.vehicleSpecs.brand === "boolean" &&
        typeof settings.components.vehicleSpecs.bodyType === "boolean" &&
        typeof settings.components.vehicleSpecs.fuel === "boolean" &&
        typeof settings.components.vehicleSpecs.transmission === "boolean" &&
        (settings.components.vehicleSpecs.order === undefined ||
          (Number.isInteger(settings.components.vehicleSpecs.order) &&
            settings.components.vehicleSpecs.order >= 1)))) &&
    // Make propertySpecs optional for backward compatibility
    (settings.components.propertySpecs === undefined ||
      (typeof settings.components.propertySpecs.visible === "boolean" &&
        typeof settings.components.propertySpecs.area === "boolean" &&
        typeof settings.components.propertySpecs.rooms === "boolean" &&
        typeof settings.components.propertySpecs.bathrooms === "boolean" &&
        typeof settings.components.propertySpecs.type === "boolean" &&
        typeof settings.components.propertySpecs.address === "boolean" &&
        typeof settings.components.propertySpecs.location === "boolean" &&
        typeof settings.components.propertySpecs.finishing === "boolean" &&
        (settings.components.propertySpecs.order === undefined ||
          (Number.isInteger(settings.components.propertySpecs.order) &&
            settings.components.propertySpecs.order >= 1)))) &&
    // Make pharmacySpecs optional for backward compatibility
    (settings.components.pharmacySpecs === undefined ||
      (typeof settings.components.pharmacySpecs.visible === "boolean" &&
        typeof settings.components.pharmacySpecs.nameAr === "boolean" &&
        typeof settings.components.pharmacySpecs.nameEn === "boolean" &&
        typeof settings.components.pharmacySpecs.form === "boolean" &&
        typeof settings.components.pharmacySpecs.concentration === "boolean" &&
        typeof settings.components.pharmacySpecs.activeIngredient ===
          "boolean" &&
        (settings.components.pharmacySpecs.order === undefined ||
          (Number.isInteger(settings.components.pharmacySpecs.order) &&
            settings.components.pharmacySpecs.order >= 1))))
  );
}

export async function GET(request: Request) {
  if (!isDevelopment) return apiError("Not found", 404);

  const { mainCategoryId, subcategoryId } = getSelectionIds(request);
  if (!isSafeSelectionId(mainCategoryId) || !isSafeSelectionId(subcategoryId)) {
    return apiError("Invalid category selection", 400);
  }

  try {
    const content = await readFile(
      getStylePath(mainCategoryId, subcategoryId),
      "utf8",
    );
    const settings: unknown = JSON.parse(content);
    if (!isValidSettings(settings)) {
      return apiError("Invalid product style file", 500);
    }
    return apiSuccess({ exists: true, settings });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return apiSuccess({ exists: false, settings: null });
    }
    return apiError("Failed to read product style", 500);
  }
}

export async function PUT(request: Request) {
  if (!isDevelopment) return apiError("Not found", 404);

  try {
    const settings: unknown = await request.json();
    if (!isValidSettings(settings)) {
      return apiError("Invalid product style settings", 400);
    }

    await mkdir(STYLE_DIRECTORY, { recursive: true });
    const filePath = getStylePath(
      settings.mainCategoryId,
      settings.subcategoryId,
    );
    const temporaryPath = `${filePath}.${Date.now()}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(settings, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, filePath);
    await rebuildPublicStyleIndex();

    return apiSuccess({ saved: true });
  } catch {
    return apiError("Failed to save product style", 500);
  }
}
