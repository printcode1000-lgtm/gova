-- The Web Push VAPID pair is no longer server state.
--
-- The public key is a constant in
-- `src/features/notifications/domain/web-push-config.ts` — every subscribing
-- browser receives it anyway — and the private key is `WEB_PUSH_VAPID_PRIVATE_KEY`
-- on the notifications account, matching how Firebase and APNs credentials are
-- held. Nothing reads this table any more, and leaving it would let the local
-- SQLite schema source keep pushing it back into Turso on every schema sync.
DROP TABLE IF EXISTS `notification_vapid_settings`;
