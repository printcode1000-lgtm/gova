import { ProductCard } from "@/components/ui/product-card";
import { SellerCard } from "@/components/ui/seller-card";
import type { ProductRecord } from "@/features/product/entities/product.entity";
import { createProductCardViewModel } from "@/features/product-card";
import { createSellerCardViewModel } from "@/features/seller-card";
import type { ProductSearchMode } from "@/features/product-search";
import type { UserProfileRow } from "@/features/profile/services/profile-service.interface";

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => {
          const card = createProductCardViewModel(product);
          return (
            <ProductCard
              key={product.id}
              card={card}
              variant="search"
              onOpen={() => onOpen(card.href)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {sellers.map((seller) => {
        const card = createSellerCardViewModel(seller);
        return (
          <SellerCard
            key={seller.uid}
            card={card}
            variant="search"
            onOpen={() => onOpen(card.href)}
          />
        );
      })}
    </div>
  );
}
