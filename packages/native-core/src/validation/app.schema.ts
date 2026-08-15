import { z } from "zod";

export const appUrlOpenSchema = z.object({
  url: z.string().min(1),
  iosSourceApplication: z.string().optional(),
  iosOpenInPlace: z.boolean().optional(),
});
