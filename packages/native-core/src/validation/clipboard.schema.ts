import { z } from "zod";

export const clipboardWriteOptionsSchema = z
  .object({
    string: z.string().optional(),
    image: z.string().optional(),
    url: z.string().optional(),
    label: z.string().optional(),
  })
  .refine((data) => Boolean(data.string || data.image || data.url), {
    message: "At least one clipboard property (string, image, url) must be provided.",
  });
