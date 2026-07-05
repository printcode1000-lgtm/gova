import { z } from "zod";

export const trendingRibbonItemSchema = z.object({
  label: z.string().trim().min(1).max(100),
  action: z.string().trim().min(1).max(200),
});

export const trendingRibbonConfigSchema = z.object({
  label: z.string().trim().min(1).max(80),
  items: z.array(trendingRibbonItemSchema).min(0).max(50),
});
