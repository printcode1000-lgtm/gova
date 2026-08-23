/**
 * What the observability core needs from the application, and nothing more.
 *
 * `isDevelopment` is the only one. Every trace, every recorded operation and the dev-trace
 * response header are development-only: this package must never cost anything in production, and
 * it must not decide for itself what "production" means — the application already answers that
 * from its runtime context, which knows about static export and the native container too.
 *
 * The default is deliberately permissive-in-development and silent-in-production, so a forgotten
 * registration costs trace lines on a developer machine rather than leaking traces to users.
 */
export interface ObservabilityPorts {
  isDevelopment: () => boolean;
}

const defaults: ObservabilityPorts = {
  isDevelopment: () => process.env.NODE_ENV !== 'production',
};

/**
 * The registration lives on `globalThis`, not in this module's scope.
 *
 * A bundler may give one source file more than one instance: Next builds
 * `instrumentation` and each route into separate chunks, and Turbopack emitted
 * two copies of `data-core`'s runtime-config port — the composition root
 * configured one while every route read the other, and production answered 500
 * on every server route. Static checks and `tsx` tests cannot see it, because
 * Node resolves one path to one instance.
 *
 * A `Symbol.for` key on the global object is the same value from whichever
 * instance asks, which is what "configure once at startup" has to mean here.
 */
const PORTS_KEY = Symbol.for('@asol/observability-core/ports');

interface PortsCarrier {
  [PORTS_KEY]?: ObservabilityPorts;
}

const portsDefaults = (): ObservabilityPorts => ({ ...defaults });

function portsState(): ObservabilityPorts {
  const carrier = globalThis as PortsCarrier;
  carrier[PORTS_KEY] ??= portsDefaults();
  return carrier[PORTS_KEY]!;
}

function setPortsState(next: ObservabilityPorts): void {
  (globalThis as PortsCarrier)[PORTS_KEY] = next;
}

export function configureObservabilityCore(next: Partial<ObservabilityPorts>): void {
  setPortsState({ ...portsState(), ...next });
}

export function observabilityPorts(): ObservabilityPorts {
  return portsState();
}

/** Convenience for the many call sites that only ask the one question. */
export function isObservabilityEnabled(): boolean {
  return portsState().isDevelopment();
}
