import { z } from "zod";

export const shareOptionsSchema = z
  .object({
    title: z.string().optional(),
    text: z.string().optional(),
    url: z.string().optional(),
    dialogTitle: z.string().optional(),
    files: z.array(z.string()).optional(),
  })
  .refine(
    (data) =>
      Boolean(
        data.title ||
          data.text ||
          data.url ||
          (data.files && data.files.length > 0),
      ),
    {
      message:
        "At least one share property (title, text, url, files) must be provided.",
    },
  );
