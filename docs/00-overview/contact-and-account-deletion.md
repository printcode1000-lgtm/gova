# Contact Us and Account Deletion

## Contact Us Page

- Public Route: `/contact-us`.
- Rebuilt within React and Next.js to align with Asol design, supporting both Arabic and English languages as well as RTL and LTR layouts.
- Retains phone numbers, email, Facebook, Instagram, and TikTok links, working hours, and the approved QR code from the legacy page.
- Sends the contact form submission to `suezbazaar@gmail.com` using the configured Gmail account from password recovery environment variables, setting the sender's email in `Reply-To`.
- Server validates name, email, service type, and message content, allowing up to 3 attempts per IP address per 15-minute window for each server instance.
- Endpoint: `POST /api/contact`.

## Account Deletion Page

- Public Route: `/delete-account`, accessible from the Contact Us page.
- UI lives in `src/features/auth/components/AccountDeletionPageContent.tsx`.
- Core deletion logic lives in `@asol/auth-core/server` (`AccountDeletionService`).
- Requires authentication, a signed `sessionToken` header, current password, exact confirmation text matching either `DELETE ASOL ACCOUNT` or `احذف حساب أصول نهائيا`, and approval of the final warning.
- Super Admin account cannot be deleted from this page.
- The page has no delete button. It registers the `account-deletion` scope in `@asol/page-save-core`; the password, confirmation phrase, and final-warning checkbox gate `canSave`, and the header save icon runs the deletion. See `docs/05-platform-features/page-save-system.md`.
- Endpoint: `POST /api/account/delete`.

## Super Admin User Deletion

- Super Admin Route: `/super-admin/users`.
- UI lives in `src/features/super-admin/presentation/SuperAdminUsersPage.tsx` with dialog `SuperAdminUserDeleteDialog.tsx`.
- Core deletion method: `AccountDeletionService.deleteBySuperAdmin(targetUid)` in `@asol/auth-core/server`.
- Protected endpoint: `POST /api/super-admin/users/delete`.
- Authenticated via super-admin signed session token.
- Cannot delete a Super Admin account (`accountDeletionSuperAdminForbidden`).
- Executes the full 6-step deletion orchestration (`ACCOUNT_DELETION_STEP_ORDER`) and logs the operation to `persistentSystemLogService`.
- Covered by `npm run test:super-admin-users`, which runs in `build`, `build:static`, and `test`.

#### Confirmation Gate

The dialog's destructive button stays disabled until the admin retypes the
target's own phone number — its UID when a profile-only record carries no phone.

A super admin works down a list of rows, so the realistic mistake is deleting
the wrong account rather than not meaning it. A fixed phrase like the
self-service page's `DELETE ASOL ACCOUNT` is identical for every row and would
catch nothing; retyping the identifier forces a look at which account is about
to go.

This is a mis-tap guard only. Authority is the super-admin signed session that
`runSuperAdminJsonRoute` verifies — the route accepts no confirmation field, and
a value the client types could never be one.

#### Sessions Outlive Deletion

Session tokens are stateless 30-day HMAC envelopes and there is no server
session table (see [session-system.md](../05-platform-features/session-system.md)).
Nothing revokes them, so a deleted user's device keeps a token that still
verifies until it expires.

Self-service deletion hides this: the same client that succeeds immediately
clears its own session, cart, favorites, IndexedDB, and cookies. Super-admin
deletion has no such moment — the target's device is never told. Their data is
gone from every database, but the token still passes `assertSignedInRequest`.

Push stops at once, because `delete_main` removes the account's rows from
`user_notification_tokens`.

Closing this needs a server-side check that the uid still exists, which today
no request performs.

### Permanently Deleted Data

- User record, password (scrypt), password recovery challenges, and device notification tokens.
- Profile, social links, addresses, photos, specialties, seller discounts, pharmacy catalog overrides, working hours, and associated settings.
- Products, product images, reviews, interactions, and followings owned by the user.
- Custom order images uploaded by the user from storage, with personal references scrubbed from the order record.
- Upon successful server response, the client clears local device data including session, cart, favorites, IndexedDB databases, and cookies.

### Retained Shared Records

Orders, payments, returns, disputes, and audit logs involve multiple parties and are therefore retained. The user ID is replaced with a static anonymous identifier derived from the UID hash, and personal addresses, notes, and payment details are stripped. This preserves accounting integrity and legal compliance without retaining deleted account identities.

### Operational Note

The deletion process spans user, profile, product, and order databases as well as image storage. Core data deletion executes in a fixed step order defined by `ACCOUNT_DELETION_STEP_ORDER` in `@asol/auth-core`. Image removal runs after database cleanup with up to three retry attempts per file; failures are returned in the API response under `imagesFailed` and logged server-side.

### Deletion Registry and Contract Test

- Authoritative table and image-source manifest: `packages/auth-core/src/domain/account-deletion-registry.ts`.
- `npm run test:account-deletion-registry` scans SQL migrations for user-owned tables and fails if any table is not covered by the registry, an exempt list, or a documented `ON DELETE CASCADE` child of `user_profiles`.
- When adding migrations that store per-user data, update the registry in the same change.

### API Response Fields

Successful deletion returns:

- `stepsCompleted` — ordered step ids executed on the server.
- `imagesAttempted`, `imagesDeleted` — storage cleanup counts.
- `imagesFailed` — per-key failures after retries (`profileId`, `key`, `attempts`, `error`).

### Implementation Reference

Auth and deletion orchestration live in `@asol/auth-core`. See [auth-core-module.md](../01-architecture/auth-core-module.md) for package boundaries, security model, and file map.
