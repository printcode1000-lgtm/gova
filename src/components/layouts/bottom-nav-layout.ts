/**
 * Space a scrollable page must leave free under the bottom navigation bar.
 *
 * `--asol-bottom-nav-space` is measured by `BottomNavBar` (its own padding
 * already includes the bottom system inset) and falls back to the value
 * declared in `globals.css`, which is built from `--asol-safe-area-bottom`.
 */
export const BOTTOM_NAV_CLEARANCE = 'var(--asol-bottom-nav-clearance)';
