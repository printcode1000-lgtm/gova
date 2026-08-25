function secureRandomIndex(length: number): number {
  if (length < 1) throw new Error("simulationImagePoolEmpty");
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const value = new Uint32Array(1);
    cryptoApi.getRandomValues(value);
    return value[0]! % length;
  }
  return Math.floor(Math.random() * length);
}

export function pickRandomSimulationImage(
  internalCatalogImages: readonly string[],
): string {
  const allowed = Array.from(
    new Set(
      internalCatalogImages
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
  return allowed[secureRandomIndex(allowed.length)]!;
}

export function pickRandomSimulationImages(
  internalCatalogImages: readonly string[],
  count: number,
): string[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("invalidSimulationImageCount");
  }
  const pool = [...new Set(internalCatalogImages.map((value) => value.trim()).filter(Boolean))];
  if (pool.length === 0) throw new Error("simulationImagePoolEmpty");
  const picked: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const choice = secureRandomIndex(pool.length);
    picked.push(pool[choice]!);
    if (pool.length > 1) pool.splice(choice, 1);
  }
  return picked;
}
