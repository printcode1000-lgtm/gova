/** Matches a pathname against a route template without reading segment values. */
export function routeMatches(template: string, pathname: string): boolean {
  const templateParts = template.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (templateParts.length !== pathParts.length) return false;
  return templateParts.every(
    (part, index) =>
      (part.startsWith("[") && part.endsWith("]")) || part === pathParts[index],
  );
}
