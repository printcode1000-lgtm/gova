import { routeMatches } from "../domain/route-matching";
import type { UiPageDefinition } from "../domain/ui-page-definition";
import { UI_PAGE_REGISTRY } from "./ui-page-registry";

const UI_NOT_FOUND_PAGE: UiPageDefinition = { route: "/not-found", id: "not-found", uid: "not-found-eF97Ft" };

function routeSpecificity(route: string): number {
  return route
    .split("/")
    .filter(Boolean)
    .reduce(
      (score, segment) => score + (segment.startsWith("[") && segment.endsWith("]") ? 0 : 1),
      0,
    );
}

/** Resolves a pathname without placing dynamic values into the DOM. */
export function resolveUiPage(pathname: string | null): UiPageDefinition {
  const normalizedPathname = pathname?.replace(/\/+$/, "") || "/";
  const matches = UI_PAGE_REGISTRY.filter((page) => routeMatches(page.route, normalizedPathname));
  const firstMatch = matches[0];
  if (!firstMatch) return UI_NOT_FOUND_PAGE;
  return matches.reduce<UiPageDefinition>(
    (best, page) => (routeSpecificity(page.route) > routeSpecificity(best.route) ? page : best),
    firstMatch,
  );
}
