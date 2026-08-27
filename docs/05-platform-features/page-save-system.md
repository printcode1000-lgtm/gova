# Page Save System

`@asol/page-save-core` is the **only** place ASOL performs a user-triggered save, upload, or delete.

No page, dialog, card, or list row anywhere in `src/` or `packages/` may carry its own save button, upload button, delete button, or confirmation message. Pages *stage* the work; the header save icon and its dialog execute it.

## Package

| Door | Path |
| ---- | ---- |
| Browser/runtime | `@asol/page-save-core` → `packages/page-save-core/src/index.ts` |

The registry stores registrations keyed by scope id. Each editable surface registers through `usePageSaveRegistration` in `src/features/page-save/presentation/hooks/use-page-save-registration.ts`.

IndexedDB belongs to `@asol/data-core`. The package names a `PageSaveStoragePort`; `src/features/page-save/application/page-save-core-bootstrap.ts` binds it to `ASOL_DB_STORES.PAGE_SAVE_PENDING` and `ASOL_DB_STORES.PAGE_SAVE_JOURNAL` (DB version 11), and `src/core/composition/browser-ports.ts` registers it. No IndexedDB code lives inside `@asol/page-save-core`.

The generated push service worker mirrors the same database name, version, and store list; edit `packages/data-core/src/browser/workers/asol-push-sw.js` and run `npm run data-access:sync-public`.

## Contract

### Registration

| API | Purpose |
| --- | ------- |
| `registerPageSave()` | Mount a page save scope with save items |
| `updatePageSaveRegistration()` | Sync label, return path, items, saving, canSave |
| `openPageSaveDialog()` / `closePageSaveDialog()` | Header dialog lifecycle |
| `setPageSaveItemSelected()` | Toggle staged-operation selection; form-derived items reject selection changes |
| `executePageSave()` | Execute checked work and permanently discard unchecked staged operations |
| `getPageSaveSnapshot()` | Read header + dialog state, including `lastResult` |
| `acknowledgePageSaveResult()` | Read and clear `lastResult` (the header consumes it for one check mark) |
| `subscribePageSave()` | React external store subscription |
| `hydratePageSavePendingFromStorage()` | Restore pending icon state after app restart |
| `dropPageSaveItems()` | Forget items whose executors cannot outlive the page. Async — it writes the pending record, so a caller that cannot await must still catch, or a storage rejection becomes an unhandled one |
| `configurePageSaveCore()` | Wire IndexedDB storage port (bootstrap only) |

### Operation journal

Every execution is journalled before the first request leaves the device, so an
interruption leaves evidence instead of silence.

| API | Purpose |
| --- | ------- |
| `hydratePageSaveRecoveryFromStorage()` | Read what the previous session left unfinished (called once at startup) |
| `recoverPageSaveJournal()` | Classify journal entries and prune the unambiguous ones |
| `acknowledgePageSaveInterruption()` | Clear one recovered entry after the user has seen it |
| `acknowledgePageSaveJournalEntry()` | Delete a journal entry directly |
| `buildPageSaveOperationId()` | `scopeId::itemId`, the journal key |

| Status | Meaning | Recovery verdict | Safe to retry |
| ------ | ------- | ---------------- | ------------- |
| `pending` | Recorded, never started | `incomplete` | yes (pruned on read) |
| `running` | Request left the device, answer never arrived | `needsConfirmation` | **no** |
| `failed` | Rejected; nothing was applied | `failed` | yes |
| `succeeded` | Applied; the entry is deleted | `completed` | n/a (pruned) |

A `running` entry is the only ambiguous state, and it is **never replayed
automatically** — replay is what would duplicate a write or an upload. It stays
in the journal, the header icon shows, and `PageSaveDialog` names the operation
and asks the user to check before acting. Retries of the same intent keep their
`idempotencyKey` and increment `attempts`, so a backend that honours the key can
reject a duplicate.

Image upload de-duplication is not repeated here: `@asol/storage-image-manager-core`
owns the draft store and upload queue that make a staged file resumable.

### Staged operations

Deletes, uploads, and one-shot saves that used to sit behind their own button are staged in the package's operation queue instead.

| API | Purpose |
| --- | ------- |
| `stagePageSaveOperation()` | Queue one `save` / `upload` / `delete` with its executor |
| `unstagePageSaveOperation()` | Remove a single staged operation |
| `clearPageSaveOperations()` | Drop a scope's staged operations, returning their item ids |
| `listPageSaveOperations()` | Read a scope's staged operations |
| `hasPageSaveOperation()` | Test whether one item is staged |
| `buildPageSaveOperationItems()` | Convert staged operations into registration items (referentially stable) |
| `runPageSaveOperations()` | Execute the selected staged operations, in stage order |

A staged operation that fails **stays staged**, so the dialog can list it again
on the next attempt, and `executePageSave()` reports failure. An unchecked
staged operation is different: pressing **Execute** unstages and drops it
without calling its executor. Closing the dialog alone never removes it.

### Item shape

```ts
{ id, label, operation, isDirty, canSave, description?, ephemeral? }
```

`operation` is `"save" | "upload" | "delete"` and defaults to `"save"`.
`ephemeral` marks an item whose work lives only in memory (a staged operation's
closure); such items drive the header while mounted but are never written to the
pending store, so a force-close cannot resurrect an item that can no longer
run. Only these staged, ephemeral items may be unchecked. Form-derived items
are always selected because their edited values remain in the mounted form and
would immediately make a discarded item dirty again.

The dialog derives the per-item wording from `operation` (`pageSave.operation.*`), so **pages never author save/upload/delete copy**. `description` is an optional override for surface-specific context, such as the number of products affected by removing a specialty.

## React helpers

| Hook | File | Use |
| ---- | ---- | --- |
| `usePageSaveRegistration` | `src/features/page-save/presentation/hooks/use-page-save-registration.ts` | Register a scope whose dirtiness comes from form state |
| `usePageSaveOperations` | `src/features/page-save/presentation/hooks/use-page-save-operations.ts` | Stage operations for a scope that also has form items; merge `items` into the registration and call `run()` from `save` |
| `usePageSaveOperationScope` | `src/features/page-save/presentation/hooks/use-page-save-operation-scope.ts` | Register a scope whose only work is staged operations |

On unmount both operation hooks call `dropPageSaveItems()` with the ids they cleared. Only those items are forgotten; other dirty items in the same scope keep their persisted pending record.

## Active scope resolution

Several scopes can be mounted at once (a product page shows both the editor and the reviews surface). The header drives whichever registration currently has dirty items, falling back to the most recently registered one.

## Header indicator

`PageSaveHeaderButton` in `src/features/page-save/presentation/PageSaveHeaderButton.tsx` is mounted in `AppHeader`. `PageSaveRuntimeInit` in `AppShell` registers storage ports and hydrates pending records on startup.

- Appears when the active scope has dirty items, is saving, or a persisted pending record exists
- Shows wave animation while dirty (not saving)
- While save runs, shows the project `LoadingSpinner` in place of the save icon
- After a successful save with no remaining dirty items, briefly shows a check icon, then hides. The check fires on the observed saving phase **or** on `lastResult === "success"`, so a save that resolves before React paints the spinner still confirms; the header acknowledges the result so it cannot flash again on another page. The countdown lives in its own effect, keyed on the flash state alone.
- Opens `PageSaveDialog` on tap (does not save immediately)

## Save dialog

`PageSaveDialog` shows:

- Page name (`label` / `pageLabel`)
- Dirty items with checkboxes (**selected by default**)
- Staged-operation checkboxes are interactive; form-derived checkboxes are
  visibly disabled, remain checked, carry `aria-disabled`, and explain that
  they are always included because they come from the open page
- A per-item description derived from `operation`, or the item's own `description`
- Blocked items when `canSave` is false for that item
- **Execute** runs checked dirty items in stage order and permanently discards
  unchecked staged operations without running them
- **Close** only closes the dialog; it preserves items and their staged
  checked/unchecked state exactly
- Tapping the inspector tool (or other overlay chrome) does not close the
  dialog. While the inspector is enabled, outside taps do not close it either
  so elements on the dialog can be picked. Close and Escape still dismiss it.
- Execute and Close remain on one non-wrapping footer row at every viewport
- Execute dismisses the dialog immediately; the save runs in the background and
  the header icon carries the saving state. The dialog is never held open while
  work is in flight
- On failure the registry reopens the dialog and shows `pageSave.failure`; `snapshot.lastResult` carries `"success" | "failure"`

After a successful save the registry marks the saved items clean immediately so the header icon hides without waiting for the next React sync. A short held-clean pass suppresses one stale dirty re-registration from React before new edits surface again.

The icon and the dialog track **dirty work only**. A persisted pending record
whose items are all clean is deleted on hydration and never counts as pending,
and `openPageSaveDialog()` refuses to open when no dirty row would be listed and
nothing is interrupted or saving. An empty "choose what to save" dialog is a bug.

When the user confirms save while the target page is not mounted, the registry navigates to `returnPath`, reopens the dialog on that page, and completes save there.

## Image uploads

`StorageImageManager` always stages files locally and exposes `hasPending()` / `uploadPending()` on the manager handle. It has no upload button and no remove confirmation. Features must:

1. Register image upload as a page-save item (see `buildImageUploadPageSaveItem()`)
2. Implement `prepareForSave(selectedItemIds)` to call `uploadPending()` for selected image items
3. Never render a per-slot upload button

Onboarding image handles can register through `registerPageSaveImageUploadHandle()` in `src/features/page-save/infrastructure/runtime/page-save-image-upload-registry.ts`.

## Persistence

While any item stays dirty, the registry writes a `PageSavePendingRecord` to
IndexedDB. After app close/reopen, `hydratePageSavePendingFromStorage()` keeps
the header icon visible until the user executes or all items become clean.
Persisted form items are normalized to selected on hydration. Execute removes
completed form items from the pending record; discarded staged operations are
unstaged and dropped through the package APIs and therefore cannot return after
navigation or restart.

Staged operations keep their durability in the journal, not the pending record: their executors are in-memory closures, so their items carry `ephemeral: true` and are filtered out of `PageSavePendingRecord`. A pending record must only ever describe work the app can still run. Their items are dropped when the staging surface unmounts or the scope becomes disabled (sign-out, leaving edit mode).

Re-staging an item id that was just saved brings the header icon back: the registry prunes its held-clean pass once the item leaves the list.

## Page integration

Every user-triggered save surface must:

1. Register with `usePageSaveRegistration({ id, label, returnPath, items, isSaving, canSave, save })`
2. Expose one or more `items` (`id`, `label`, `isDirty`, `canSave`, `operation`)
3. Implement `save(selectedItemIds)` and return `boolean`
4. Route staged image uploads through `prepareForSave()` when applicable
5. Stage deletes and one-shot writes through the operation queue instead of running them on tap
6. Carry no save/upload/delete button, confirmation, or result message of its own

### Current registrations

| Scope ID | Surface | Staged operations |
| -------- | ------- | ----------------- |
| `profile-edit` | `/profile?mode=edit` unified editor | Product deletion from `ProductsCard` |
| `product-*` | Product create/edit (`product-images`, `product-details`) | — |
| `product-reviews:*` | Product/store reviews and seller replies | Review save/delete, reply save/delete |
| `custom-request` | `/custom-request` special order | Image upload + request submit |
| `account-deletion` | `/delete-account` | Account deletion (phrase gate stays on the page) |
| `super-admin-users` | `/super-admin/users` | Super-admin deletion of a user account, one staged item per row |
| `data-health` | `/super-admin/data-health` | Quarantine release, quarantined image delete |
| `dev-cloud-backup` | `/super-admin/dev-cloud-backup` | Backup create, saved-backup update, restore, delete |
| `super-admin-hero-slider` | Home hero slider admin | — |
| `super-admin-featured-marquee` | Featured products marquee admin | — |
| `super-admin-trending-ribbon` | Trending ribbon admin | — |
| `super-admin-logs` | `/super-admin/logs` | Clear all logs, clear one section |
| `system-logs-floating` | Floating error badge | Clear all logs |
| `catalog-studio` | Catalog Studio JSON drafts + staged image upload | Move catalog image to the developer trash |
| `data-health` | `/super-admin/data-health` | Cleanup plan, order purge, quarantine image delete, quarantine clear, run-history clear, cleanup-audit clear |
| `dev-cloud-backup` | `/dev/cloud-backup` | Delete a saved local backup |
| `pharmacy-catalog-manager` | `/profile/pharmacy-catalog` | Create/rename category and subcategory, visibility changes for categories, subcategories, and products |
| `developer-product-style` | `/dev/category-selector` | — |
| `release-console-store-text` | Google Play store text/listings | — |
| `release-console-store-images` | Google Play staged image uploads | — |
| `release-console-store-assets` | Google Play asset deletions | Store image delete, listing delete |
| `release-console-play-tracks` | Google Play track update form | — |
| `release-console-ota-rollout` | OTA rollout percentage | — |
| `onboarding` | Seller onboarding wizard | — |
| `onboarding-product-form` | Onboarding product draft while the form is open | — |

The registrations above were audited for Execute/discard semantics. Form-only
and form-derived upload scopes use locked checkboxes. Mixed scopes keep their
form items locked and allow only their staged operations to be unchecked.
Operation-only scopes (`product-reviews:*`, `super-admin-users`, logs,
data-health, dev-cloud-backup, and store-asset deletion scopes) may discard an
unchecked staged operation. No integration calls `setPageSaveItemSelected`
outside the shared dialog, and no scope relies on an unchecked operation
surviving Execute for a later run.

## What this package does not own

`@asol/page-save-core` orchestrates **page-authored persistence**: content a user
creates, edits, deletes, or uploads on a page. Writes owned by another package
keep their own lifecycle and are deliberately outside this surface — cart
(`cart-store`), favorites, follow, review "helpful" votes, specialty chat,
order lifecycle actions, authentication and session, notification devices and
preferences, telemetry, theme and app preferences, and client query caches.

Pulling those into the registry would move another package's responsibility into
this one and would replace immediate interactions with a deferred confirmation.
`src/features/page-save/tests/page-save-write-surface.test.ts` freezes the exact
set of client modules allowed to perform a content write, so a new bypass fails a
gate instead of shipping. Composition roots under `src/core/composition/` are
skipped: they wire those methods into ports and do not run the write.

## Forbidden patterns

- Any save, upload, or delete button outside `PageSaveDialog`
- `window.confirm` anywhere in `src/` or `packages/` (enforced by test)
- Page-owned "saved successfully" / "failed to save" / "unsaved changes" messaging
- Copy that instructs the user to press the save icon
- Duplicate save banners that trigger persistence outside `executePageSave()`
- Deep imports from `@asol/page-save-core/src/**`

Buttons that *stage* an operation are allowed, but must read as staging (`إضافة الحذف للحفظ`), not as the destructive action itself.

Controls that only edit form state — dropping a slide, a contact row, a trending text, a discount — must read as a removal (`إزالة` / `Remove`), never as `حذف` / `Delete`. Nothing outside the page-save dialog deletes, so nothing outside it may claim to. The ownership test enforces this on `aria-label` and on the `labels.delete` prop.

## Tests

```bash
npm run test:page-save-core
```

Runs the registry/queue unit tests, `packages/page-save-core/src/tests/journal-recovery.test.ts` (interrupted, failed, and never-started operations, and the no-replay rule), `packages/page-save-core/src/tests/header-visibility.test.ts` (which pins every header state — first edit, undo, partial save, failure, multi-scope pages, staged-operation saves, unmount, and restart-with-pending), plus `src/features/page-save/tests/page-save-write-surface.test.ts` (the frozen content-write allowlist and the no-fire-and-forget rule) and `src/features/page-save/tests/page-save-ownership.test.ts`, which scans every source file for native confirmations, deep imports, page-owned save messaging, and missing scope registrations on the staging surfaces.

Structural coverage also lives in `src/features/storage/tests/image-upload-queue.test.ts` for import-door enforcement on migrated surfaces.
