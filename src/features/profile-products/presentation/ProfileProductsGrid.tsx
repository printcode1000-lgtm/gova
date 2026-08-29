import { ProductCard } from "@/features/product-card/ui";
import type { ProductRecord } from "@asol/product-core";
import {
  createProductCardViewModel,
  type ProductCardAction,
} from "@/features/product-card";

import type { ProfileProductsTabsLabels } from "./ProfileProductsTabs";
import { createOpaqueUiInstanceId, uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "profile-products.profile-products-grid.div.2-9LC6Sr", id: "profile-products.profile-products-grid.div.2" })} id="profile-products.profile-products-grid.div" className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
            className="min-w-0"
            actions={actions}
            ui={{
              uid: "profile-products.card-P7rD4m",
              id: "profile-products.card",
              kind: "item",
              interaction: { type: "tap" },
              instance: createOpaqueUiInstanceId("profile-product", product.id),
            }}
            onOpen={() => onViewProduct(product)}
          />
        );
      })}
    </div>
  );
}
