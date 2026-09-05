import { ProductCard } from "@asol/product-card-core/ui";
import { ProductCardFavoriteSlot } from "@/features/favorites/ui";
import type { ProductRecord } from "@asol/product-core";
import {
  createProductCardViewModel,
  type ProductCardAction,
} from "@asol/product-card-core";

import type { ProfileProductsTabsLabels } from "./ProfileProductsTabs";

export function ProfileProductsGrid({
  featuredProductIds,
  labels,
  products,
  showManagement,
  onDeleteProduct,
  onEditProduct,
  onToggleFeatured,
  onViewProduct,
}: {
  featuredProductIds: string[];
  labels: ProfileProductsTabsLabels;
  products: ProductRecord[];
  showManagement: boolean;
  onDeleteProduct?: (product: ProductRecord) => void;
  onEditProduct?: (product: ProductRecord) => void;
  onToggleFeatured?: (product: ProductRecord) => void;
  onViewProduct: (product: ProductRecord) => void;
}) {
  return (
    <div id='features-profile-products-presentation-profileproductsgrid-div-1-m5jf20' className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => {
        const featured = featuredProductIds.includes(product.id);
        const card = createProductCardViewModel(product);
        const actions: ProductCardAction[] = [];
        if (showManagement && onToggleFeatured) {
          actions.push({
            kind: "toggleFeatured",
            label: featured ? labels.removeFeatured : labels.addFeatured,
            active: featured,
            tone: featured ? "tertiary" : undefined,
            onClick: () => onToggleFeatured(product),
          });
        }
        if (showManagement && onEditProduct) {
          actions.push({
            kind: "edit",
            label: labels.edit,
            onClick: () => onEditProduct(product),
          });
        }
        if (showManagement && onDeleteProduct) {
          actions.push({
            kind: "delete",
            label: labels.delete,
            tone: "danger",
            onClick: () => onDeleteProduct(product),
          });
        }
        return (
          <ProductCard
            key={product.id}
            card={card}
            variant={showManagement ? "profile-edit" : "profile-preview"}
            favoriteSlot={<ProductCardFavoriteSlot card={card} />}
            className="min-w-0"
            actions={actions}
            onOpen={() => onViewProduct(product)}
          />
        );
      })}
    </div>
  );
}
