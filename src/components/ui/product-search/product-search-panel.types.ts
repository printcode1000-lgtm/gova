import type { ProductRecord } from "@/features/product/entities/product.entity";
import type {
  ProductSearchMode,
  ProductSearchSort,
} from "@/features/product-search";

export type ProductSearchPanelLocale = "ar" | "en";

export interface ProductSearchPanelProps {
  variant: "compact" | "full";
  mode?: ProductSearchMode;
  ownerUid?: string;
  fixedMainCategoryId?: string;
  fixedSubcategoryId?: string;
  includeDrafts?: boolean;
  locale?: ProductSearchPanelLocale;
  initialQuery?: string;
  initialSort?: ProductSearchSort;
  onProductsChange?: (products: ProductRecord[]) => void;
  onLoadingChange?: (loading: boolean) => void;
}
