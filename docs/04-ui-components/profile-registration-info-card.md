# Profile Registration Info Card

## Purpose

`ProfileRegistrationInfoCard` owns the contact and registration controls shown in the profile edit registration section.

## Service Provider Account UI

Below the change-password control, the card renders a collapsed-by-default **Service provider account** container.

- The header uses the shared ghost-button treatment, a business/service icon, and a chevron that reflects the local expanded state.
- The expanded body uses the project-wide `@/shared/ui/switch` control and explains the visual choice to move from a personal account to a service provider account.
- The switch edits `providerAccountEnabled` in the authenticated registration form and participates in the normal profile page-save flow.
- The value belongs to the current authenticated user (`users.uid`) and is stored in `users.provider_account_enabled`. Development uses the users SQLite database; production uses the matching Turso users database through the normal data-source boundary.
- Login and profile-update responses hydrate the same value into the current AsolDB session record. Legacy AsolDB sessions that predate the field normalize to `false`.
- While the value is `false`, the profile editor shows only the Registration section. The tabs bar and provider-only edit sections are hidden; those section controllers remain mounted so staged page-save snapshots are not lost.
- Turning the switch on restores provider editing surfaces immediately. Turning it off immediately returns navigation to Registration. Persistence still occurs through the normal Save action.
- The control must remain touch-safe and RTL-aware through the shared Button and Switch primitives.

## Ownership Boundary

Account mode is authenticated user state, not store metadata. The auth/users domain owns SQLite/Turso persistence and session hydration. The profile presentation layer only edits the typed registration field and derives visibility from the controlled draft value.
