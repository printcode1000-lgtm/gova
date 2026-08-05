/**
 * Notification bridge — the connector module.
 *
 * It exists in the application only. It is not deployed to the main account and
 * not deployed to the notifications account; it ships in the browser bundle and
 * runs there. Neither backend module knows the other exists, and neither can
 * reach the other: this module is the only path between them.
 *
 * ```text
 *                    browser (this module)
 *                    /                  \
 *      main app ────/                    \──── notifications service
 *      (issues signed grants)                  (verifies and sends)
 * ```
 *
 * See docs/05-platform-features/notification-bridge-module.md
 */
export {
  deliverNotificationGrants,
  scheduleNotificationGrantDelivery,
  type NotificationBridgeResult,
} from "./notification-bridge.client";
