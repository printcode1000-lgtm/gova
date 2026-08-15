## Native Core & Mobile Platform Pull Request Checklist

Please ensure all of the following invariants from the `@asol/native-core` mandate are preserved:

### 1. Sealing & Boundary
- [ ] No direct imports of `@capacitor/*`, `@capawesome/*`, or `@capgo/*` outside `packages/native-core/src/adapters/`.
- [ ] No deep imports from `@asol/native-core/*` (all consumers import from `@asol/native-core` root only).
- [ ] No Capacitor types leaked into `@asol/native-core` public API signatures.
- [ ] All public functions return strict Result unions (`{ ok: true, value } | { ok: false, error: NativeCoreError }`).

### 2. Runtime Invariants (§10)
- [ ] **Pre-WebView Android Channels**: `AsolNotificationChannels.ensureCreated(this)` remains called in native `onCreate` before WebView loads.
- [ ] **Frozen Channel IDs**: All channel IDs remain frozen at `_v4` (`asol_general_v4`, `asol_orders_v4`, `asol_chat_v4`, `asol_urgent_v4`, `asol_updates_v4`, `asol_silent_v4`).
- [ ] **Notification Sound**: Sound remains addressed by resource name (`custom_notification`).
- [ ] **APNs Delegate**: iOS `AppDelegate.swift` forwards token registrations appropriately.

### 3. Verification Suite
- [ ] `npm run lint` passes with 0 errors.
- [ ] `npm run typecheck` passes with 0 errors.
- [ ] `npm run architecture:check` passes.
- [ ] `npm run test:native-core` passes.
- [ ] `npm run test:notifications` passes.
- [ ] `npm run verify:all` passes.
