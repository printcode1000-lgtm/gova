import { execFileSync } from "node:child_process";

import {
  classifyDocumentationPath,
  DOCS_CONTRACT_CHANGE_MARKER,
} from "./docs/document-mutability";

/**
 * The `[docs-contract-change]` trailer a deployment commit needs, or nothing.
 *
 * A release that carries a protected-contract documentation change must say so
 * in its own commit, or the documentation gate denies the very commit the
 * release just staged and no such release can ever be published.
 *
 * The marker is derived from what is actually staged — never added
 * unconditionally. It is a repository-wide authorization switch, and switching
 * it on for every deployment would make it meaningless.
 *
 * `docs/09-agent-knowledge/document-mutability.md` defines the classes;
 * `docs/07-mobile-and-release/release-commands.md` records where this is used.
 */
export function stagedProtectedDocumentationPaths(root: string): string[] {
  const staged = execFileSync("git", ["diff", "--cached", "--name-only"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  return staged.filter(
    (repoPath) => classifyDocumentationPath(repoPath)?.classification === "protected",
  );
}

/** The extra `-m` argument for a deployment commit, or an empty list. */
export function protectedDocumentationCommitArgs(
  root: string,
  logPrefix: string,
): string[] {
  const paths = stagedProtectedDocumentationPaths(root);
  if (paths.length === 0) return [];
  console.log(
    `${logPrefix} ${paths.length} protected documentation path(s) staged: ${paths.join(", ")}`,
  );
  return [
    "-m",
    `${DOCS_CONTRACT_CHANGE_MARKER} Protected documentation contract updated by this release: ${paths.join(", ")}.`,
  ];
}
