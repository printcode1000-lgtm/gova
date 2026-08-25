import { readdirSync } from "node:fs";
import path from "node:path";

import type { DiscoveredUserPage } from "./discovery.types";

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (entry.isFile() && entry.name === "page.tsx") files.push(absolute);
  }
  return files;
}

function routeFromPageFile(root: string, sourceFile: string): string {
  const relative = path
    .relative(path.join(root, "src", "app"), sourceFile)
    .replace(/\\/g, "/")
    .replace(/(^|\/)page\.tsx$/, "");
  const segments = relative
    .split("/")
    .filter((segment) => segment && !/^\(.+\)$/.test(segment));
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

export function discoverUserPages(root = process.cwd()): DiscoveredUserPage[] {
  const appRoot = path.join(root, "src", "app");
  return walk(appRoot)
    .map((sourceFile) => ({
      route: routeFromPageFile(root, sourceFile),
      sourceFile: path.relative(root, sourceFile).replace(/\\/g, "/"),
    }))
    .filter(
      (page) =>
        !page.route.startsWith("/dev") &&
        !page.route.startsWith("/super-admin"),
    )
    .sort((left, right) => left.route.localeCompare(right.route));
}
