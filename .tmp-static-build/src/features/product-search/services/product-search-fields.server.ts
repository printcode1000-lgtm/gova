import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getBaseProductSearchFields,
  getDefaultProductSearchFieldKeys,
} from "../config/product-search-fields";
import type { ProductSearchField } from "../entities/product-search.types";

const STYLE_DIRECTORY = path.join(process.cwd(), "public", "product", "style");

const DEFAULT_VISIBLE: Record<ProductSearchField["componentKey"], boolean> = {
  mainData: true,
  price: true,
  rating: true,
  specifications: true,
  vehicleSpecs: false,
  propertySpecs: false,
  pharmacySpecs: false,
};

const DEFAULT_SEARCH_COLUMNS: Record<ProductSearchField["componentKey"], Record<string, boolean>> = {
  mainData: {
    name: true,
    brand: true,
    manufacturer: true,
    available: false,
    description: true,
  },
  price: {
    current: false,
    beforeDiscount: false,
    label: true,
    needsCar: false,
  },
  rating: {
    value: true,
  },
  specifications: {
    color: true,
    dimensions: true,
    condition: true,
    size: true,
    weight: true,
    year: true,
  },
  vehicleSpecs: {
    brand: true,
    bodyType: true,
    fuel: true,
    transmission: true,
    special: true,
  },
  propertySpecs: {
    area: true,
    rooms: true,
    bathrooms: true,
    type: true,
    address: true,
    location: false,
    finishing: true,
  },
  pharmacySpecs: {
    pharmacyCategory: true,
    pharmacySubcategory: true,
    nameAr: true,
    nameEn: true,
    activeIngredient: true,
    form: true,
    concentration: true,
    prescriptionRequired: false,
  },
};

type RawComponents = Record<string, unknown>;

function bool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function objectValue(value: unknown): RawComponents {
  return value && typeof value === "object" ? (value as RawComponents) : {};
}

async function readComponents(mainCategoryId: string, subcategoryId: string) {
  try {
    const content = await readFile(
      path.join(STYLE_DIRECTORY, `${mainCategoryId}__${subcategoryId}.json`),
      "utf8",
    );
    const parsed = JSON.parse(content) as { components?: RawComponents };
    return objectValue(parsed.components);
  } catch {
    return {};
  }
}

function componentVisible(components: RawComponents, field: ProductSearchField) {
  const component = objectValue(components[field.componentKey]);
  return bool(component.visible, DEFAULT_VISIBLE[field.componentKey]);
}

function searchColumnEnabled(components: RawComponents, field: ProductSearchField) {
  const searchColumns = objectValue(components.searchColumns);
  const group = objectValue(searchColumns[field.componentKey]);
  return bool(
    group[field.optionKey],
    DEFAULT_SEARCH_COLUMNS[field.componentKey]?.[field.optionKey] ?? false,
  );
}

export async function getEnabledProductSearchFields(
  mainCategoryId: string,
  subcategoryId: string,
) {
  const components = await readComponents(mainCategoryId, subcategoryId);
  return getBaseProductSearchFields(mainCategoryId, subcategoryId).filter(
    (field) => componentVisible(components, field) && searchColumnEnabled(components, field),
  );
}

export async function getEnabledProductSearchFieldKeys(
  mainCategoryId: string,
  subcategoryId: string,
) {
  const fields = await getEnabledProductSearchFields(mainCategoryId, subcategoryId);
  const enabled = fields.map((field) => field.key);
  return enabled.length > 0
    ? enabled
    : getDefaultProductSearchFieldKeys(mainCategoryId, subcategoryId);
}
