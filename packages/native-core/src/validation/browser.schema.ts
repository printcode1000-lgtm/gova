import { z } from "zod";

export const openBrowserOptionsSchema = z.object({
  url: z.string().url().refine((val) => /^https?:\/\//i.test(val), {
    message: "Browser URL must use HTTP or HTTPS protocol.",
  }),
  windowName: z.string().optional(),
  toolbarColor: z.string().optional(),
  presentationStyle: z.enum(["fullscreen", "popover"]).optional(),
});
