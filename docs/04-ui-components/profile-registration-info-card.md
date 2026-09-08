# Profile Registration Info Card

## Purpose

`ProfileRegistrationInfoCard` owns the contact and registration controls shown in the profile edit registration section.
The card starts directly with its editable controls; it does not render the former primary-contact heading or hint text.

## Service Provider Account UI

Before the change-password control, the card renders a collapsed-by-default activity activation container. Its Arabic header and switch label are `تفعيل النشاط`; it still edits the same `providerAccountEnabled` field and service-provider account state.

- The header uses the shared ghost-button treatment, a business/service icon, and a chevron that reflects the local expanded state.
- The change-password disclosure uses the same outer border container, rounded corners, surface treatment, button geometry, spacing, icon treatment, text alignment, chevron sizing, disclosure accessibility attributes, and expanded-body top divider as the service-provider disclosure.
- The expanded body uses the project-wide `@/shared/ui/switch` control and explains the visual choice to move from a personal account to a service provider account.
- The switch edits `providerAccountEnabled` in the authenticated registration form and participates in the normal profile page-save flow.
- The value belongs to the current authenticated user (`users.uid`) and is stored in `users.provider_account_enabled`. Every runtime reads and writes the Turso users database through the normal data-source boundary; Development is not a different store.
- Login and profile-update responses hydrate the same value into the current AsolDB session record. Legacy AsolDB sessions that predate the field normalize to `false`.
- While the value is `false`, the profile editor shows only the Registration section. The tabs bar and provider-only edit sections are hidden; those section controllers remain mounted so staged page-save snapshots are not lost.
- Turning the switch on restores provider editing surfaces immediately. Turning it off immediately returns navigation to Registration. Persistence still occurs through the normal Save action.
- The Registration card's store-name field, label, and hint are shown only while `providerAccountEnabled` is `false`. Enabling the provider account hides that UI without clearing or mutating the staged `storeName`; disabling the provider account reveals the same value again.
- The Registration card labels that field as `الاسم المستعار` in Arabic (`Alias` in English) and shows the profile-specific hint `يظهر كاسم هويه لك`; both use dedicated profile translation keys so other store-name labels and hints remain unchanged.
- The control must remain touch-safe and RTL-aware through the shared Button and Switch primitives.

## Ownership Boundary

Account mode is authenticated user state, not store metadata. The auth/users domain owns SQLite/Turso persistence and session hydration. The profile presentation layer only edits the typed registration field and derives visibility from the controlled draft value.
