import { readFileSync } from "node:fs";
import path from "node:path";

/** The environment keys that name one Turso organization and its platform token. */
export type TursoOrganizationKeys = {
  readonly organizationEnv: string;
  readonly tokenEnv: string;
};

export const ENV_CONTRACT_FILE = ".env.example";
const ORGANIZATION_KEY = /^TURSO_(?:[A-Z0-9_]+_)?ORGANIZATION$/;

/**
 * Every Turso organization the repository is configured for, read from the
 * environment contract (`.env.example`): each `TURSO_[<SCOPE>_]ORGANIZATION` key
 * paired with its `TURSO_[<SCOPE>_]API_TOKEN`. The page, the live read and the
 * snapshot script share this list, so adding an organization to the contract is
 * the only step. A key without its token pair fails here.
 */
export function listTursoOrganizationKeys(root = process.cwd()): readonly TursoOrganizationKeys[] {
  const keys = readFileSync(path.join(root, ENV_CONTRACT_FILE), "utf8")
    .split("\n")
    .map((line) => line.split("=")[0]!.trim())
    .filter(Boolean);
  return keys.flatMap((key) => {
    if (!ORGANIZATION_KEY.test(key)) return [];
    const tokenEnv = key.replace(/ORGANIZATION$/, "API_TOKEN");
    if (!keys.includes(tokenEnv)) {
      throw new Error(`[cloud-accounts] ${ENV_CONTRACT_FILE} declares ${key} without ${tokenEnv}.`);
    }
    return [{ organizationEnv: key, tokenEnv }];
  });
}
