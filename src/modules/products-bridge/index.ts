/**
 * Products bridge — the connector module for the products split.
 *
 * It exists in the application only. It is not deployed to the main account and
 * not deployed to the products account; it ships in the browser bundle and runs
 * there. Neither backend module knows the other exists, and neither can reach
 * the other: this module is the only path between them.
 *
 * ```text
 *                    browser (this module)
 *                    /                  \
 *      main app ────/                    \──── products service
 *   writes, everything else               product reads
 * ```
 *
 * See docs/05-platform-features/products-service-module.md
 */
export {
  getProductsServiceUrl,
  resolveProductsServiceOrigin,
} from "./products-bridge.client";
