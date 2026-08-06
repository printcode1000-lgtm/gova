/**
 * Service bridge — the connector module for the read-only service splits.
 *
 * It exists in the application only. It is deployed to no account; it ships in
 * the main app's browser bundle and runs there. No deployed module knows another
 * exists, and none can reach another: this module is the only path between them.
 *
 * ```text
 *                    browser (this module)
 *              ╱───────────┼───────────╲
 *      main app            │            products / orders services
 *   writes, everything else            the reads they own
 * ```
 *
 * See docs/05-platform-features/service-bridge-module.md
 */
export { resolveServiceOrigin } from "./service-bridge.client";
