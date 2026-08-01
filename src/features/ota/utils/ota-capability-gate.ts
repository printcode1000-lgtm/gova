/** Single responsibility: decide whether an OTA manifest fits the installed shell. */
export interface CapabilityLookup {
  missing(keys: readonly string[]): Promise<string[]>;
}
export interface OtaCapabilityDecision {
  compatible: boolean;
  missingCapabilities: string[];
}
export async function evaluateOtaCapabilities(
  requiredCapabilities: readonly string[] | undefined,
  registry: CapabilityLookup,
): Promise<OtaCapabilityDecision> {
  const missingCapabilities = await registry.missing(
    requiredCapabilities ?? [],
  );
  return { compatible: missingCapabilities.length === 0, missingCapabilities };
}
