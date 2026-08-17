import type { ProductStyleSettingsComponents } from "./style-types";

export type ProductComponentConfig = Record<string, boolean | number | string> & {
  visible: boolean;
  order: number;
};

/** Runtime layout config consumed by the product page renderer. */
export type ProductStyleComponents = ProductStyleSettingsComponents;
