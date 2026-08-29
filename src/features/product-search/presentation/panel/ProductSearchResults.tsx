import { ProductCard } from "@/features/product-card/ui";
import { SellerCard } from "@/features/seller-card/ui";
import type { ProductRecord } from "@/features/product";
import { createProductCardViewModel } from "@/features/product-card";
import { createSellerCardViewModel } from "@/features/seller-card";
import type { ProductSearchMode } from "@/features/product-search";
import type { UserProfileRow } from "@/features/profile";
import { createOpaqueUiInstanceId, uiAttributes } from "@asol/ui-registry-core";

export function ProductSearchResults({
  activeMode,
  isCompact,
  products,
  sellers,
  onOpen,
}: {
  activeMode: ProductSearchMode;
  isCompact: boolean;
  products: ProductRecord[];
  sellers: UserProfileRow[];
  onOpen: (href: string) => void;
}) {
  if (isCompact) return null;

  if (activeMode === "products") {
    return (
      <div {...uiAttributes({ uid: "product-search.panel.product-search-results.div.3-nI0ogY", id: "product-search.panel.product-search-results.div.3" })} id="product-search.panel.product-search-results.div" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => {
          const card = createProductCardViewModel(product);
          return (
            <ProductCard
              key={product.id}
              card={card}
              variant="search"
              ui={{
                uid: "search-result-PE6WW4",
                id: "search-result",
                kind: "item",
                interaction: { type: "tap" },
                simulation: { kind: "list-item", id: "search-result" },
                instance: createOpaqueUiInstanceId("product", product.id),
              }}
              onOpen={() => onOpen(card.href)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div {...uiAttributes({ uid: "product-search.panel.product-search-results.div.4-cE3UcP", id: "product-search.panel.product-search-results.div.4" })} id="product-search.panel.product-search-results.div.2" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {sellers.map((seller) => {
        const card = createSellerCardViewModel(seller);
        return (
          <SellerCard
            key={seller.uid}
            card={card}
            variant="search"
            ui={{
              uid: "search-seller-result-S3lL9r",
              id: "search-seller-result",
              kind: "item",
              interaction: { type: "tap" },
              simulation: { kind: "list-item", id: "search-seller-result" },
              instance: createOpaqueUiInstanceId("seller", seller.uid),
            }}
            onOpen={() => onOpen(card.href)}
          />
        );
      })}
    </div>
  );
}
