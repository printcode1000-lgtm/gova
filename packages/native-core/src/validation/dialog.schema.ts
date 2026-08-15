import { z } from "zod";

export const alertOptionsSchema = z.object({
  title: z.string().optional(),
  message: z.string(),
  buttonTitle: z.string().optional(),
});

export const confirmOptionsSchema = z.object({
  title: z.string().optional(),
  message: z.string(),
  okButtonTitle: z.string().optional(),
  cancelButtonTitle: z.string().optional(),
});

export const promptOptionsSchema = z.object({
  title: z.string().optional(),
  message: z.string(),
  okButtonTitle: z.string().optional(),
  cancelButtonTitle: z.string().optional(),
  inputPlaceholder: z.string().optional(),
  inputText: z.string().optional(),
});
