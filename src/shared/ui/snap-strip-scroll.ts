/**
 * Centers a child inside its horizontally scrolling, snap-enabled parent.
 *
 * Programmatic selection must be absolute: it may not be constrained by
 * `snap-always`, and it may not walk through intermediate items because of CSS
 * `scroll-smooth`. Both are therefore suspended for the duration of the scroll
 * and restored immediately afterwards.
 */
export function centerElementInScrollParent(element: HTMLElement | null): void {
  if (!element?.parentElement) return;
  const parent = element.parentElement;
  const parentRect = parent.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const horizontalOffset =
    elementRect.left +
    elementRect.width / 2 -
    (parentRect.left + parentRect.width / 2);

  if (Math.abs(horizontalOffset) < 0.5) return;

  const previousSnapType = parent.style.scrollSnapType;
  const previousScrollBehavior = parent.style.scrollBehavior;
  parent.style.scrollSnapType = "none";
  parent.style.scrollBehavior = "auto";
  parent.scrollBy({
    left: horizontalOffset,
    behavior: "auto",
  });
  parent.style.scrollBehavior = previousScrollBehavior;
  parent.style.scrollSnapType = previousSnapType;
}
