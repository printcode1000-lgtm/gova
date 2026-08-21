export function searchParamsToRecord(
  params: URLSearchParams,
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  params.forEach((value, key) => {
    const existing = result[key];
    if (Array.isArray(existing)) existing.push(value);
    else if (existing !== undefined) result[key] = [existing, value];
    else result[key] = value;
  });
  return result;
}

let navigationEventsInstalled = false;

export function installNavigationEvents(): void {
  if (typeof window === "undefined" || navigationEventsInstalled) return;
  navigationEventsInstalled = true;
  const patch = (name: "pushState" | "replaceState") => {
    const original = window.history[name];
    window.history[name] = function patchedHistoryMethod(...args) {
      window.dispatchEvent(new Event("asol:before-navigation"));
      return original.apply(this, args);
    };
  };
  patch("pushState");
  patch("replaceState");
}
