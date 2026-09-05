/**
 * Browser-safe contracts for the data-health capability.
 *
 * The application owns presentation and orchestration; data-core owns database access. This
 * package owns the vocabulary and source registry both sides must agree on, so neither package
 * reaches into the other's internal tree.
 */
export * from "./domain/types";
export * from "./domain/execution-context";
