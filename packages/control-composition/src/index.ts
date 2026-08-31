/** Control-only composition seam. Business workload ports must not register here. */
export async function registerControlServerPorts(): Promise<void> {
  // Moved control route implementations register their exact ports here.
}
