import { existsSync, readFileSync } from 'node:fs';

import type { EnvSource } from './read-env';

/**
 * Reads `.env.local` then `.env` into a plain object, first spelling wins.
 *
 * For the provisioning tooling, which runs outside Next.js and therefore has no loaded
 * environment of its own. Two copies of this parser lived in `data-core/tooling`, and a third
 * would have appeared with the next script.
 *
 * Values are returned raw — no trimming and no quote stripping — because that is what the
 * existing scripts were written against, and a Turso token with meaningful trailing characters
 * must not be silently altered on the way to a database.
 */
export const DEFAULT_ENV_FILES = ['.env.local', '.env'] as const;

export function readEnvFiles(files: readonly string[] = DEFAULT_ENV_FILES): EnvSource {
  const values: Record<string, string> = {};
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
      if (match && values[match[1]!] === undefined) values[match[1]!] = match[2]!;
    }
  }
  return values;
}
