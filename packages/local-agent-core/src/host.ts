/**
 * The door for what lives on the machine rather than in the repository: the
 * runner installs and systemd units a rebuild has to replay, the third-party
 * CLIs the pool must not reach for by accident, and the companion repositories
 * that join the machines to each other.
 *
 * Separate from the control plane because this is the surface that writes to the
 * host, and it should be obvious in an import which callers do that.
 */

export * from "./host-inventory";
export * from "./host-tools";
export * from "./companion-repos";
