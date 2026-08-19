/** Shard SQLite filenames follow `<shard-name>.db`. */

export function sqliteFileNameForShard(databaseName: string): string {
  if (!databaseName.trim()) {
    throw new Error("devCoreShardNameRequired");
  }
  return `${databaseName}.db`;
}
