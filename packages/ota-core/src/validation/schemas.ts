import { z } from "zod";

export const nativeVersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, "Expected semantic version x.y.z");

export const contentVersionSchema = z
  .string()
  .regex(/^(\d+\.\d+\.\d+)\.(\d+)$/, "Expected content version x.y.z.w");

export const releaseGateDecisionSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("open"),
    nativeVersion: z.string(),
    baseline: z.string(),
  }),
  z.object({
    state: z.literal("blocked"),
    nativeVersion: z.string(),
    baseline: z.string(),
    changedPaths: z.array(z.string()),
    changedNativeDependencies: z.array(z.string()),
    reason: z.string(),
  }),
  z.object({
    state: z.literal("unprovable"),
    reason: z.string(),
  }),
]);
