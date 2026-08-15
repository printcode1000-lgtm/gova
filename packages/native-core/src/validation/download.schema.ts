import { z } from "zod";

export const startDownloadOptionsSchema = z.object({
  id: z.string().optional(),
  url: z.string().url().refine((val) => /^https?:\/\//i.test(val), {
    message: "Download URL must use HTTP or HTTPS protocol.",
  }),
  destinationPath: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});
