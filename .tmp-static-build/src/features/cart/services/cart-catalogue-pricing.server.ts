import "server-only";

import { productRepository } from "@/modules/data-access/domains/product/index.server";

/**
 * Resolves cart prices from the catalogue instead of trusting the request.
 *
 * The order route used to take `unitPriceMinor` straight from the request body.
 * A modified client could therefore order a 10,000 EGP product for 1 EGP: the
 * only check was that the number was a non-negative integer, never that it was
 * *this product's* price. The seller's acceptance step was the sole thing
 * standing between that and a completed order.
 *
 * The catalogue is now authoritative. Whatever price the client sends is
 * discarded, and the stored price is used — so a stale cart silently charges
 * the correct amount rather than failing the order, which is the gentler
 * behaviour for a buyer who left a tab open.
 *
 * Seller and product name are resolved the same way and for the same reason:
 * they identify who gets paid and what was bought.
 */

/** Non-empty `price_label` means "ask for a price"; there is no number to trust. */
export interface ResolvedCartPrice {
  unitPriceMinor: number;
  priceLabel: string;
  sellerId: string;
  name: string;
  requiresSpecialVehicle: boolean;
}

export class CartProductUnavailableError extends Error {
  constructor(readonly productId: string) {
    super("productUnavailable");
    this.name = "CartProductUnavailableError";
  }
}

/**
 * Converts the stored major-unit price text to minor units.
 *
 * `price_current` is TEXT (`"500"` meaning 500 EGP) because it is authored in a
 * form, so it can be blank, malformed, or carry separators. Anything that is not
 * a clean number is treated as "no price", which routes the item to the
 * price-on-request path rather than silently becoming zero.
 */
function toMinorUnits(current: string): number | null {
  const normalized = current.trim().replace(/,/g, "");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export async function resolveCartPrices(
  productIds: readonly string[],
): Promise<Map<string, ResolvedCartPrice>> {
  const unique = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))];
  const resolved = new Map<string, ResolvedCartPrice>();

  // Sequential rather than parallel: a cart is a handful of items, and the
  // products database is on its own account with its own connection budget.
  for (const productId of unique) {
    const product = await productRepository.findById(productId);
    if (!product || product.status === "archived") {
      throw new CartProductUnavailableError(productId);
    }

    const minor = toMinorUnits(product.price.current);
    const label = product.price.label.trim();

    resolved.set(productId, {
      // A labelled item is priced by the seller later; it must reach the order
      // as 0 + label, exactly as the price-on-request flow already expects.
      unitPriceMinor: label ? 0 : (minor ?? 0),
      priceLabel: label || (minor === null ? "السعر عند الطلب" : ""),
      sellerId: product.uid,
      name: product.mainData.name,
      requiresSpecialVehicle: product.price.needsCar,
    });
  }

  return resolved;
}
