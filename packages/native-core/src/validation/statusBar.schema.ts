import { z } from "zod";

export const setStatusBarStyleOptionsSchema = z.object({
  style: z.enum(["dark", "light", "default"]),
});

export const setStatusBarBackgroundColorOptionsSchema = z.object({
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/, "Invalid hex color"),
});

export const setStatusBarAnimationOptionsSchema = z.object({
  animation: z.enum(["none", "slide", "fade"]),
}).optional();
