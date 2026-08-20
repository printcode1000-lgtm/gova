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

let ports: ObservabilityPorts = { ...defaults };

export function configureObservabilityCore(next: Partial<ObservabilityPorts>): void {
  ports = { ...ports, ...next };
}

export function observabilityPorts(): ObservabilityPorts {
  return ports;
}

/** Convenience for the many call sites that only ask the one question. */
export function isObservabilityEnabled(): boolean {
  return ports.isDevelopment();
}
