import "server-only";

/**
 * How a verification dispatch grant leaves this deployment.
 *
 * Injected rather than imported, because *where* the notifications deployment
 * lives is configuration knowledge, and this feature's module graph is mirrored
 * into isolated service accounts. A direct import of the origin resolver pulled
 * the inter-account route table into those mirrors, which is exactly the coupling
 * the account boundary exists to prevent.
 *
 * Defaults fail closed: an unconfigured deployment reports an undeliverable
 * dispatch instead of silently doing nothing, and an Egyptian challenge never
 * falls back to email because delivery was not wired.
 */
export interface VerificationDispatchTransport {
  /** Delivers one signed notification grant. Resolves false when it could not. */
  deliverGrant(grant: string): Promise<boolean>;
}

const UNCONFIGURED: VerificationDispatchTransport = {
  deliverGrant: async () => false,
};

const TRANSPORT_KEY = Symbol.for("@/features/notifications/verification-dispatch-transport");

interface TransportCarrier {
  [TRANSPORT_KEY]?: VerificationDispatchTransport;
}

/**
 * Kept on `globalThis`, not in module scope: a bundler may give one source file
 * more than one instance, and a port configured on one copy while every route
 * reads another is an outage with no stack trace.
 */
function carrier(): TransportCarrier {
  return globalThis as TransportCarrier;
}

export function registerVerificationDispatchTransport(
  next: VerificationDispatchTransport,
): void {
  carrier()[TRANSPORT_KEY] = next;
}

export function resetVerificationDispatchTransport(): void {
  carrier()[TRANSPORT_KEY] = UNCONFIGURED;
}

/** Resolved per call, never at module load, so import order stays out of the contract. */
export function verificationDispatchTransport(): VerificationDispatchTransport {
  return carrier()[TRANSPORT_KEY] ?? UNCONFIGURED;
}
