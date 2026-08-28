# Profile Edit Navigation

## Purpose

This document defines the interaction contract for the profile edit workspace navigation.

## Ownership

The navigation state and horizontal synchronization are owned by:

```text
src/features/profile/presentation/use-profile-navigation.ts
```

The visual tab bar and section carousel consume that state from the profile page model. Page-state persistence remains owned by the Page Snapshot System.

## Invariants

- `PROFILE_SECTIONS` is the canonical ordered list of profile edit sections.
- Selecting any tab must activate that exact section directly. A non-adjacent selection must never stop at an intermediate section.
- Programmatic section selection may bypass CSS smooth scrolling and scroll snapping while positioning the target. This is required because `snap-always` must not turn an absolute selection into step-by-step navigation.
- Programmatic navigation scrolls only the profile carousel and profile tab strip. It must never scroll the document.
- `activeTab` is the single React source of truth for the selected-tab animation, carousel controls, accessibility state, and restored section.
- A ref mirrors the current `activeTab` for scroll callbacks and restoration callbacks so those callbacks remain stable while snapshot state is being restored.
- Synthetic scroll events from a programmatic selection may be ignored only for the short drain window needed by that immediate scroll. Long fixed suppression windows are forbidden because they can hide a real user swipe and leave the selected-tab animation on the wrong section.
- User-driven carousel scrolling updates `activeTab` to the panel closest to the carousel center and then aligns the tab strip to that same section.

## Snapshot Restoration

The selected section is persisted through:

```ts
useSnapshotState("profile.edit.activeTab", initialTab)
```

The controlled profile carousel and tab-strip scroll positions are excluded from generic element-scroll restoration. Their positions are derived from the restored `activeTab`.

`resyncScrollToActiveTab` must remain stable when `activeTab` changes. This allows the profile page's delayed window/element scroll restoration cycle to continue after the snapshot restores the selected profile section instead of being cancelled by a callback identity change.

## Regression Coverage

`src/features/profile/tests/profile-edit-navigation.test.ts` guards the direct-selection implementation, the absence of the former long suppression window, stable active-tab ref synchronization, and the page-snapshot integration contract.
