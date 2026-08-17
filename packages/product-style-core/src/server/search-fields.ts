import type {
  ProductSearchColumnSettings,
  ProductStyleSettingsComponents,
} from "../domain/style-types";
import { createDefaultProductStyleComponents } from "../domain/style-types";

type SearchableComponentKey = keyof ProductSearchColumnSettings;

export interface ProductSearchFieldShape {
  componentKey: SearchableComponentKey;
  optionKey: string;
}

const DEFAULTS = createDefaultProductStyleComponents();

export function isProductStyleComponentVisible(
  components: ProductStyleSettingsComponents,
  componentKey: SearchableComponentKey,
): boolean {
  const component = components[componentKey];
  return (
    typeof component === "object" &&
    component !== null &&
    "visible" in component &&
    component.visible === true
  );
}

export function isProductSearchColumnEnabled(
  components: ProductStyleSettingsComponents,
  field: ProductSearchFieldShape,
): boolean {
  const group = components.searchColumns[field.componentKey];
  const fallback =
    DEFAULTS.searchColumns[field.componentKey][
      field.optionKey as keyof ProductSearchColumnSettings[SearchableComponentKey]
    ] ?? false;
  if (!group || typeof group !== "object") return fallback;
  const value = (group as Record<string, boolean>)[field.optionKey];
  return typeof value === "boolean" ? value : fallback;
}

export function filterSearchFieldsByStyle<T extends ProductSearchFieldShape>(
  components: ProductStyleSettingsComponents,
  baseFields: readonly T[],
): T[] {
  return baseFields.filter(
    (field) =>
      isProductStyleComponentVisible(components, field.componentKey) &&
      isProductSearchColumnEnabled(components, field),
  );
}
