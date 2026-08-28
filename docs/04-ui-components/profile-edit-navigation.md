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

## Carousel Height Contract

The carousel clips its content vertically, so its height is a derived value and must always match what is on screen.

- When no swipe is in progress, the carousel height equals the measured height of the active panel exactly. A larger height leaves dead space under a short section; a smaller height crops a tall section. Both are defects.
- Monotonic growth (never shrinking back to a shorter panel) is forbidden.
- While a swipe is in progress two panels are partially visible. During that window the height is the maximum height of the panels overlapping the carousel viewport, so the incoming panel is never cropped mid-gesture.
- Height changes animate only after the swipe settles. During a swipe the height applies with zero transition duration, because animating growth would crop the incoming panel for the length of the transition.
- Every panel is observed with a `ResizeObserver`, and viewport `resize`/`orientationchange` re-measure, so late-loading section content resizes the carousel instead of being clipped.

## Snapshot Restoration

The selected section is persisted through:

```ts
useSnapshotState("profile.edit.activeTab", initialTab)
```

The controlled profile carousel and tab-strip scroll positions are excluded from generic element-scroll restoration. Their positions are derived from the restored `activeTab`.

The page-snapshot key embeds the full query string, so leaving and re-entering the editor through a different URL shape (`?mode=edit` versus `?mode=edit&returnTo=...`) resolves to a different snapshot and loses the selected section. A user-keyed record in `ASOL_DB_STORES.APP_SETTINGS`, owned by:

```text
src/features/profile/application/services/profile-edit-tab-storage.ts
```

therefore persists the active tab independently of the URL. Restoration precedence is:

1. An explicit `?tab=` query parameter.
2. The stored per-user tab.
3. `registration`.

The stored tab is read once per editor entry and is never applied after the user has already moved, so it cannot fight a live gesture. The selected-tab wave animation follows `activeTab`, so it renders on the restored section from the first paint after restoration.

`resyncScrollToActiveTab` must remain stable when `activeTab` changes. This allows the profile page's delayed window/element scroll restoration cycle to continue after the snapshot restores the selected profile section instead of being cancelled by a callback identity change.

## Regression Coverage

`src/features/profile/tests/profile-edit-navigation.test.ts` guards the direct-selection implementation, the absence of the former long suppression window, stable active-tab ref synchronization, and the page-snapshot integration contract.
