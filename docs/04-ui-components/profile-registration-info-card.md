# Profile Registration Info Card

## Purpose

`ProfileRegistrationInfoCard` owns the contact and registration controls shown in the profile edit registration section.

## Service Provider Account UI

Below the change-password control, the card renders a collapsed-by-default **Service provider account** container.

- The header uses the shared ghost-button treatment, a business/service icon, and a chevron that reflects the local expanded state.
- The expanded body uses the project-wide `@/shared/ui/switch` control and explains the visual choice to move from a personal account to a service provider account.
- The switch is intentionally UI-only. Its checked state is local React state and is not included in profile dirtiness, page-save items, persistence, account roles, permissions, or any API request.
- Closing and reopening the container during the same mount preserves the local switch state; leaving the mounted card discards it.
- The control must remain touch-safe and RTL-aware through the shared Button and Switch primitives.

## Ownership Boundary

This UI does not define or perform an account-type migration. A future feature that actually converts an account must introduce its own domain/application contract and page-save integration rather than attaching persistence directly to this presentation component.
