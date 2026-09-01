import { registerControlServerPorts } from '@asol/control-composition';

/**
 * The control runtime's composition root.
 *
 * Next calls `register` once per server instance, before the first request
 * reaches a route, which is the only place a deployment-wide port can be
 * registered without every route remembering to do it. The six workloads solve
 * the same problem by importing their composition from each route; control has
 * one composition and many routes, so it registers once here instead.
 */
export async function register(): Promise<void> {
  await registerControlServerPorts();
}
