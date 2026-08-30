/**
 * The live monitor's door: the model of what the pool is doing, the pure
 * renderer that turns it into a frame, and the probes for other machines.
 *
 * Separate from the control plane because the whole point of the monitor is that
 * it only reads. A caller that wants to watch the pool should not have to import
 * the functions that mutate it.
 */

export * from "./watch-model";
export * from "./watch-render";
export * from "./remote-hosts";
