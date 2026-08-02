/** Single responsibility: expose native-shell capability negotiation. */

export { capabilities, CapabilityRegistry } from "./capability-registry";
export {
  ALL_CAPABILITY_KEYS,
  CapabilityKeys,
  type CapabilityKey,
} from "./capability-keys";
export {
  NATIVE_CAPABILITY_VERSION,
  SHELL_CAPABILITIES,
} from "./shell-capabilities";
