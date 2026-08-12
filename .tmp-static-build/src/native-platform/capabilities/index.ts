/** Single responsibility: expose native-shell capability negotiation. */

export { capabilities, CapabilityRegistry } from "./capability-registry";
export {
  ALL_CAPABILITY_KEYS,
  CapabilityKeys,
  type CapabilityKey,
} from "./capability-keys";
export {
  MINIMUM_SUPPORTED_NATIVE_VERSION,
  NATIVE_CAPABILITY_VERSION,
  PLATFORM_OPTIONAL_SHELL_CAPABILITIES,
  SHELL_CAPABILITIES_BY_PLATFORM,
  UNIVERSAL_SHELL_CAPABILITIES,
  shellCapabilitiesFor,
} from "./shell-capabilities";
