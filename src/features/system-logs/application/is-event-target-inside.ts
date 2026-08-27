export function isEventTargetInside(
  container: Node | null,
  target: EventTarget | null,
): boolean {
  return Boolean(
    container &&
      typeof Node !== "undefined" &&
      target instanceof Node &&
      container.contains(target),
  );
}
