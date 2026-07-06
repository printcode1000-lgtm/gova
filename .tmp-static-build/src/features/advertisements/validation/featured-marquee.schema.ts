import { z } from "zod";

const SAFE_ID = /^[a-z0-9-]+$/i;

export const featuredMarqueeConfigSchema = z.object({
  productIds: z
    .array(z.string().trim().regex(SAFE_ID))
    .min(0)
    .max(30),
});

export const featuredMarqueeSeedSchema = z.object({
  schemaVersion: z.literal(1),
  config: featuredMarqueeConfigSchema,
});
