import { z } from "zod";

export const locationOptionsSchema = z
  .object({
    enableHighAccuracy: z.boolean().optional(),
    timeout: z.number().min(0).optional(),
    maximumAge: z.number().min(0).optional(),
  })
  .optional();
