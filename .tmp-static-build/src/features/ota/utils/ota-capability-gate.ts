/** Single responsibility: decide whether an OTA manifest fits the installed shell. */
export interface CapabilityLookup {
  missing(keys: readonly string[]): Promise<string[]>;
}

export interface OtaCapabilityDecision {
  /** False only when a capability the bundle needs everywhere is absent. */
  compatible: boolean;
  /** Absent capabilities the bundle cannot run without. */
  missingCapabilities: string[];
  /**
   * Absent capabilities the bundle declared as platform-optional. These do not
   * block the release; the features behind them stay hidden at runtime.
   */
  missingOptionalCapabilities: string[];
}

/**
 * Required capabilities block a release; optional ones never do.
 *
 * A single list forced every capability to be all-or-nothing, so one feature
 * that exists on only one platform would stop the update channel for the other
 * — permanently, if no store build could add the plugin there. Optional keys
 * are still reported so a device can be observed running without them.
 */
export async function evaluateOtaCapabilities(
  requiredCapabilities: readonly string[] | undefined,
  registry: CapabilityLookup,
  optionalCapabilities: readonly string[] | undefined = undefined,
): Promise<OtaCapabilityDecision> {
  const missingCapabilities = await registry.missing(
    requiredCapabilities ?? [],
  );
  const missingOptionalCapabilities = await registry.missing(
    optionalCapabilities ?? [],
  );
  return {
    compatible: missingCapabilities.length === 0,
    missingCapabilities,
    missingOptionalCapabilities,
  };
}
