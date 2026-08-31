/** Test-only environment mutation helper. Environment ownership remains in Configuration. */
export async function withTemporaryEnvironment<T>(values: Readonly<Record<string, string | undefined>>, run: () => Promise<T>): Promise<T> {
  const original = new Map<string, string | undefined>();
  for (const key of Object.keys(values)) original.set(key, process.env[key]);
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return await run();
  } finally {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}
