# Super Admin User Impersonation

Super admins can open any user account with full owner privileges from
`/super-admin/users`. The UI lives in
`src/features/super-admin/presentation/SuperAdminUsersPage.tsx`; the route shell
is `src/app/super-admin/users/page.tsx`.

## Flow

1. The operator searches users and clicks **دخول كصاحب الحساب**.
2. The client stores the current super-admin session in IndexedDB under
   `auth/superAdminOriginalSession`.
3. `POST /api/super-admin/impersonate` returns a fresh signed `sessionToken` for
   the target user (same shape as a password login).
4. The client writes the target session to `auth/current` and hard-navigates to
   `/profile?mode=edit`.
5. `SuperAdminImpersonationBanner` stays visible until the operator ends
   impersonation, which restores `superAdminOriginalSession` back to
   `auth/current`.

Every impersonation start is logged through `persistentSystemLogService`.

## Session and API identity

While impersonating, `useSession()` exposes the **target** uid, phone,
specialties, and `sessionToken`. Protected routes and notification grants therefore
evaluate the impersonated owner, not the super-admin operator.

`isSuperAdmin(session)` is false during impersonation, so owner-only UI behaves
like a normal signed-in account.

## Notifications and device tokens

Impersonation uses `window.location.assign`, which resets in-memory push
controllers. To match an ordinary login:

| Step | Behaviour |
|------|-----------|
| Start impersonation | Unregister the super-admin device push token for this physical device, clear local image-upload drafts, persist a pending login-completed marker, save the target session, reload. |
| After reload | `AuthLoginBootstrapController` consumes the marker and dispatches `AUTH_LOGIN_COMPLETED_EVENT`, which drives the same post-login push registration path as `useLogin`. |
| End impersonation | Unregister the impersonated user's device token, clear local image-upload drafts, restore the super-admin session, persist another pending marker, reload. |

`SessionProvider` still updates `setNotificationGrantDeliveryIdentity` from the
active session, so native grant delivery (`POST /api/notifications/recipient-tokens`)
uses the impersonated uid/phone.

## Related

- [session-system.md](../05-platform-features/session-system.md)
- [notification-system.md](../05-platform-features/notification-system.md)
- [notification-bridge-module.md](../05-platform-features/notification-bridge-module.md)
