import { ProductCard } from "@asol/product-card-core/ui";
import { SellerCard } from "@asol/seller-card-core/ui";
import {
  ProductCardFavoriteSlot,
  SellerCardFavoriteSlot,
} from "@/features/favorites/ui";
import type { ProductRecord } from "@/features/product";
import { createProductCardViewModel } from "@asol/product-card-core";
import { createSellerCardViewModel } from "@asol/seller-card-core";
import type { ProductSearchMode } from "@/features/product-search";
import type { UserProfileRow } from "@/features/profile";

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
      <div id='product-search-presentation-panel-productsearchresults-div-1-riavki' className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => {
          const card = createProductCardViewModel(product);
          return (
            <ProductCard
              key={product.id}
              card={card}
              variant="search"
              favoriteSlot={<ProductCardFavoriteSlot card={card} />}
              onOpen={() => onOpen(card.href)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div id='product-search-presentation-panel-productsearchresults-div-2-u98fnb' className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {sellers.map((seller) => {
        const card = createSellerCardViewModel(seller);
        return (
          <SellerCard
            key={seller.uid}
            card={card}
            variant="search"
            favoriteSlot={<SellerCardFavoriteSlot card={card} />}
            onOpen={() => onOpen(card.href)}
          />
        );
      })}
    </div>
  );
}
