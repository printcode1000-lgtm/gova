import { existsSync } from "node:fs";
import path from "node:path";

import { gitSoft } from "./git";

export interface CompanionRepository {
  name: string;
  path: string;
  origin: string;
  entryPoint: string;
}

export const COMPANION_REPOSITORIES: CompanionRepository[] = [
  {
    name: "p2p-link",
    path: "/home/hesham/p2p-link",
    origin: "https://github.com/printcode1000-lgtm/p2p-link.git",
    entryPoint: "scripts/p2p-link-gui.sh",
  },
];

export interface CompanionRepositoryState extends CompanionRepository {
  exists: boolean;
  originMatches: boolean;
  currentOrigin: string | null;
  head: string | null;
  entryPointExists: boolean;
}

export function companionRepositoryStates(): CompanionRepositoryState[] {
  return COMPANION_REPOSITORIES.map((repo) => {
    const exists = existsSync(path.join(repo.path, ".git"));
    const currentOrigin = exists ? gitSoft(["remote", "get-url", "origin"], repo.path) || null : null;
    return {
      ...repo,
      exists,
      originMatches: currentOrigin === repo.origin,
      currentOrigin,
      head: exists ? gitSoft(["rev-parse", "--short", "HEAD"], repo.path) || null : null,
      entryPointExists: existsSync(path.join(repo.path, repo.entryPoint)),
    };
  });
}
