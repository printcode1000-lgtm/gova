import { z } from "zod";

export const showToastOptionsSchema = z.object({
  text: z.string().min(1),
  duration: z.enum(["short", "long"]).optional(),
  position: z.enum(["top", "center", "bottom"]).optional(),
});
